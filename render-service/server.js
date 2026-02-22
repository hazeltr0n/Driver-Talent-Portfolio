import express from 'express';
import { spawn } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// S3/R2 client for uploading final video
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/render', async (req, res) => {
  const { uuid, driverName, driverLocation, clips, musicUrl } = req.body;

  if (!uuid || !clips || clips.length === 0) {
    return res.status(400).json({ error: 'uuid and clips required' });
  }

  // Return immediately, process in background
  res.json({
    status: 'started',
    uuid,
    message: 'Render started in background'
  });

  // Do the render in background
  processRender({ uuid, driverName, driverLocation, clips, musicUrl }).catch(err => {
    console.error('Render failed:', err);
  });
});

// Get video duration using ffprobe (download, re-mux to fix metadata, then probe)
async function getVideoDuration(url, localPath) {
  // Download the video
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const rawPath = localPath.replace('.webm', '-raw.webm');
  fs.writeFileSync(rawPath, Buffer.from(buffer));

  // Re-mux with ffmpeg to fix duration metadata (webm from MediaRecorder lacks header duration)
  await new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-y', '-i', rawPath, '-c', 'copy', localPath]);
    ffmpeg.on('close', resolve);
  });

  // Clean up raw file
  fs.unlinkSync(rawPath);

  // Now ffprobe can read the duration
  return new Promise((resolve) => {
    const child = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      localPath
    ]);

    let output = '';
    child.stdout.on('data', (data) => { output += data.toString(); });
    child.on('close', (code) => {
      const duration = parseFloat(output.trim());
      resolve(code === 0 && !isNaN(duration) ? duration : null);
    });
  });
}

async function processRender({ uuid, driverName, driverLocation, clips, musicUrl }) {
  const startTime = Date.now();
  console.log(`Starting render for ${uuid}...`);

  const outputPath = `/tmp/${uuid}-final.mp4`;
  const propsPath = `/tmp/${uuid}-props.json`;

  // Download clips and get durations using ffprobe
  console.log('Downloading clips and getting durations...');
  const clipsWithDuration = [];
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const localPath = `/tmp/${uuid}-q${i + 1}.webm`;
    const duration = await getVideoDuration(c.url, localPath);
    const frames = duration ? Math.ceil(duration * 30) : null;
    console.log(`[Clip ${i + 1}] ${duration?.toFixed(1)}s (${frames} frames)`);
    clipsWithDuration.push({ url: c.url, durationInFrames: frames, localPath });
  }

  // Write props to file (use local paths for faster rendering)
  const props = {
    driverName: driverName || 'Driver',
    driverLocation: driverLocation || 'United States',
    clips: clipsWithDuration.map(c => ({
      url: c.localPath,  // Use local file instead of URL
      durationInFrames: c.durationInFrames,
    })),
    musicUrl: musicUrl || null,
  };

  fs.writeFileSync(propsPath, JSON.stringify(props));

  try {
    // Run Remotion render with spawn to capture output
    console.log('Running Remotion render...');

    await new Promise((resolve, reject) => {
      const child = spawn('npx', [
        'remotion', 'render',
        './src/remotion/index.js',
        'DriverStoryVideo',
        outputPath,
        `--props=${propsPath}`,
        '--concurrency=20',
      ], {
        cwd: '/app',
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      let lastLoggedFrame = 0;

      child.stdout.on('data', (data) => {
        const line = data.toString();
        // Log progress every 1000 frames
        const match = line.match(/Rendered (\d+)\/(\d+)/);
        if (match) {
          const current = parseInt(match[1]);
          const total = parseInt(match[2]);
          if (current - lastLoggedFrame >= 1000 || current === total) {
            console.log(`Progress: ${current}/${total} (${Math.round(current/total*100)}%)`);
            lastLoggedFrame = current;
          }
        } else if (!line.includes('Rendered ')) {
          // Log non-progress lines
          process.stdout.write(line);
        }
      });

      child.stderr.on('data', (data) => {
        const line = data.toString();
        // Filter out noisy stderr but keep important messages
        if (!line.includes('Rendered ') && !line.includes('time remaining')) {
          process.stderr.write(line);
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Remotion exited with code ${code}`));
        }
      });

      child.on('error', reject);
    });

    console.log('Render complete, uploading to R2...');

    // Upload to R2
    const videoBuffer = fs.readFileSync(outputPath);
    const key = `videos/${uuid}/final.mp4`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: videoBuffer,
      ContentType: 'video/mp4',
    }));

    const videoUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log('Uploaded to:', videoUrl);

    // Update Airtable
    await updateAirtable(uuid, videoUrl);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`Render complete for ${uuid} in ${elapsed}s`);

    // Cleanup
    fs.unlinkSync(outputPath);
    fs.unlinkSync(propsPath);

  } catch (err) {
    console.error('Render error:', err.message);
    // Update Airtable with error status
    await updateAirtableError(uuid, err.message);
  }
}

async function updateAirtable(uuid, videoUrl) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const searchUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
  });
  const searchData = await searchRes.json();

  if (searchData.records?.[0]) {
    const recordId = searchData.records[0].id;
    await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_CANDIDATES_TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          video_url: videoUrl,
          video_status: 'complete',
        },
      }),
    });
  }
}

async function updateAirtableError(uuid, errorMessage) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const searchUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
  });
  const searchData = await searchRes.json();

  if (searchData.records?.[0]) {
    const recordId = searchData.records[0].id;
    await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_CANDIDATES_TABLE_ID}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          video_status: 'error',
        },
      }),
    });
  }
}

app.listen(PORT, () => {
  console.log(`Render service listening on port ${PORT}`);
});

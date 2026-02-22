import express from 'express';
import { execSync, spawn } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

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
  const { uuid, driverName, driverLocation, clips } = req.body;

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
  processRender({ uuid, driverName, driverLocation, clips }).catch(err => {
    console.error('Render failed:', err);
  });
});

async function processRender({ uuid, driverName, driverLocation, clips }) {
  const startTime = Date.now();
  console.log(`Starting render for ${uuid}...`);

  const outputPath = `/tmp/${uuid}-final.mp4`;
  const propsPath = `/tmp/${uuid}-props.json`;

  // Write props to file
  const props = {
    driverName: driverName || 'Driver',
    driverLocation: driverLocation || 'United States',
    clips: clips.map(c => ({
      url: c.url,
      trimStart: c.trimStart || 0,
      trimEnd: c.trimEnd || null,
      durationInFrames: c.durationInFrames || 30 * 30, // 30 seconds default
    })),
    musicUrl: null,
  };

  fs.writeFileSync(propsPath, JSON.stringify(props));

  try {
    // Run Remotion render
    console.log('Running Remotion render...');
    const remotionCmd = `npx remotion render ./src/remotion/index.js DriverStoryVideo ${outputPath} --props="${propsPath}"`;

    execSync(remotionCmd, {
      stdio: 'inherit',
      cwd: '/app',
      timeout: 15 * 60 * 1000, // 15 minute timeout
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

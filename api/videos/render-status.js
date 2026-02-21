// Check Remotion Lambda render progress
import { getRenderProgress } from '@remotion/lambda/client';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const REMOTION_REGION = process.env.REMOTION_AWS_REGION || 'us-east-1';
const REMOTION_FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME || 'remotion-render-4-0-427-mem2048mb-disk2048mb-900sec';

// R2 config for clip cleanup
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uuid = req.query.uuid || req.body?.uuid;
  const renderId = req.query.renderId || req.body?.renderId;

  if (!uuid && !renderId) {
    return res.status(400).json({ error: 'uuid or renderId required' });
  }

  try {
    let actualRenderId = renderId;
    let recordId = null;

    // If uuid provided, look up render ID from Airtable
    if (uuid && !renderId) {
      const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
      const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

      const searchResponse = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });

      const searchData = await searchResponse.json();

      if (!searchData.records || searchData.records.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }

      const record = searchData.records[0];
      recordId = record.id;
      actualRenderId = record.fields.video_render_id;

      if (!actualRenderId) {
        return res.status(400).json({
          error: 'No render in progress',
          videoStatus: record.fields.video_status,
        });
      }
    }

    // Get render progress from Remotion
    const progress = await getRenderProgress({
      renderId: actualRenderId,
      bucketName: `remotionlambda-${REMOTION_REGION.replace(/-/g, '')}`,
      functionName: REMOTION_FUNCTION_NAME,
      region: REMOTION_REGION,
    });

    // If render is done, update Airtable and clean up clips
    if (progress.done && recordId) {
      // Get the record to access video_clips for cleanup
      const getUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;
      const getResponse = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      const recordData = await getResponse.json();

      // Delete individual clips from R2 to save space
      if (recordData.fields?.video_clips) {
        try {
          const videoClips = JSON.parse(recordData.fields.video_clips);
          const keysToDelete = Object.values(videoClips)
            .map(clip => clip.key)
            .filter(Boolean);

          if (keysToDelete.length > 0) {
            await r2Client.send(new DeleteObjectsCommand({
              Bucket: R2_BUCKET_NAME,
              Delete: {
                Objects: keysToDelete.map(key => ({ Key: key })),
              },
            }));
            console.log(`Deleted ${keysToDelete.length} clips from R2`);
          }
        } catch (e) {
          console.error('Failed to delete clips:', e.message);
          // Don't fail the request if cleanup fails
        }
      }

      // Update Airtable with final video URL and clear clips
      const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            video_status: 'complete',
            video_url: progress.outputFile,
            video_clips: null, // Clear clips since we deleted them
          },
        }),
      });
    }

    // If render failed, update status
    if (progress.fatalErrorEncountered && recordId) {
      const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            video_status: 'failed',
          },
        }),
      });
    }

    res.status(200).json({
      renderId: actualRenderId,
      done: progress.done,
      overallProgress: progress.overallProgress,
      outputFile: progress.outputFile,
      fatalError: progress.fatalErrorEncountered,
      errorMessage: progress.errors?.[0]?.message,
    });
  } catch (error) {
    console.error('Render status error:', error);
    res.status(500).json({ error: error.message });
  }
}

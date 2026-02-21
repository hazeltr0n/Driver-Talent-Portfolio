// Check Remotion Lambda render progress
import { getRenderProgress } from '@remotion/lambda/client';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const REMOTION_REGION = process.env.REMOTION_AWS_REGION || 'us-east-1';
const REMOTION_FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME || 'remotion-render-4-0-427-mem2048mb-disk2048mb-900sec';

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

    // If render is done, update Airtable
    if (progress.done && recordId) {
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

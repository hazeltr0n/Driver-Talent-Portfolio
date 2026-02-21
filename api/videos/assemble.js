// Video assembly endpoint - triggers Remotion Lambda to stitch clips
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

// Remotion Lambda config
const REMOTION_REGION = process.env.REMOTION_AWS_REGION || 'us-east-1';
const REMOTION_FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME || 'remotion-render-4-0-427-mem2048mb-disk2048mb-900sec';
const REMOTION_SERVE_URL = process.env.REMOTION_SERVE_URL || 'https://remotionlambda-useast1-vw9j7zavih.s3.us-east-1.amazonaws.com/sites/driver-story/index.html';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid } = req.body;

  if (!uuid) {
    return res.status(400).json({ error: 'uuid required' });
  }

  try {
    // Get candidate record
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
    const recordId = record.id;
    const fields = record.fields;

    // Parse video clips
    let videoClips = {};
    if (fields.video_clips) {
      try {
        videoClips = JSON.parse(fields.video_clips);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid video clips data' });
      }
    }

    // Verify all 6 clips are uploaded
    const requiredClips = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    const missingClips = requiredClips.filter(q => !videoClips[q]);

    if (missingClips.length > 0) {
      return res.status(400).json({
        error: `Missing clips: ${missingClips.join(', ')}`,
        uploaded: Object.keys(videoClips),
      });
    }

    // Build input props for Remotion
    const driverName = fields.fullName || fields.name || 'Driver';
    const driverLocation = fields.city && fields.state
      ? `${fields.city}, ${fields.state}`
      : 'United States';

    const clips = requiredClips.map((key, index) => ({
      url: videoClips[key].url,
      durationInFrames: 30 * 60, // 60 seconds max at 30fps
    }));

    // Update status to processing
    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;
    await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          video_status: 'processing',
        },
      }),
    });

    // Trigger Remotion Lambda render
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: REMOTION_REGION,
      functionName: REMOTION_FUNCTION_NAME,
      serveUrl: REMOTION_SERVE_URL,
      composition: 'DriverStoryVideo',
      inputProps: {
        driverName,
        driverLocation,
        clips,
        musicUrl: null, // Add background music URL if available
      },
      codec: 'h264',
      imageFormat: 'jpeg',
      maxRetries: 1,
      privacy: 'public',
      outName: `${uuid}-final.mp4`,
    });

    // Store render ID for status checking
    await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          video_render_id: renderId,
        },
      }),
    });

    res.status(200).json({
      success: true,
      message: 'Video assembly started',
      uuid,
      renderId,
      bucketName,
      status: 'processing',
      note: 'Video processing has started. Check /api/videos/render-status for progress.',
    });
  } catch (error) {
    console.error('Assembly error:', error);
    res.status(500).json({ error: error.message });
  }
}

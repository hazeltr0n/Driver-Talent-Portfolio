// Video assembly endpoint - triggers render service to stitch clips

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

// Railway render service
const RENDER_SERVICE_URL = process.env.RENDER_SERVICE_URL || 'https://driver-story-render-production.up.railway.app';

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

    const clips = requiredClips.map((key, index) => {
      const clip = videoClips[key];
      return {
        url: clip.url,
        // Trim data from speech detection (in seconds)
        trimStart: clip.speechStart ?? 0,
        trimEnd: clip.speechEnd ?? null,
        durationInFrames: 30 * 30, // 30 seconds default at 30fps
      };
    });

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

    // Trigger Railway render service
    const renderResponse = await fetch(`${RENDER_SERVICE_URL}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uuid,
        driverName,
        driverLocation,
        clips,
      }),
    });

    if (!renderResponse.ok) {
      const errorData = await renderResponse.json();
      throw new Error(errorData.error || 'Render service error');
    }

    await renderResponse.json();

    res.status(200).json({
      success: true,
      message: 'Video assembly started',
      uuid,
      status: 'processing',
      note: 'Video processing has started. The service will update Airtable when complete.',
    });
  } catch (error) {
    console.error('Assembly error:', error);
    res.status(500).json({ error: error.message });
  }
}

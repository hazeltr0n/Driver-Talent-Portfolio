// Get video status and clips for a candidate

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid } = req.query;

  if (!uuid) {
    return res.status(400).json({ error: 'UUID required' });
  }

  try {
    const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const record = data.records[0];
    const fields = record.fields;

    // Parse video_clips JSON
    let videoClips = {};
    if (fields.video_clips) {
      try {
        videoClips = JSON.parse(fields.video_clips);
      } catch (e) {
        videoClips = {};
      }
    }

    res.status(200).json({
      uuid,
      name: fields.fullName || fields.name,
      videoStatus: fields.video_status || 'pending',
      videoUrl: fields.video_url || null,
      videoClips,
      clipsCount: Object.keys(videoClips).length,
    });
  } catch (error) {
    console.error('Get video status error:', error);
    res.status(500).json({ error: error.message });
  }
}

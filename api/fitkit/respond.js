const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid, stage, responses } = req.body;

  if (!uuid || !stage || !responses) {
    return res.status(400).json({ error: 'uuid, stage, and responses are required' });
  }

  if (stage !== 1 && stage !== 2) {
    return res.status(400).json({ error: 'stage must be 1 or 2' });
  }

  try {
    // Find candidate by UUID
    const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!searchRes.ok) {
      throw new Error(`Airtable error: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();

    if (!searchData.records || searchData.records.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const record = searchData.records[0];
    const fields = record.fields;

    // Check if assessment started
    if (!fields.fitkit_started_at) {
      return res.status(400).json({ error: 'Assessment not started. Call /api/fitkit/start first.' });
    }

    // Get existing responses
    const fieldName = stage === 1 ? 'fitkit_stage1_responses' : 'fitkit_stage2_responses';
    const existingResponses = fields[fieldName] ? JSON.parse(fields[fieldName]) : {};

    // Merge new responses
    const mergedResponses = { ...existingResponses, ...responses };

    // Save merged responses
    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${record.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: { [fieldName]: JSON.stringify(mergedResponses) },
      }),
    });

    if (!updateRes.ok) {
      throw new Error(`Update failed: ${updateRes.status}`);
    }

    // Count responses
    const responseCount = Object.keys(mergedResponses).length;
    const expectedCount = stage === 1 ? 42 : 32;
    const complete = responseCount >= expectedCount;

    res.json({
      uuid,
      stage,
      responseCount,
      expectedCount,
      complete,
      responses: mergedResponses,
    });
  } catch (error) {
    console.error('FitKit respond error:', error);
    res.status(500).json({ error: error.message });
  }
}

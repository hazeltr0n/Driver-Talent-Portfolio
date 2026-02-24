const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid } = req.body;

  if (!uuid) {
    return res.status(400).json({ error: 'uuid is required' });
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

    // Check if already started
    if (fields.fitkit_started_at) {
      // Return existing assessment state
      return res.json({
        uuid,
        status: 'resumed',
        startedAt: fields.fitkit_started_at,
        stage1Completed: !!fields.fitkit_stage1_completed_at,
        stage2Completed: !!fields.fitkit_stage2_completed_at,
        stage1Responses: fields.fitkit_stage1_responses ? JSON.parse(fields.fitkit_stage1_responses) : {},
        stage2Responses: fields.fitkit_stage2_responses ? JSON.parse(fields.fitkit_stage2_responses) : {},
        truckingGatePassed: fields.fitkit_trucking_gate_passed || null,
      });
    }

    // Start new assessment
    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${record.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: { fitkit_started_at: new Date().toISOString() },
      }),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error('Airtable update error:', errorText);
      throw new Error(`Update failed: ${updateRes.status} - ${errorText}`);
    }

    res.json({
      uuid,
      status: 'started',
      startedAt: new Date().toISOString(),
      stage1Completed: false,
      stage2Completed: false,
      stage1Responses: {},
      stage2Responses: {},
      truckingGatePassed: null,
    });
  } catch (error) {
    console.error('FitKit start error:', error);
    res.status(500).json({ error: error.message });
  }
}

import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const candidatesTable = base(process.env.AIRTABLE_CANDIDATES_TABLE_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid } = req.body;

  if (!uuid) {
    return res.status(400).json({ error: 'uuid is required' });
  }

  // Find candidate by UUID
  const records = await candidatesTable
    .select({
      filterByFormula: `{uuid} = "${uuid}"`,
      maxRecords: 1,
    })
    .firstPage();

  if (records.length === 0) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  const record = records[0];
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
  await candidatesTable.update(record.id, {
    fitkit_started_at: new Date().toISOString(),
  });

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
}

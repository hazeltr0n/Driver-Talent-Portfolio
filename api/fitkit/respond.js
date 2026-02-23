import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const candidatesTable = base(process.env.AIRTABLE_CANDIDATES_TABLE_ID);

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
  await candidatesTable.update(record.id, {
    [fieldName]: JSON.stringify(mergedResponses),
  });

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
}

import Airtable from 'airtable';
import { scoreStage1 } from '../lib/fitkit-scoring.js';

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

  // Check if Stage 1 already scored
  if (fields.fitkit_stage1_completed_at) {
    // Return existing results
    return res.json({
      uuid,
      status: 'already_scored',
      completedAt: fields.fitkit_stage1_completed_at,
      riasec: {
        r: fields.fitkit_riasec_r,
        i: fields.fitkit_riasec_i,
        a: fields.fitkit_riasec_a,
        s: fields.fitkit_riasec_s,
        e: fields.fitkit_riasec_e,
        c: fields.fitkit_riasec_c,
        code: fields.fitkit_riasec_code,
      },
      workValues: fields.fitkit_work_values ? JSON.parse(fields.fitkit_work_values) : null,
      topCareers: fields.fitkit_top_careers ? JSON.parse(fields.fitkit_top_careers) : null,
      truckingGatePassed: fields.fitkit_trucking_gate_passed,
    });
  }

  // Get responses
  const responses = fields.fitkit_stage1_responses ? JSON.parse(fields.fitkit_stage1_responses) : {};
  const responseCount = Object.keys(responses).length;

  if (responseCount < 42) {
    return res.status(400).json({
      error: 'Incomplete responses',
      responseCount,
      expectedCount: 42,
    });
  }

  // Score Stage 1
  const results = scoreStage1(responses);

  // Save results to Airtable
  await candidatesTable.update(record.id, {
    fitkit_stage1_completed_at: new Date().toISOString(),
    fitkit_riasec_r: results.riasec.raw.R,
    fitkit_riasec_i: results.riasec.raw.I,
    fitkit_riasec_a: results.riasec.raw.A,
    fitkit_riasec_s: results.riasec.raw.S,
    fitkit_riasec_e: results.riasec.raw.E,
    fitkit_riasec_c: results.riasec.raw.C,
    fitkit_riasec_code: results.riasec.code,
    fitkit_work_values: JSON.stringify(results.workValues),
    fitkit_top_careers: JSON.stringify(results.occupations.topMatches.slice(0, 10)),
    fitkit_trucking_gate_passed: results.truckingGatePassed,
  });

  res.json({
    uuid,
    status: 'scored',
    completedAt: new Date().toISOString(),
    riasec: results.riasec,
    workValues: results.workValues,
    occupations: results.occupations,
    truckingGatePassed: results.truckingGatePassed,
  });
}

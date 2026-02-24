import { scoreStage1 } from '../lib/fitkit-scoring.js';

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

    // Check if Stage 1 already scored
    if (fields.fitkit_stage1_completed_at) {
      // Return existing results
      return res.json({
        uuid,
        status: 'already_scored',
        completedAt: fields.fitkit_stage1_completed_at,
        riasec: {
          raw: {
            R: fields.fitkit_riasec_r,
            I: fields.fitkit_riasec_i,
            A: fields.fitkit_riasec_a,
            S: fields.fitkit_riasec_s,
            E: fields.fitkit_riasec_e,
            C: fields.fitkit_riasec_c,
          },
          code: fields.fitkit_riasec_code,
        },
        workValues: fields.fitkit_work_values ? JSON.parse(fields.fitkit_work_values) : null,
        occupations: {
          topMatches: fields.fitkit_top_careers ? JSON.parse(fields.fitkit_top_careers) : [],
        },
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
    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${record.id}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
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
        },
      }),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      throw new Error(`Update failed: ${errorText}`);
    }

    res.json({
      uuid,
      status: 'scored',
      completedAt: new Date().toISOString(),
      riasec: results.riasec,
      workValues: results.workValues,
      occupations: results.occupations,
      truckingGatePassed: results.truckingGatePassed,
    });
  } catch (error) {
    console.error('FitKit score-stage1 error:', error);
    res.status(500).json({ error: error.message });
  }
}

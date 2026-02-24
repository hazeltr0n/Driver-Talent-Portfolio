const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid } = req.query;

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

    // Build response
    const result = {
      uuid,
      candidateName: fields.fullName,
      startedAt: fields.fitkit_started_at || null,
      stage1: null,
      stage2: null,
    };

    // Stage 1 results
    if (fields.fitkit_stage1_completed_at) {
      result.stage1 = {
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
        topCareers: fields.fitkit_top_careers ? JSON.parse(fields.fitkit_top_careers) : null,
        truckingGatePassed: fields.fitkit_trucking_gate_passed,
      };
    }

    // Stage 2 results
    if (fields.fitkit_stage2_completed_at) {
      result.stage2 = {
        completedAt: fields.fitkit_stage2_completed_at,
        facets: {
          empathy: fields.fitkit_facet_empathy,
          anxiety: fields.fitkit_facet_anxiety,
          excitement: fields.fitkit_facet_excitement,
          discipline: fields.fitkit_facet_discipline,
          immoderation: fields.fitkit_facet_immoderation,
          dutifulness: fields.fitkit_facet_dutifulness,
        },
        gritTotal: fields.fitkit_grit_total,
        truckingFitScore: fields.fitkit_trucking_fit_score,
        retentionRisk: fields.fitkit_retention_risk,
        bestVertical: fields.fitkit_best_vertical,
        coachingNotes: fields.fitkit_coaching_notes,
      };
    }

    res.json(result);
  } catch (error) {
    console.error('FitKit results error:', error);
    res.status(500).json({ error: error.message });
  }
}

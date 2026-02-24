import OpenAI from 'openai';
import { scoreStage2 } from '../lib/fitkit-scoring.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateAICoachingNotes(results, driverName) {
  const prompt = `You are a career coach helping a truck driver candidate named ${driverName || 'this candidate'}.

Based on their FitKit assessment results:
- Trucking Fit Score: ${results.truckingFitScore}/100
- Retention Risk: ${results.retentionRisk.label}
- Best Fit Vertical: ${results.verticalFit.best.name}
- Key Facets:
  - Empathy: ${results.facets.standardized.empathy.toFixed(2)} (z-score)
  - Anxiety: ${results.facets.standardized.anxiety.toFixed(2)} (z-score)
  - Excitement-seeking: ${results.facets.standardized.excitement.toFixed(2)} (z-score)
  - Self-discipline: ${results.facets.standardized.discipline.toFixed(2)} (z-score)
  - Dutifulness: ${results.facets.standardized.dutifulness.toFixed(2)} (z-score)
- Grit Score: ${results.grit.average.toFixed(2)}/5

Write 2-3 personalized coaching notes (2-3 sentences each) that:
1. Highlight their strengths
2. Acknowledge any areas for growth without being discouraging
3. Give practical advice for succeeding in their recommended vertical

Be warm, encouraging, and specific. Speak directly to the candidate.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
  });

  return response.choices[0].message.content;
}

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

    // Check if Stage 2 already scored
    if (fields.fitkit_stage2_completed_at) {
      return res.json({
        uuid,
        status: 'already_scored',
        completedAt: fields.fitkit_stage2_completed_at,
        truckingFitScore: fields.fitkit_trucking_fit_score,
        retentionRisk: { label: fields.fitkit_retention_risk },
        verticalFit: { best: { name: fields.fitkit_best_vertical } },
        aiCoachingNotes: fields.fitkit_coaching_notes,
      });
    }

    // Check if Stage 1 completed
    if (!fields.fitkit_stage1_completed_at) {
      return res.status(400).json({ error: 'Stage 1 must be completed first' });
    }

    // Get Stage 2 responses
    const stage2Responses = fields.fitkit_stage2_responses ? JSON.parse(fields.fitkit_stage2_responses) : {};
    const responseCount = Object.keys(stage2Responses).length;

    if (responseCount < 32) {
      return res.status(400).json({
        error: 'Incomplete responses',
        responseCount,
        expectedCount: 32,
      });
    }

    // Get Stage 1 results for vertical calculation
    const stage1Results = {
      workValues: fields.fitkit_work_values ? JSON.parse(fields.fitkit_work_values) : { normalized: {} },
    };

    // Score Stage 2
    const results = scoreStage2(stage2Responses, stage1Results);

    // Generate AI coaching notes
    let aiCoachingNotes = '';
    try {
      aiCoachingNotes = await generateAICoachingNotes(results, fields.fullName);
    } catch (err) {
      console.error('Failed to generate AI coaching notes:', err);
      aiCoachingNotes = results.coachingNotes.map(n => n.text).join('\n\n');
    }

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
          fitkit_stage2_completed_at: new Date().toISOString(),
          fitkit_facet_empathy: results.facets.raw.empathy,
          fitkit_facet_anxiety: results.facets.raw.anxiety,
          fitkit_facet_excitement: results.facets.raw.excitement,
          fitkit_facet_discipline: results.facets.raw.discipline,
          fitkit_facet_immoderation: results.facets.raw.immoderation,
          fitkit_facet_dutifulness: results.facets.raw.dutifulness,
          fitkit_grit_total: results.grit.total,
          fitkit_trucking_fit_score: results.truckingFitScore,
          fitkit_retention_risk: results.retentionRisk.label,
          fitkit_best_vertical: results.verticalFit.best.name,
          fitkit_coaching_notes: aiCoachingNotes,
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
      facets: results.facets,
      grit: results.grit,
      truckingFitScore: results.truckingFitScore,
      fitScoreDetails: results.fitScoreDetails,
      retentionRisk: results.retentionRisk,
      verticalFit: results.verticalFit,
      coachingNotes: results.coachingNotes,
      aiCoachingNotes,
    });
  } catch (error) {
    console.error('FitKit score-stage2 error:', error);
    res.status(500).json({ error: error.message });
  }
}

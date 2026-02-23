import { calculateFitScores, parseJSON } from '../lib/fit-scoring.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const REQUISITIONS_TABLE = 'Job Requisitions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candidate_uuid, requisition_id } = req.body;

  if (!candidate_uuid || !requisition_id) {
    return res.status(400).json({ error: 'candidate_uuid and requisition_id required' });
  }

  try {
    const [candidate, job] = await Promise.all([
      getCandidateByUUID(candidate_uuid),
      getJob(requisition_id),
    ]);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const driverData = {
      ...candidate.fields,
      employment_history: parseJSON(candidate.fields.employment_history, []),
      equipment_experience: parseJSON(candidate.fields.equipment_experience, []),
    };

    const fitScores = calculateFitScores(driverData, job.fields);

    res.status(200).json({
      fit_score: fitScores.overallScore,
      dimensions: fitScores.dimensions,
    });
  } catch (error) {
    console.error('Fit preview error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getCandidateByUUID(uuid) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  const data = await response.json();
  return data.records?.[0] || null;
}

async function getJob(jobId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${jobId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return null;
  return response.json();
}

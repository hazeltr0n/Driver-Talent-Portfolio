import { requireEmployerAuth } from '../../lib/auth.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const FIT_PROFILES_TABLE = process.env.AIRTABLE_FIT_PROFILES_TABLE_ID || 'Fit Profiles';
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  // Require employer authentication
  const employer = requireEmployerAuth(req, res);
  if (!employer) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { minScore = 70, jobId, sortBy = 'score' } = req.query;

    // Fetch fit profiles for this employer with score >= minScore
    const profiles = await getFitProfilesForEmployer(employer.employer_name, parseInt(minScore), jobId);

    // Sort profiles
    const sorted = sortProfiles(profiles, sortBy);

    // Map to candidate feed format
    const candidates = sorted.map(profile => ({
      uuid: profile.candidate_uuid,
      name: profile.candidate_name || 'Unknown',
      city: profile.candidate_city || '',
      state: profile.candidate_state || '',
      years_experience: profile.candidate_years_experience || 0,
      cdl_class: profile.candidate_cdl_class || '',
      fit_score: profile.fit_score,
      fit_recommendation: profile.fit_recommendation || '',
      fit_dimensions: parseJSON(profile.fit_dimensions, []),
      job_title: profile.job_title || '',
      job_id: profile.requisition_id,
      profile_id: profile.id,
      generated_at: profile.generated_at,
    }));

    res.status(200).json({ candidates });
  } catch (error) {
    console.error('Employer candidates error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getFitProfilesForEmployer(employerName, minScore, jobId) {
  // Build filter formula using employer_name lookup field (from employer_link)
  let formula = `AND({name (from employer_link)} = "${employerName}", {fit_score} >= ${minScore}, {status} = "Active")`;

  if (jobId) {
    formula = `AND({name (from employer_link)} = "${employerName}", {fit_score} >= ${minScore}, {status} = "Active", {requisition_id} = "${jobId}")`;
  }

  const encodedFormula = encodeURIComponent(formula);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}?filterByFormula=${encodedFormula}&sort[0][field]=fit_score&sort[0][direction]=desc`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable error: ${error}`);
  }

  const data = await response.json();

  // Fetch candidate details for each profile
  const profiles = await Promise.all(
    data.records.map(async (record) => {
      const candidateDetails = await getCandidateByUUID(record.fields.candidate_uuid);
      const jobDetails = await getJobById(record.fields.requisition_id);

      return {
        id: record.id,
        ...record.fields,
        candidate_name: candidateDetails?.fullName || '',
        candidate_city: candidateDetails?.city || '',
        candidate_state: candidateDetails?.state || '',
        candidate_years_experience: candidateDetails?.years_experience || 0,
        candidate_cdl_class: candidateDetails?.cdl_class || '',
        job_title: jobDetails?.title || '',
      };
    })
  );

  return profiles;
}

async function getCandidateByUUID(uuid) {
  if (!uuid) return null;

  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.records?.[0]?.fields || null;
}

async function getJobById(jobId) {
  if (!jobId) return null;

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent('Job Requisitions')}/${jobId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.fields || null;
}

function sortProfiles(profiles, sortBy) {
  return [...profiles].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.fit_score - a.fit_score;
      case 'experience':
        return (b.candidate_years_experience || 0) - (a.candidate_years_experience || 0);
      case 'recent':
        return new Date(b.generated_at) - new Date(a.generated_at);
      default:
        return b.fit_score - a.fit_score;
    }
  });
}

function parseJSON(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

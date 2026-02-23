import { requireEmployerAuth } from '../../lib/auth.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const FIT_PROFILES_TABLE = process.env.AIRTABLE_FIT_PROFILES_TABLE_ID || 'Fit Profiles';

export default async function handler(req, res) {
  // Require employer authentication
  const employer = requireEmployerAuth(req, res);
  if (!employer) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid } = req.query;

  if (!uuid) {
    return res.status(400).json({ error: 'UUID required' });
  }

  try {
    // Verify employer has a fit profile for this candidate (access control)
    const hasAccess = await verifyEmployerAccess(employer.employer_name, uuid);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied - no fit profile for this candidate' });
    }

    // Fetch full candidate profile
    const candidate = await getCandidateByUUID(uuid);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Get all fit profiles for this candidate under this employer's jobs
    const fitProfiles = await getFitProfilesForCandidate(employer.employer_name, uuid);

    // Build employer-safe candidate profile (exclude sensitive data)
    const profile = {
      uuid: candidate.uuid,
      fullName: candidate.fullName || '',
      city: candidate.city || '',
      state: candidate.state || '',
      years_experience: candidate.years_experience || 0,
      cdl_class: candidate.cdl_class || '',
      endorsements: candidate.endorsements || '',
      home_time_preference: candidate.home_time_preference || '',
      equipment_experience: parseJSON(candidate.equipment_experience, []),
      employment_history: parseJSON(candidate.employment_history, []),
      // AI-generated content
      ai_narrative: candidate.ai_narrative || '',
      ai_pull_quote: candidate.ai_pull_quote || '',
      // Video
      video_url: candidate.video_url || null,
      // Fit profiles for employer's jobs
      fit_profiles: fitProfiles.map(fp => ({
        job_id: fp.requisition_id,
        job_title: fp.job_title || '',
        fit_score: fp.fit_score,
        fit_recommendation: fp.fit_recommendation || '',
        fit_dimensions: parseJSON(fp.fit_dimensions, []),
        generated_at: fp.generated_at,
      })),
    };

    res.status(200).json(profile);
  } catch (error) {
    console.error('Employer candidate profile error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function verifyEmployerAccess(employerName, candidateUuid) {
  // Check if there's at least one fit profile linking this employer to this candidate
  // Uses employer_name lookup field (from employer_link)
  const formula = encodeURIComponent(
    `AND({name (from employer_link)} = "${employerName}", {candidate_uuid} = "${candidateUuid}", {status} = "Active")`
  );
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return false;

  const data = await response.json();
  return (data.records?.length || 0) > 0;
}

async function getCandidateByUUID(uuid) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.records?.[0]?.fields || null;
}

async function getFitProfilesForCandidate(employerName, candidateUuid) {
  // Uses employer_name lookup field (from employer_link)
  const formula = encodeURIComponent(
    `AND({name (from employer_link)} = "${employerName}", {candidate_uuid} = "${candidateUuid}", {status} = "Active")`
  );
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}?filterByFormula=${formula}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return [];

  const data = await response.json();

  // Fetch job titles
  const profiles = await Promise.all(
    data.records.map(async (record) => {
      const job = await getJobById(record.fields.requisition_id);
      return {
        ...record.fields,
        job_title: job?.title || '',
      };
    })
  );

  return profiles;
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

function parseJSON(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

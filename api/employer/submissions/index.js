import { requireEmployerAuth } from '../../lib/auth.js';
import { calculateFitScores, generateRecommendation, parseJSON } from '../../lib/fit-scoring.js';
import { sendInterviewRequestEmail } from '../../lib/email.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const SUBMISSIONS_TABLE = 'Job Submissions';
const REQUISITIONS_TABLE = 'Job Requisitions';
const FIT_PROFILES_TABLE = process.env.AIRTABLE_FIT_PROFILES_TABLE_ID || 'Fit Profiles';

export default async function handler(req, res) {
  // Require employer authentication
  const employer = requireEmployerAuth(req, res);
  if (!employer) return;

  try {
    if (req.method === 'GET') {
      return await listSubmissions(req, res, employer);
    } else if (req.method === 'POST') {
      return await createSubmission(req, res, employer);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Employer submissions error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function listSubmissions(req, res, employer) {
  const { status } = req.query;

  // Filter submissions by employer text field (matches employer_name from JWT)
  let formula = `{employer} = "${employer.employer_name}"`;
  if (status) {
    formula = `AND(${formula}, {status} = "${status}")`;
  }

  const encodedFormula = encodeURIComponent(formula);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}?filterByFormula=${encodedFormula}&sort[0][field]=submitted_date&sort[0][direction]=desc`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable error: ${error}`);
  }

  const data = await response.json();

  const submissions = data.records.map(r => ({
    id: r.id,
    candidate_name: r.fields.candidate_name || '',
    candidate_uuid: r.fields.candidate_uuid || '',
    job_title: r.fields.job_title || '',
    requisition_id: r.fields.requisition_id || '',
    employer: r.fields.employer || '',
    status: r.fields.status || 'Submitted',
    submitted_date: r.fields.submitted_date || '',
    hire_date: r.fields.hire_date || '',
    fit_score: r.fields.fit_score || 0,
    fit_recommendation: r.fields.fit_recommendation || '',
    fit_dimensions: parseJSON(r.fields.fit_dimensions, []),
    interview_notes: r.fields.interview_notes || '',
    rejection_reason: r.fields.rejection_reason || '',
    rejection_explanation: r.fields.rejection_explanation || '',
    requested_by: r.fields.requested_by || 'Career Agent',
    employer_requested_at: r.fields.employer_requested_at || '',
  }));

  res.status(200).json({ submissions });
}

async function createSubmission(req, res, employer) {
  const { candidate_uuid, requisition_id, notes } = req.body;

  if (!candidate_uuid || !requisition_id) {
    return res.status(400).json({ error: 'candidate_uuid and requisition_id required' });
  }

  // Verify job belongs to this employer
  const job = await getJob(requisition_id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const jobEmployerLinks = job.fields.employer_link || [];
  if (!jobEmployerLinks.includes(employer.employer_id)) {
    return res.status(403).json({ error: 'Access denied - job does not belong to your company' });
  }

  // Get candidate
  const candidate = await getCandidateByUUID(candidate_uuid);
  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  // Calculate fit scores
  const driverData = {
    ...candidate.fields,
    employment_history: parseJSON(candidate.fields.employment_history, []),
    equipment_experience: parseJSON(candidate.fields.equipment_experience, []),
  };

  const fitScores = calculateFitScores(driverData, job.fields);
  const recommendation = await generateRecommendation(driverData, job.fields, fitScores);

  const portfolioSlug = candidate.fields.portfolio_slug || '';

  const fields = {
    candidate_uuid,
    candidate_name: candidate.fields.fullName || '',
    requisition_id,
    employer: employer.employer_name,
    job_title: job.fields.title || '',
    submitted_date: new Date().toISOString().split('T')[0],
    status: 'Submitted',
    portfolio_slug: portfolioSlug,
    fit_score: fitScores.overallScore,
    fit_dimensions: JSON.stringify(fitScores.dimensions),
    fit_recommendation: recommendation,
    // Employer-specific fields
    requested_by: 'Employer',
    employer_requested_at: new Date().toISOString(),
    notes: notes || '',
    // Linked records
    requisition_link: [requisition_id],
    employer_link: [employer.employer_id],
  };

  if (candidate.id) {
    fields.candidate_link = [candidate.id];
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Create failed: ${error}`);
  }

  const record = await response.json();

  // Link submission to fit profile (for rejection filtering)
  try {
    await linkSubmissionToFitProfile(record.id, candidate_uuid, requisition_id);
  } catch (err) {
    console.error('Failed to link submission to fit profile:', err);
  }

  // Send notification email to career agent
  try {
    await sendInterviewRequestEmail({
      employer: employer.employer_name,
      employerContact: employer.contact_name,
      candidate: candidate.fields.fullName,
      job: job.fields.title,
      fitScore: fitScores.overallScore,
      notes,
    });
  } catch (err) {
    console.error('Failed to send interview request email:', err);
  }

  res.status(201).json({
    id: record.id,
    ...record.fields,
    fit_dimensions: parseJSON(record.fields.fit_dimensions, []),
  });
}

async function getJob(jobId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${jobId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return null;
  return response.json();
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

async function linkSubmissionToFitProfile(submissionId, candidateUuid, requisitionId) {
  // Find the fit profile for this candidate + job combination
  const formula = encodeURIComponent(
    `AND({candidate_uuid} = "${candidateUuid}", {requisition_id} = "${requisitionId}")`
  );
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) return;

  const data = await response.json();
  const fitProfile = data.records?.[0];

  if (!fitProfile) return;

  // Get existing linked submissions and add the new one
  const existingLinks = fitProfile.fields['Job Submissions'] || [];
  const updatedLinks = [...existingLinks, submissionId];

  // Update the fit profile to link to this submission
  const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}/${fitProfile.id}`;

  await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        'Job Submissions': updatedLinks,
      },
    }),
  });
}


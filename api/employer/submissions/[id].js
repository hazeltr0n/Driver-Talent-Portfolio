import { requireEmployerAuth } from '../../lib/auth.js';
import { sendStatusChangeEmail } from '../../lib/email.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const SUBMISSIONS_TABLE = 'Job Submissions';

export default async function handler(req, res) {
  // Require employer authentication
  const employer = requireEmployerAuth(req, res);
  if (!employer) return;

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Submission ID required' });
  }

  try {
    if (req.method === 'GET') {
      return await getSubmission(req, res, employer, id);
    } else if (req.method === 'PATCH') {
      return await updateSubmission(req, res, employer, id);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Employer submission error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getSubmission(req, res, employer, submissionId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}/${submissionId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    throw new Error(`Airtable error: ${response.status}`);
  }

  const record = await response.json();

  // Verify this submission belongs to the employer
  const employerLinks = record.fields.employer_link || [];
  if (!employerLinks.includes(employer.employer_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.status(200).json({
    id: record.id,
    candidate_name: record.fields.candidate_name || '',
    candidate_uuid: record.fields.candidate_uuid || '',
    job_title: record.fields.job_title || '',
    requisition_id: record.fields.requisition_id || '',
    employer: record.fields.employer || '',
    status: record.fields.status || 'Submitted',
    submitted_date: record.fields.submitted_date || '',
    hire_date: record.fields.hire_date || '',
    fit_score: record.fields.fit_score || 0,
    fit_recommendation: record.fields.fit_recommendation || '',
    fit_dimensions: parseJSON(record.fields.fit_dimensions, []),
    interview_notes: record.fields.interview_notes || '',
    rejection_reason: record.fields.rejection_reason || '',
    rejection_explanation: record.fields.rejection_explanation || '',
    notes: record.fields.notes || '',
    requested_by: record.fields.requested_by || 'Career Agent',
    employer_requested_at: record.fields.employer_requested_at || '',
    portfolio_slug: record.fields.portfolio_slug || '',
  });
}

async function updateSubmission(req, res, employer, submissionId) {
  // First verify this submission belongs to the employer
  const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}/${submissionId}`;

  const checkResponse = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!checkResponse.ok) {
    if (checkResponse.status === 404) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    throw new Error(`Airtable error: ${checkResponse.status}`);
  }

  const existing = await checkResponse.json();
  const employerLinks = existing.fields.employer_link || [];

  if (!employerLinks.includes(employer.employer_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const oldStatus = existing.fields.status;

  // Allowed fields for employer to update
  const allowedFields = [
    'status',
    'interview_notes',
    'rejection_reason',
    'rejection_explanation',
  ];

  const fields = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      fields[key] = req.body[key];
    }
  }

  // Handle status change to Hired
  if (fields.status === 'Hired' && !existing.fields.hire_date) {
    fields.hire_date = new Date().toISOString().split('T')[0];
  }

  const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}/${submissionId}`;

  const response = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Update failed: ${error}`);
  }

  const record = await response.json();

  // Notify career agent on status change
  if (fields.status && fields.status !== oldStatus) {
    try {
      await sendStatusChangeEmail({
        employer: employer.employer_name,
        candidate: existing.fields.candidate_name,
        job: existing.fields.job_title,
        oldStatus,
        newStatus: fields.status,
        rejectionReason: fields.rejection_reason,
        rejectionExplanation: fields.rejection_explanation,
        interviewNotes: fields.interview_notes,
      });
    } catch (err) {
      console.error('Failed to send status change email:', err);
    }
  }

  res.status(200).json({
    id: record.id,
    ...record.fields,
    fit_dimensions: parseJSON(record.fields.fit_dimensions, []),
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

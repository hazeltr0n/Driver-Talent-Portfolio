import { requireEmployerAuth } from '../../lib/auth.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const REQUISITIONS_TABLE = 'Job Requisitions';

export default async function handler(req, res) {
  // Require employer authentication
  const employer = requireEmployerAuth(req, res);
  if (!employer) return;

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Job ID required' });
  }

  try {
    if (req.method === 'GET') {
      return await getJob(req, res, employer, id);
    } else if (req.method === 'PATCH') {
      return await updateJob(req, res, employer, id);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Employer job error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getJob(req, res, employer, jobId) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${jobId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return res.status(404).json({ error: 'Job not found' });
    }
    throw new Error(`Airtable error: ${response.status}`);
  }

  const record = await response.json();

  // Verify this job belongs to the employer
  const employerLinks = record.fields.employer_link || [];
  if (!employerLinks.includes(employer.employer_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.status(200).json({
    id: record.id,
    title: record.fields.title || '',
    location: record.fields.location || '',
    yard_zip: record.fields.yard_zip || '',
    route_type: record.fields.route_type || '',
    cdl_class: record.fields.cdl_class || '',
    min_experience_years: record.fields.min_experience_years || 0,
    pay_min: record.fields.pay_min || 0,
    pay_max: record.fields.pay_max || 0,
    home_time: record.fields.home_time || '',
    touch_freight: record.fields.touch_freight || '',
    equipment_types: record.fields.equipment_types || '',
    endorsements_required: record.fields.endorsements_required || '',
    max_mvr_violations: record.fields.max_mvr_violations || 0,
    max_accidents: record.fields.max_accidents || 0,
    positions_available: record.fields.positions_available || 1,
    notes: record.fields.notes || '',
    raw_description: record.fields.raw_description || '',
    status: record.fields.status || 'Active',
    received_date: record.fields.received_date,
    filled_date: record.fields.filled_date,
    created_at: record.fields.created_at,
  });
}

async function updateJob(req, res, employer, jobId) {
  // First verify this job belongs to the employer
  const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${jobId}`;

  const checkResponse = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!checkResponse.ok) {
    if (checkResponse.status === 404) {
      return res.status(404).json({ error: 'Job not found' });
    }
    throw new Error(`Airtable error: ${checkResponse.status}`);
  }

  const existing = await checkResponse.json();
  const employerLinks = existing.fields.employer_link || [];

  if (!employerLinks.includes(employer.employer_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Allowed fields for employer to update
  const allowedFields = [
    'title', 'location', 'yard_zip', 'route_type', 'cdl_class',
    'min_experience_years', 'pay_min', 'pay_max', 'home_time',
    'touch_freight', 'equipment_types', 'endorsements_required',
    'max_mvr_violations', 'max_accidents', 'positions_available',
    'notes', 'raw_description', 'status',
  ];

  const fields = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      fields[key] = req.body[key];
    }
  }

  // Handle status change to Filled
  if (fields.status === 'Filled' && !existing.fields.filled_date) {
    fields.filled_date = new Date().toISOString().split('T')[0];
  }

  const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${jobId}`;

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

  res.status(200).json({
    id: record.id,
    ...record.fields,
  });
}

import { verifyAdminToken } from '../lib/auth.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const REQUISITIONS_TABLE = 'Job Requisitions';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await listJobs(req, res);
    } else if (req.method === 'POST') {
      // Get admin from token if available (for auto-setting career_agent)
      const admin = verifyAdminToken(req);
      return await createJob(req, res, admin);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Jobs error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function listJobs(req, res) {
  const { status } = req.query;

  let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}`;

  if (status) {
    const formula = encodeURIComponent(`{status} = "${status}"`);
    url += `?filterByFormula=${formula}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Airtable error: ${response.status}`);
  }

  const data = await response.json();

  const jobs = data.records.map(r => ({
    id: r.id,
    ...r.fields,
    // Use lookup field from Airtable (returns array, grab first value)
    hubspot_company_id: r.fields['hubspot_company_id (from employer_link)']?.[0] || null,
  }));

  res.status(200).json({ jobs });
}

async function createJob(req, res, admin = null) {
  const body = req.body;

  // Require employer_id (linked record) and title
  if (!body.employer_id || !body.title) {
    return res.status(400).json({ error: 'employer_id and title required' });
  }

  // Only include known Airtable fields
  const VALID_FIELDS = [
    'employer', 'location', 'yard_zip', 'title', 'route_type', 'cdl_class',
    'min_experience_years', 'pay_min', 'pay_max', 'equipment_types',
    'home_time', 'touch_freight', 'endorsements_required', 'notes', 'status',
    'raw_description', 'received_date', 'filled_date', 'positions_available'
  ];

  const fields = {};
  for (const key of VALID_FIELDS) {
    if (body[key] !== undefined && body[key] !== null) {
      fields[key] = body[key];
    }
  }

  // Set employer_link as linked record (array of record IDs)
  fields.employer_link = [body.employer_id];

  // Set defaults
  fields.status = fields.status || 'Active';
  fields.received_date = fields.received_date || new Date().toISOString().split('T')[0];

  // Auto-set career_agent if admin is authenticated
  if (admin && admin.email) {
    fields.career_agent_email = admin.email;
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}`;

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

  // Trigger fit profile generation for this new job
  try {
    await generateFitProfiles(record.id);
  } catch (err) {
    console.error('Fit profile generation failed:', err);
    // Don't fail the request, just log
  }

  res.status(201).json({
    id: record.id,
    ...record.fields,
  });
}

async function generateFitProfiles(requisitionId) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  await fetch(`${baseUrl}/api/fit-profiles/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requisition_id: requisitionId }),
  });
}

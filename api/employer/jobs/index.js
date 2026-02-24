import { requireEmployerAuth } from '../../lib/auth.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const REQUISITIONS_TABLE = 'Job Requisitions';

export default async function handler(req, res) {
  // Require employer authentication
  const employer = requireEmployerAuth(req, res);
  if (!employer) return;

  try {
    if (req.method === 'GET') {
      return await listJobs(req, res, employer);
    } else if (req.method === 'POST') {
      return await createJob(req, res, employer);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Employer jobs error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function listJobs(req, res, employer) {
  const { status = 'Active' } = req.query;

  // Filter jobs by employer text field (matches employer_name from JWT)
  const formula = encodeURIComponent(
    `AND({employer} = "${employer.employer_name}", {status} = "${status}")`
  );

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}?filterByFormula=${formula}&sort[0][field]=created_at&sort[0][direction]=desc`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable error: ${error}`);
  }

  const data = await response.json();

  const jobs = data.records.map(r => ({
    id: r.id,
    title: r.fields.title || '',
    location: r.fields.location || '',
    yard_zip: r.fields.yard_zip || '',
    route_type: r.fields.route_type || '',
    cdl_class: r.fields.cdl_class || '',
    min_experience_years: r.fields.min_experience_years || 0,
    pay_min: r.fields.pay_min || 0,
    pay_max: r.fields.pay_max || 0,
    home_time: r.fields.home_time || '',
    touch_freight: r.fields.touch_freight || '',
    equipment_types: r.fields.equipment_types || '',
    endorsements_required: r.fields.endorsements_required || '',
    max_mvr_violations: r.fields.max_mvr_violations,
    max_accidents: r.fields.max_accidents,
    status: r.fields.status || 'Active',
    positions_available: r.fields.positions_available || 1,
    notes: r.fields.notes || '',
    raw_description: r.fields.raw_description || '',
    created_at: r.fields.created_at,
    received_date: r.fields.received_date,
    filled_date: r.fields.filled_date,
  }));

  res.status(200).json({ jobs });
}

async function createJob(req, res, employer) {
  const {
    title,
    location,
    yard_zip,
    route_type,
    cdl_class,
    min_experience_years,
    pay_min,
    pay_max,
    home_time,
    touch_freight,
    equipment_types,
    endorsements_required,
    max_mvr_violations,
    max_accidents,
    positions_available,
    notes,
    raw_description,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const fields = {
    title,
    location: location || '',
    yard_zip: yard_zip || '',
    route_type: route_type || '',
    cdl_class: cdl_class || '',
    min_experience_years: min_experience_years || 0,
    pay_min: pay_min || 0,
    pay_max: pay_max || 0,
    home_time: home_time || '',
    touch_freight: touch_freight || '',
    equipment_types: equipment_types || '',
    endorsements_required: endorsements_required || '',
    max_mvr_violations: max_mvr_violations ?? 2,
    max_accidents: max_accidents ?? 1,
    positions_available: positions_available || 1,
    notes: notes || '',
    raw_description: raw_description || '',
    status: 'Active',
    received_date: new Date().toISOString().split('T')[0],
    // Link to employer
    employer_link: [employer.employer_id],
    employer: employer.employer_name, // For backwards compatibility
  };

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
    // Don't fail the job creation
  }

  res.status(201).json({
    id: record.id,
    ...record.fields,
  });
}

async function generateFitProfiles(requisitionId) {
  // Call internal fit profile generation endpoint
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  await fetch(`${baseUrl}/api/fit-profiles/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requisition_id: requisitionId }),
  });
}

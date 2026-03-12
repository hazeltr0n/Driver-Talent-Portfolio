import { verifyAdminToken } from '../lib/auth.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const EMPLOYERS_TABLE = 'Employers';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await listEmployers(req, res);
    } else if (req.method === 'POST') {
      // Get admin from token if available (for auto-setting career_agent)
      const admin = verifyAdminToken(req);
      return await createEmployer(req.body, res, admin);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Employers error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function listEmployers(req, res) {
  const { search } = req.query;

  let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(EMPLOYERS_TABLE)}?sort[0][field]=name&sort[0][direction]=asc`;

  if (search) {
    const formula = encodeURIComponent(`SEARCH(LOWER("${search}"), LOWER({name}))`);
    url += `&filterByFormula=${formula}`;
  }

  url += '&maxRecords=100';

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Airtable error: ${response.status}`);
  }

  const data = await response.json();

  const employers = data.records.map(r => ({
    id: r.id,
    ...r.fields,
  }));

  res.status(200).json({ employers });
}

async function createEmployer(data, res, admin = null) {
  const {
    hubspot_company_id,
    hubspot_parent_company_id,
    name,
    domain,
    phone,
    zip,
    city,
    state,
    lifecycle_stage,
    employer_enrichment_tier,
    main_contact_name,
    main_contact_email,
    main_contact_phone,
    main_contact_mobile,
  } = data;

  if (!hubspot_company_id || !name) {
    return res.status(400).json({ error: 'hubspot_company_id and name are required' });
  }

  // Check if employer already exists by hubspot_company_id
  const checkFormula = encodeURIComponent(`{hubspot_company_id} = "${hubspot_company_id}"`);
  const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(EMPLOYERS_TABLE)}?filterByFormula=${checkFormula}&maxRecords=1`;

  const checkResponse = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  const checkData = await checkResponse.json();

  if (checkData.records && checkData.records.length > 0) {
    // Already exists, return existing record
    const existing = checkData.records[0];
    return res.status(200).json({
      id: existing.id,
      ...existing.fields,
      already_existed: true,
    });
  }

  // Create new employer
  const fields = {
    hubspot_company_id,
    hubspot_parent_company_id: hubspot_parent_company_id || null,
    name,
    domain: domain || null,
    phone: phone || null,
    zip: zip || null,
    city: city || null,
    state: state || null,
    lifecycle_stage: lifecycle_stage || null,
    employer_enrichment_tier: employer_enrichment_tier || null,
    main_contact_name: main_contact_name || null,
    main_contact_email: main_contact_email || null,
    main_contact_phone: main_contact_phone || null,
    main_contact_mobile: main_contact_mobile || null,
    created_at: new Date().toISOString().split('T')[0],
  };

  // Auto-set career_agent if admin is authenticated
  if (admin && admin.email) {
    fields.career_agent_email = admin.email;
  }

  // Remove null values
  Object.keys(fields).forEach(key => {
    if (fields[key] === null) delete fields[key];
  });

  const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(EMPLOYERS_TABLE)}`;

  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Create failed: ${error}`);
  }

  const created = await createResponse.json();
  res.status(201).json({ id: created.id, ...created.fields });
}

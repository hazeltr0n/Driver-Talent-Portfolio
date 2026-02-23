import { randomUUID } from 'crypto';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return createCandidate(req.body, res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return all candidates from our Candidates table
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?sort[0][field]=fullName&sort[0][direction]=asc`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }

    const data = await response.json();

    const candidates = data.records.map(r => ({
      uuid: r.fields.uuid,
      id: r.id,
      ...r.fields,
      equipment_experience: parseJSON(r.fields.equipment_experience),
      employment_history: parseJSON(r.fields.employment_history),
      admin_portal_url: r.fields['Admin Portal Record (from Free Agents - Linked)']?.[0] || null,
    }));

    res.status(200).json({ candidates });
  } catch (error) {
    console.error('Candidates list error:', error);
    res.status(500).json({ error: error.message });
  }
}

function parseJSON(field) {
  if (!field) return [];
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return [];
  }
}

async function createCandidate(data, res) {
  const {
    fullName, email, phone, city, state,
    synced_record_id, cdl_class, years_experience, endorsements
  } = data;

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  // Check if already exists (by uuid or synced_record_id)
  if (data.uuid || synced_record_id) {
    const checkField = data.uuid ? 'uuid' : 'synced_record_id';
    const checkValue = data.uuid || synced_record_id;
    const checkFormula = encodeURIComponent(`{${checkField}} = "${checkValue}"`);
    const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${checkFormula}&maxRecords=1`;

    const checkResponse = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const checkData = await checkResponse.json();

    if (checkData.records && checkData.records.length > 0) {
      // Already exists, return existing record
      const existing = checkData.records[0];
      return res.status(200).json({
        uuid: existing.fields.uuid,
        id: existing.id,
        ...existing.fields,
        already_exists: true,
      });
    }
  }

  // Generate UUID and portfolio slug
  const uuid = data.uuid || randomUUID();
  const portfolio_slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

  const fields = {
    uuid,
    fullName,
    portfolio_slug,
    source: synced_record_id ? 'Synced' : 'Manual',
    placement_status: 'Unemployed and Looking',
  };

  // Add optional fields if provided
  if (email) fields.email = email;
  if (phone) fields.phone = phone;
  if (city) fields.city = city;
  if (state) fields.state = state;
  if (synced_record_id) {
    fields.synced_record_id = synced_record_id;
    // Set linked record to Free Agents table (lookup fields are configured on this field)
    fields['Free Agents - Linked'] = [synced_record_id];
  }
  if (cdl_class) fields.cdl_class = cdl_class;
  if (years_experience) fields.years_experience = years_experience;
  if (endorsements) fields.endorsements = endorsements;

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}`;

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
    res.status(201).json({
      uuid: record.fields.uuid,
      id: record.id,
      ...record.fields,
    });
  } catch (error) {
    console.error('Create candidate error:', error);
    res.status(500).json({ error: error.message });
  }
}

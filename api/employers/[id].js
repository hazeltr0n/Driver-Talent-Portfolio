const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const EMPLOYERS_TABLE = 'Employers';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Employer ID required' });
  }

  try {
    if (req.method === 'GET') {
      return await getEmployer(id, res);
    } else if (req.method === 'PATCH') {
      return await updateEmployer(id, req.body, res);
    } else if (req.method === 'DELETE') {
      return await deleteEmployer(id, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Employer error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getEmployer(id, res) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(EMPLOYERS_TABLE)}/${id}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return res.status(404).json({ error: 'Employer not found' });
    }
    throw new Error(`Airtable error: ${response.status}`);
  }

  const record = await response.json();
  res.status(200).json({ id: record.id, ...record.fields });
}

async function updateEmployer(id, updates, res) {
  const VALID_FIELDS = [
    'name', 'domain', 'phone', 'zip', 'city', 'state',
    'lifecycle_stage', 'employer_enrichment_tier',
    'main_contact_name', 'main_contact_email', 'main_contact_phone', 'main_contact_mobile',
  ];

  const fields = {};
  for (const key of VALID_FIELDS) {
    if (updates[key] !== undefined) {
      fields[key] = updates[key];
    }
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(EMPLOYERS_TABLE)}/${id}`;

  const response = await fetch(url, {
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
  res.status(200).json({ id: record.id, ...record.fields });
}

async function deleteEmployer(id, res) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(EMPLOYERS_TABLE)}/${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }

  res.status(200).json({ success: true });
}

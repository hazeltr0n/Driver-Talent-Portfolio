const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const FIT_PROFILES_TABLE = process.env.AIRTABLE_FIT_PROFILES_TABLE_ID || 'Fit Profiles';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Fit profile ID required' });
  }

  try {
    if (req.method === 'GET') {
      return await getFitProfile(id, res);
    } else if (req.method === 'PATCH') {
      return await updateFitProfile(id, req.body, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Fit profile error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getFitProfile(id, res) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}/${id}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return res.status(404).json({ error: 'Fit profile not found' });
    }
    throw new Error(`Airtable error: ${response.status}`);
  }

  const record = await response.json();
  res.status(200).json({
    id: record.id,
    ...record.fields,
    fit_dimensions: parseJSON(record.fields.fit_dimensions, []),
  });
}

async function updateFitProfile(id, updates, res) {
  const VALID_FIELDS = [
    'fit_score',
    'fit_dimensions',
    'fit_recommendation',
    'status',
  ];

  const fields = {};
  for (const key of VALID_FIELDS) {
    if (updates[key] !== undefined) {
      // Stringify fit_dimensions if it's an array
      if (key === 'fit_dimensions' && Array.isArray(updates[key])) {
        fields[key] = JSON.stringify(updates[key]);
      } else {
        fields[key] = updates[key];
      }
    }
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}/${id}`;

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

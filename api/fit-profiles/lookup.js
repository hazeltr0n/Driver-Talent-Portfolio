const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const FIT_PROFILES_TABLE = process.env.AIRTABLE_FIT_PROFILES_TABLE_ID || 'Fit Profiles';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { candidate_uuid, requisition_id } = req.query;

  if (!candidate_uuid || !requisition_id) {
    return res.status(400).json({ error: 'candidate_uuid and requisition_id required' });
  }

  try {
    const formula = encodeURIComponent(
      `AND({candidate_uuid} = "${candidate_uuid}", {requisition_id} = "${requisition_id}")`
    );
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(FIT_PROFILES_TABLE)}?filterByFormula=${formula}&maxRecords=1`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(404).json({ error: 'Fit profile not found' });
    }

    const record = data.records[0];
    res.status(200).json({
      id: record.id,
      ...record.fields,
      fit_dimensions: parseJSON(record.fields.fit_dimensions, []),
    });
  } catch (error) {
    console.error('Fit profile lookup error:', error);
    res.status(500).json({ error: error.message });
  }
}

function parseJSON(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
}

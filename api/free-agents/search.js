const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const FREE_AGENTS_TABLE_ID = process.env.AIRTABLE_FREE_AGENTS_TABLE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    // Search by name in the synced Free Agents table
    const formula = encodeURIComponent(`SEARCH(LOWER("${q}"), LOWER({fullName}))`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${FREE_AGENTS_TABLE_ID}?filterByFormula=${formula}&maxRecords=20`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }

    const data = await response.json();

    const results = data.records.map(r => ({
      synced_record_id: r.id,
      uuid: r.fields.uuid,
      fullName: r.fields.fullName,
      email: r.fields.email,
      phone: r.fields.phone,
      city: r.fields.city || r.fields.cityFromApplication,
      state: r.fields.state || r.fields.stateFromApplication,
      cdl_class: r.fields.cdl_class,
      years_experience: r.fields.years_experience,
    }));

    res.status(200).json({ results });
  } catch (error) {
    console.error('Free agents search error:', error);
    res.status(500).json({ error: error.message });
  }
}

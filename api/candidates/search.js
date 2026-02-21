const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  try {
    // Search by name (FIND is case-insensitive substring match)
    const formula = encodeURIComponent(`FIND(LOWER("${q}"), LOWER({fullName}))`);
    const fields = ['fullName', 'uuid', 'email', 'city', 'state'].map(f => `fields%5B%5D=${f}`).join('&');

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&${fields}&maxRecords=20`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }

    const data = await response.json();

    const candidates = data.records.map(r => ({
      id: r.id,
      uuid: r.fields.uuid,
      name: r.fields.fullName,
      email: r.fields.email,
      location: [r.fields.city, r.fields.state].filter(Boolean).join(', '),
    }));

    res.status(200).json({ candidates });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
}

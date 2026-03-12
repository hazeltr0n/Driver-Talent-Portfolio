// Search HubSpot contacts by name or email
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export default async function handler(req, res) {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  if (!HUBSPOT_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'HubSpot not configured' });
  }

  try {
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: 'email', operator: 'CONTAINS_TOKEN', value: `*${q}*` }
            ]
          },
          {
            filters: [
              { propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: `*${q}*` }
            ]
          },
          {
            filters: [
              { propertyName: 'lastname', operator: 'CONTAINS_TOKEN', value: `*${q}*` }
            ]
          },
          {
            filters: [
              { propertyName: 'company', operator: 'CONTAINS_TOKEN', value: `*${q}*` }
            ]
          }
        ],
        properties: ['email', 'firstname', 'lastname', 'company', 'jobtitle'],
        limit: 10,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('HubSpot search error:', err);
      return res.status(response.status).json({ error: err.message || 'HubSpot search failed' });
    }

    const data = await response.json();

    const contacts = data.results
      .filter(c => c.properties.email) // Only contacts with email
      .map(c => ({
        id: c.id,
        email: c.properties.email,
        firstName: c.properties.firstname || '',
        lastName: c.properties.lastname || '',
        name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || c.properties.email,
        company: c.properties.company || '',
        title: c.properties.jobtitle || '',
      }));

    res.status(200).json({ contacts });
  } catch (error) {
    console.error('HubSpot search error:', error);
    res.status(500).json({ error: error.message });
  }
}

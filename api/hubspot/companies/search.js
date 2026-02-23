const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    // HubSpot CRM search API with filter for customer/opportunity only
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/companies/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: q,
        limit: 20,
        properties: [
          'name',
          'domain',
          'phone',
          'city',
          'state',
          'country',
          'industry',
          'numberofemployees',
          'hubspot_owner_id',
          'lifecyclestage',
        ],
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'lifecyclestage',
                operator: 'IN',
                values: ['customer', 'opportunity'],
              },
              {
                propertyName: 'hubspot_team_id',
                operator: 'EQ',
                value: '58551370', // Employer Partnerships team
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HubSpot API error:', error);
      throw new Error(`HubSpot error: ${response.status}`);
    }

    const data = await response.json();

    const results = data.results.map(company => ({
      hubspot_company_id: company.id,
      name: company.properties.name,
      domain: company.properties.domain,
      phone: company.properties.phone,
      city: company.properties.city,
      state: company.properties.state,
      country: company.properties.country,
      industry: company.properties.industry,
      employees: company.properties.numberofemployees,
      owner_id: company.properties.hubspot_owner_id,
      lifecycle_stage: company.properties.lifecyclestage,
    }));

    res.status(200).json({ results });
  } catch (error) {
    console.error('HubSpot companies search error:', error);
    res.status(500).json({ error: error.message });
  }
}

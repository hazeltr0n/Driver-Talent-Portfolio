const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Company ID required' });
  }

  try {
    // Get company details
    const companyResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${id}?properties=name,domain,phone,zip,city,state,lifecyclestage,employer_enrichment_tier`,
      {
        headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
      }
    );

    if (!companyResponse.ok) {
      if (companyResponse.status === 404) {
        return res.status(404).json({ error: 'Company not found' });
      }
      throw new Error(`HubSpot error: ${companyResponse.status}`);
    }

    const company = await companyResponse.json();

    // Get associated contacts
    const contactsResponse = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${id}/associations/contacts`,
      {
        headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
      }
    );

    let mainContact = null;

    if (contactsResponse.ok) {
      const contactsData = await contactsResponse.json();

      // Get first contact's details if any exist
      if (contactsData.results && contactsData.results.length > 0) {
        const firstContactId = contactsData.results[0].id;

        const contactDetailResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${firstContactId}?properties=firstname,lastname,email,phone,mobilephone,jobtitle`,
          {
            headers: { 'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
          }
        );

        if (contactDetailResponse.ok) {
          const contact = await contactDetailResponse.json();
          mainContact = {
            id: contact.id,
            name: [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' '),
            email: contact.properties.email,
            phone: contact.properties.phone,
            mobile: contact.properties.mobilephone,
            title: contact.properties.jobtitle,
          };
        }
      }
    }

    res.status(200).json({
      hubspot_company_id: company.id,
      name: company.properties.name,
      domain: company.properties.domain,
      phone: company.properties.phone,
      zip: company.properties.zip,
      city: company.properties.city,
      state: company.properties.state,
      lifecycle_stage: company.properties.lifecyclestage,
      employer_enrichment_tier: company.properties.employer_enrichment_tier,
      main_contact: mainContact,
    });
  } catch (error) {
    console.error('HubSpot company fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}

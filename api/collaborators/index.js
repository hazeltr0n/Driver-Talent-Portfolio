const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const REQUISITIONS_TABLE = 'Job Requisitions';

// Static list of career agents with Airtable emails
const STATIC_AGENTS = [
  { name: 'Bianca Pottinger', email: 'bianca@freeworld.org' },
  { name: 'Chrissy Howard', email: 'chrissy@freeworld.org' },
  { name: 'Emmanuel Martinez', email: 'emmanuel@freeworld.org' },
  { name: 'James Hazelton', email: 'james@freeworld.org' },
  { name: "La'Wanda Olaniran", email: 'lawanda@freeworld.org' },
  { name: "O'Neal Heard", email: 'oneal@freeworld.org' },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Start with static agents - use email as ID for collaborator field
    const collaboratorsMap = new Map();

    for (const agent of STATIC_AGENTS) {
      collaboratorsMap.set(agent.email, {
        id: agent.email,
        email: agent.email,
        name: agent.name,
      });
    }

    // Also fetch any collaborators already assigned in Airtable
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}?fields[]=career_agent`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (response.ok) {
      const data = await response.json();

      for (const record of data.records) {
        const agent = record.fields.career_agent;
        if (agent && agent.id) {
          collaboratorsMap.set(agent.id, {
            id: agent.id,
            email: agent.email || '',
            name: agent.name || agent.email || 'Unknown',
          });
        }
      }
    }

    const collaborators = Array.from(collaboratorsMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({ collaborators });
  } catch (error) {
    console.error('Collaborators error:', error);
    res.status(500).json({ error: error.message });
  }
}

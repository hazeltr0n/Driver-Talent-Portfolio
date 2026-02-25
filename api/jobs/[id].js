const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const REQUISITIONS_TABLE = 'Job Requisitions';

const VALID_FIELDS = [
  'employer', 'location', 'yard_zip', 'hiring_radius', 'title', 'route_type', 'cdl_class',
  'min_experience_years', 'pay_min', 'pay_max', 'equipment_types',
  'home_time', 'touch_freight', 'endorsements_required', 'notes', 'status',
  'raw_description', 'received_date', 'filled_date', 'positions_available',
  'max_mvr_violations', 'max_accidents', 'career_agent_name'
];

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Job ID required' });
  }

  try {
    if (req.method === 'GET') {
      return await getJob(id, res);
    } else if (req.method === 'PATCH') {
      return await updateJob(id, req.body, res);
    } else if (req.method === 'DELETE') {
      return await deleteJob(id, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Job error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getJob(id, res) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${id}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return res.status(404).json({ error: 'Job not found' });
    }
    throw new Error(`Airtable error: ${response.status}`);
  }

  const record = await response.json();
  res.status(200).json({ id: record.id, ...record.fields });
}

async function updateJob(id, updates, res) {
  const fields = {};
  for (const key of VALID_FIELDS) {
    if (updates[key] !== undefined && updates[key] !== null && updates[key] !== '') {
      fields[key] = updates[key];
    }
  }

  // Handle career_agent - use collaborator field with email
  if (updates.career_agent !== undefined) {
    if (updates.career_agent && updates.career_agent.id) {
      const id = updates.career_agent.id;
      if (id.startsWith('usr')) {
        // Airtable user ID
        fields.career_agent = { id: id };
      } else if (id.includes('@')) {
        // Email address - Airtable accepts this for collaborator fields
        fields.career_agent = { email: id };
      } else {
        // Fallback to text field
        fields.career_agent_name = id;
      }
    } else {
      fields.career_agent = null;
    }
  }

  // Skip if no fields to update
  if (Object.keys(fields).length === 0) {
    return res.status(200).json({ id, message: 'No changes' });
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${id}`;

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

async function deleteJob(id, res) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(REQUISITIONS_TABLE)}/${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }

  res.status(200).json({ success: true });
}

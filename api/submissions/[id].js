const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const SUBMISSIONS_TABLE = 'Job Submissions';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Submission ID required' });
  }

  try {
    if (req.method === 'GET') {
      return await getSubmission(id, res);
    } else if (req.method === 'PATCH') {
      return await updateSubmission(id, req.body, res);
    } else if (req.method === 'DELETE') {
      return await deleteSubmission(id, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getSubmission(id, res) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}/${id}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    throw new Error(`Airtable error: ${response.status}`);
  }

  const record = await response.json();
  res.status(200).json({ id: record.id, ...record.fields });
}

async function updateSubmission(id, updates, res) {
  // Only allow certain fields to be updated
  const VALID_FIELDS = [
    'status', 'hire_date', 'rejection_reason', 'notes',
    'fit_score', 'fit_recommendation', 'fit_dimensions'
  ];

  const fields = {};
  for (const key of VALID_FIELDS) {
    if (updates[key] !== undefined) {
      // Handle fit_dimensions - store as JSON string if it's an array/object
      if (key === 'fit_dimensions' && typeof updates[key] !== 'string') {
        fields[key] = JSON.stringify(updates[key]);
      } else {
        fields[key] = updates[key];
      }
    }
  }

  // Handle career_agent - use collaborator field with email
  if (updates.career_agent !== undefined) {
    if (updates.career_agent && updates.career_agent.id) {
      const id = updates.career_agent.id;
      if (id.startsWith('usr')) {
        fields.career_agent = { id: id };
      } else if (id.includes('@')) {
        fields.career_agent = { email: id };
      } else {
        fields.career_agent_name = id;
      }
    } else {
      fields.career_agent = null;
    }
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}/${id}`;

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

async function deleteSubmission(id, res) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(SUBMISSIONS_TABLE)}/${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }

  res.status(200).json({ success: true });
}

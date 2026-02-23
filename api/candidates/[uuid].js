const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

export default async function handler(req, res) {
  const { uuid } = req.query;

  if (!uuid) {
    return res.status(400).json({ error: 'UUID required' });
  }

  try {
    if (req.method === 'GET') {
      return await getCandidate(uuid, res);
    } else if (req.method === 'PATCH') {
      return await updateCandidate(uuid, req.body, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Candidate error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getCandidate(uuid, res) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Airtable error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.records || data.records.length === 0) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  const record = data.records[0];
  res.status(200).json({ id: record.id, ...record.fields });
}

async function updateCandidate(uuid, updates, res) {
  // First get the record ID
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  const searchData = await searchResponse.json();

  if (!searchData.records || searchData.records.length === 0) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  const recordId = searchData.records[0].id;

  // Valid fields that can be updated
  // Keep in sync with AIRTABLE_SCHEMA.md
  const VALID_FIELDS = [
    // Basic Info
    'fullName', 'email', 'phone', 'city', 'state',
    // CDL/Professional
    'cdl_class', 'years_experience', 'endorsements',
    'equipment_experience', 'employment_history',
    // Preferences
    'zipcode', 'home_time_preference', 'shift_preference', 'willing_overtime',
    'max_commute_miles', 'min_weekly_pay', 'target_weekly_pay', 'willing_touch_freight',
    // Compliance/Safety
    'mvr_status', 'mvr_violations_3yr', 'mvr_accidents_3yr', 'mvr_suspensions_3yr',
    'mvr_last_pull', 'mvr_summary', 'medical_card_status',
    'clearinghouse_status', 'psp_crashes_5yr', 'psp_inspections_3yr', 'psp_driver_oos',
    // Training
    'training_school', 'training_location', 'training_graduated', 'training_hours',
    // AI Generated
    'ai_recruiter_notes', 'ai_narrative', 'ai_pull_quote',
    // Portfolio
    'portfolio_slug', 'portfolio_published',
    // Story
    'story_who_are_you', 'story_what_is_your_why', 'story_freeworld_journey',
    'story_why_trucking', 'story_looking_for', 'story_what_others_say',
    // Video
    'video_status', 'video_url', 'video_clips',
    // Status
    'placement_status',
  ];

  // Filter to only valid fields
  const fields = {};
  for (const key of VALID_FIELDS) {
    if (updates[key] !== undefined) {
      fields[key] = updates[key];
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
      }
    }
    // If null/empty, just don't include the field (Airtable doesn't like null for collaborators)
  }

  // Now update
  const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;

  const updateResponse = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Update failed: ${error}`);
  }

  const updated = await updateResponse.json();
  res.status(200).json({ id: updated.id, ...updated.fields });
}

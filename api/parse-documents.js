import OpenAI from 'openai';
import pdf from 'pdf-parse/lib/pdf-parse.js';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Valid Airtable fields that we can update
// Keep in sync with AIRTABLE_SCHEMA.md
const VALID_FIELDS = [
  // Contact
  'phone',
  // CDL/Professional
  'cdl_class', 'years_experience', 'endorsements',
  'equipment_experience', 'employment_history',
  // Preferences
  'home_time_preference', 'min_weekly_pay', 'target_weekly_pay', 'willing_touch_freight',
  // Compliance/Safety
  'mvr_status', 'mvr_violations_3yr', 'mvr_accidents_3yr', 'mvr_suspensions_3yr',
  'mvr_last_pull', 'mvr_summary', 'medical_card_status',
  'clearinghouse_status', 'psp_crashes_5yr', 'psp_violations_3yr', 'psp_driver_oos',
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

// Vercel serverless config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid, tenstreet, mvr, psp, clearinghouse } = req.body;

  if (!uuid) {
    return res.status(400).json({ error: 'UUID required' });
  }

  try {
    // Get existing record
    const record = await getRecordByUUID(uuid);
    if (!record) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const updates = {};

    // Parse each document if provided (base64 encoded)
    if (tenstreet) {
      console.log('Parsing Tenstreet...');
      const text = await extractTextFromPDF(tenstreet);
      const data = await parseTenstreet(text);
      // Only set fields if Tenstreet has actual data (don't overwrite with blanks)
      if (data.phone) updates.phone = data.phone;
      if (data.cdl_class) updates.cdl_class = data.cdl_class;
      if (data.endorsements) updates.endorsements = data.endorsements;
      if (data.years_experience) updates.years_experience = data.years_experience;
      if (data.employment_history?.length) updates.employment_history = JSON.stringify(data.employment_history);
      if (data.equipment_experience?.length) updates.equipment_experience = JSON.stringify(data.equipment_experience);
      // Training data
      if (data.training_school) updates.training_school = data.training_school;
      if (data.training_location) updates.training_location = data.training_location;
      if (data.training_graduated) updates.training_graduated = data.training_graduated;
      if (data.training_hours) updates.training_hours = data.training_hours;
      // Preferences
      if (data.home_time_preference) updates.home_time_preference = data.home_time_preference;
      if (data.min_weekly_pay) updates.min_weekly_pay = data.min_weekly_pay;
      if (data.willing_touch_freight) updates.willing_touch_freight = data.willing_touch_freight;
    }

    // Fallback to Free Agents lookup for training if Tenstreet didn't have it
    if (!updates.training_school && record.fields['Trucking School Name (from Free Agents - Linked)']?.[0]) {
      updates.training_school = record.fields['Trucking School Name (from Free Agents - Linked)'][0];
    }
    if (!updates.training_graduated && record.fields['CDL Month (from Free Agents - Linked)']?.[0]) {
      updates.training_graduated = record.fields['CDL Month (from Free Agents - Linked)'][0];
    }

    if (mvr) {
      console.log('Parsing MVR...');
      const text = await extractTextFromPDF(mvr);
      const data = await parseMVR(text);
      Object.assign(updates, data);
    }

    if (psp) {
      console.log('Parsing PSP...');
      const text = await extractTextFromPDF(psp);
      const data = await parsePSP(text);
      Object.assign(updates, data);
    }

    if (clearinghouse) {
      console.log('Parsing Clearinghouse...');
      const text = await extractTextFromPDF(clearinghouse);
      const data = await parseClearinghouse(text);
      Object.assign(updates, data);
    }

    // Generate AI content
    const combinedData = { ...record.fields, ...updates };

    console.log('Generating AI recruiter notes...');
    updates.ai_recruiter_notes = await generateRecruiterNotes(combinedData);
    // ai_narrative and ai_pull_quote are generated after video recording, not here

    // Set portfolio slug if not set
    if (!record.fields.portfolio_slug && record.fields.fullName) {
      updates.portfolio_slug = generateSlug(record.fields.fullName);
    }
    updates.portfolio_published = true;

    // Filter to only valid fields before saving
    const filteredUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (VALID_FIELDS.includes(key) && value !== undefined && value !== null) {
        filteredUpdates[key] = value;
      }
    }

    // Save to Airtable
    console.log('Saving to Airtable...', Object.keys(filteredUpdates));
    await updateRecord(record.id, filteredUpdates);

    const slug = updates.portfolio_slug || record.fields.portfolio_slug;
    const formUrl = `/form/${uuid}`;
    const recordUrl = `/record/${uuid}`;
    const portfolioUrl = `/portfolio/${slug}`;

    res.status(200).json({
      success: true,
      formUrl,
      recordUrl,
      portfolioUrl,
      slug,
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getRecordByUUID(uuid) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  const data = await response.json();
  return data.records?.[0] || null;
}

async function updateRecord(recordId, fields) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;

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

  return response.json();
}

async function extractTextFromPDF(base64) {
  const buffer = Buffer.from(base64, 'base64');
  const data = await pdf(buffer);
  return data.text;
}

async function parseTenstreet(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract structured info from this Tenstreet driver application. Return JSON:
{
  "phone": "phone number string or empty string",
  "cdl_class": "A or B",
  "endorsements": "comma-separated string, or 'None' if no endorsements",
  "license_number": "string",
  "license_state": "string",
  "license_expiration": "YYYY-MM-DD or null",
  "years_experience": number,
  "employment_history": [{"company": "", "role": "Company Driver", "tenure": "X months", "verified": true, "regulated": true}],
  "equipment_experience": [{"type": "equipment name", "level": "experience level"}],
  "training_school": "school name or empty string",
  "training_location": "city, state or empty string",
  "training_graduated": "YYYY-MM or empty string",
  "training_hours": number or 0,
  "home_time_preference": "Daily, Weekly, OTR, or Flexible",
  "min_weekly_pay": number or 0,
  "willing_touch_freight": "Very Light (No-Touch Freight), Light (Pallet Jack), Medium (Dolly/Liftgate), or Heavy (Very Physical Work)"
}

For equipment, extract ALL types with experience levels. Include: Tractor-Trailer, Box Truck, Straight Truck, Dry Van, Flatbed, Tanker, Reefer, End Dump, Forklift, Foodservice, etc.
Check BOTH the "Driving Experience" section AND the "Most common trailer" field in employment history.
Only include equipment where they have actual experience (not "None").

For home_time_preference, map: "Home Daily" -> "Daily", "Home Weekly" -> "Weekly", "OTR" -> "OTR", else "Flexible".
For min_weekly_pay, extract the lower bound from ranges like "$1,500-$2,000" -> 1500.
For willing_touch_freight, map answers like "Yes - load/unload cases with a dolly/forklift" -> "Medium (Dolly/Liftgate)".

Look for "Trucking School" section for training data.
Only return valid JSON.`,
      },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function parseMVR(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract MVR info. Return JSON:
{
  "mvr_status": "Clear" or "Has Violations",
  "mvr_violations_3yr": number,
  "mvr_accidents_3yr": number,
  "mvr_suspensions_3yr": number,
  "mvr_last_pull": "YYYY-MM-DD" (the report date/completion date),
  "medical_card_status": "Valid" or "Expired" or "Pending" (based on medical certificate expiration vs today)
}

Look for "MVR Request Completion Date" or "Completed:" for mvr_last_pull.
Look for "Medical Certificate Information" section - if expiration date is in the future and status is CERTIFIED, set to "Valid".
If no suspensions found, set mvr_suspensions_3yr to 0.
Only return valid JSON.`,
      },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function parsePSP(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract PSP info. Return JSON:
{
  "psp_crashes_5yr": number,
  "psp_violations_3yr": number (total violations from inspections, not number of inspections),
  "psp_driver_oos": number
}
Only return valid JSON.`,
      },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function parseClearinghouse(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract Clearinghouse status. Return JSON:
{
  "clearinghouse_status": "Not Prohibited" or "Prohibited"
}
Only return valid JSON.`,
      },
      { role: 'user', content: pdfText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function generateRecruiterNotes(driverData) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You're a trucking recruiter writing notes about a candidate. Write 3-4 sentences covering: safety record, experience level, work stability, key selling points. Be factual and concise. No bullet points.`,
      },
      { role: 'user', content: JSON.stringify(driverData, null, 2) },
    ],
    max_tokens: 300,
  });
  return response.choices[0].message.content;
}

function generateSlug(fullName) {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

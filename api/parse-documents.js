import OpenAI from 'openai';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Valid Airtable fields that we can update
// Keep in sync with AIRTABLE_SCHEMA.md
const VALID_FIELDS = [
  // CDL/Professional
  'cdl_class', 'years_experience', 'endorsements',
  'equipment_experience', 'employment_history',
  // Preferences
  'home_time_preference', 'min_weekly_pay', 'target_weekly_pay', 'willing_touch_freight',
  // Compliance/Safety
  'mvr_status', 'mvr_violations_3yr', 'mvr_accidents_3yr',
  'clearinghouse_status', 'psp_crashes_5yr', 'psp_inspections_3yr', 'psp_driver_oos',
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
      Object.assign(updates, {
        cdl_class: data.cdl_class,
        endorsements: data.endorsements,
        years_experience: data.years_experience,
        willing_touch_freight: data.willing_touch_freight,
        employment_history: JSON.stringify(data.employment_history || []),
        equipment_experience: JSON.stringify(data.equipment_experience || []),
      });
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
    const storyResponses = {
      whoAreYou: record.fields.story_who_are_you,
      whatIsYourWhy: record.fields.story_what_is_your_why,
      freeworldJourney: record.fields.story_freeworld_journey,
      whyTrucking: record.fields.story_why_trucking,
      lookingFor: record.fields.story_looking_for,
      whatOthersSay: record.fields.story_what_others_say,
    };

    const combinedData = { ...record.fields, ...updates };

    console.log('Generating AI content...');
    updates.ai_recruiter_notes = await generateRecruiterNotes(combinedData);
    updates.ai_narrative = await generateNarrative(combinedData, storyResponses);

    const pullQuote = await generatePullQuote(storyResponses);
    if (pullQuote) {
      updates.ai_pull_quote = pullQuote;
    }

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
    const portfolioUrl = `/portfolio/${slug}`;

    res.status(200).json({
      success: true,
      formUrl,
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
  // Use inner module directly to avoid debug mode check in index.js
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');

  const buffer = Buffer.from(base64, 'base64');
  const data = await pdfParse(buffer);
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
  "cdl_class": "A or B",
  "endorsements": "comma-separated string",
  "license_number": "string",
  "license_state": "string",
  "license_expiration": "YYYY-MM-DD or null",
  "years_experience": number,
  "willing_touch_freight": true/false (look for questions about loading/unloading, handling freight, physical labor),
  "employment_history": [{"company": "", "role": "Company Driver", "tenure": "X months", "verified": true, "regulated": true}],
  "equipment_experience": [{"type": "equipment name", "level": "experience level"}]
}

For touch freight: Look for questions like "Are you willing to load/unload?", "Touch freight?", "Physical requirements", etc. Default to true if not found.
For equipment, extract ALL types with experience levels. Include: Tractor-Trailer, Box Truck, Straight Truck, Dry Van, Flatbed, Tanker, Reefer, etc.
Only include equipment where they have actual experience (not "None").
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
  "mvr_accidents_3yr": number
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

async function parsePSP(pdfText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract PSP info. Return JSON:
{
  "psp_crashes_5yr": number,
  "psp_inspections_3yr": number,
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

async function generateNarrative(driverData, storyResponses) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Write a 4-5 sentence narrative about this driver for recruiters. Cover: background, why trucking, what they want in an employer, what makes them stand out. Third person, warm but professional. Use their story responses if available.`,
      },
      { role: 'user', content: `Driver: ${JSON.stringify(driverData)}\n\nStory: ${JSON.stringify(storyResponses || {})}` },
    ],
    max_tokens: 400,
  });
  return response.choices[0].message.content;
}

async function generatePullQuote(storyResponses) {
  if (!storyResponses || !Object.values(storyResponses).some(v => v)) return null;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract a compelling 1-2 sentence quote from the driver's story responses. Return just the quote text, no quotation marks.`,
      },
      { role: 'user', content: JSON.stringify(storyResponses) },
    ],
    max_tokens: 100,
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

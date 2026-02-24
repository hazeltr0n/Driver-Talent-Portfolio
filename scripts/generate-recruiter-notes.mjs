import 'dotenv/config';
import OpenAI from 'openai';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const uuid = process.argv[2];

if (!uuid) {
  console.error('Usage: node scripts/generate-recruiter-notes.mjs <uuid>');
  process.exit(1);
}

async function getCandidateByUUID(uuid) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  const data = await response.json();
  return data.records?.[0] || null;
}

async function updateCandidate(recordId, fields) {
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

function parseJSON(field, defaultValue = []) {
  if (!field) return defaultValue;
  try {
    return typeof field === 'string' ? JSON.parse(field) : field;
  } catch {
    return defaultValue;
  }
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

async function main() {
  console.log(`Fetching candidate ${uuid}...`);

  const candidate = await getCandidateByUUID(uuid);
  if (!candidate) {
    console.error('Candidate not found');
    process.exit(1);
  }

  console.log(`Found: ${candidate.fields.fullName}`);

  const driverData = {
    ...candidate.fields,
    employment_history: parseJSON(candidate.fields.employment_history, []),
    equipment_experience: parseJSON(candidate.fields.equipment_experience, []),
  };

  console.log('Generating AI recruiter notes...');
  const notes = await generateRecruiterNotes(driverData);

  console.log('\nGenerated notes:');
  console.log(notes);

  console.log('\nSaving to Airtable...');
  await updateCandidate(candidate.id, { ai_recruiter_notes: notes });

  console.log('Done!');
}

main().catch(console.error);

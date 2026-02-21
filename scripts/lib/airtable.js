import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

async function airtableFetch(endpoint, options = {}) {
  const response = await fetch(`${AIRTABLE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function findCandidateByName(fullName) {
  const formula = encodeURIComponent(`{fullName} = "${fullName}"`);
  const data = await airtableFetch(`/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`);
  return data.records?.[0] || null;
}

export async function findCandidateBySlug(slug) {
  const formula = encodeURIComponent(`{portfolio_slug} = "${slug}"`);
  const data = await airtableFetch(`/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`);
  return data.records?.[0] || null;
}

export async function findCandidateByUUID(uuid) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const data = await airtableFetch(`/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`);
  return data.records?.[0] || null;
}

export async function createCandidate(fields) {
  const data = await airtableFetch(`/${CANDIDATES_TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ fields }),
  });
  return data;
}

export async function updateCandidate(recordId, fields) {
  const data = await airtableFetch(`/${CANDIDATES_TABLE_ID}/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
  return data;
}

export async function upsertCandidate(fullName, fields) {
  const existing = await findCandidateByName(fullName);

  if (existing) {
    console.log(`Updating existing record for ${fullName} (${existing.id})`);
    return updateCandidate(existing.id, fields);
  } else {
    console.log(`Creating new record for ${fullName}`);
    return createCandidate({ fullName, ...fields });
  }
}

export function generateSlug(fullName) {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

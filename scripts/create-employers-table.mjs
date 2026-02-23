#!/usr/bin/env node

// Create Employers table in Airtable

import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing required environment variables. Check your .env file.');
  process.exit(1);
}

const TABLE_NAME = 'Employers';

const FIELDS = [
  { name: 'hubspot_company_id', type: 'singleLineText', description: 'HubSpot Company ID' },
  { name: 'name', type: 'singleLineText', description: 'Company name' },
  { name: 'domain', type: 'url', description: 'Website domain' },
  { name: 'phone', type: 'phoneNumber', description: 'Company phone' },
  { name: 'zip', type: 'singleLineText', description: 'Postal code' },
  { name: 'city', type: 'singleLineText', description: 'City' },
  { name: 'state', type: 'singleLineText', description: 'State' },
  { name: 'lifecycle_stage', type: 'singleSelect', options: { choices: [
    { name: 'customer', color: 'greenBright' },
    { name: 'opportunity', color: 'yellowBright' },
    { name: 'lead', color: 'grayBright' },
  ]}},
  { name: 'employer_enrichment_tier', type: 'singleSelect', options: { choices: [
    { name: 'Level 1 - Public Info', color: 'grayBright' },
    { name: 'Level 2 - FA Employer', color: 'blueBright' },
    { name: 'Level 3 - Recruiter-Level Knowledge', color: 'cyanBright' },
    { name: 'Level 4 - Partner Pilot', color: 'tealBright' },
    { name: 'Level 5 - Resilient Partner', color: 'greenBright' },
    { name: 'Level 6 - Paid Partner', color: 'purpleBright' },
  ]}},
  { name: 'main_contact_name', type: 'singleLineText', description: 'Main contact full name' },
  { name: 'main_contact_email', type: 'email', description: 'Main contact email' },
  { name: 'main_contact_phone', type: 'phoneNumber', description: 'Main contact phone' },
  { name: 'main_contact_mobile', type: 'phoneNumber', description: 'Main contact mobile' },
  { name: 'created_at', type: 'date', options: { dateFormat: { name: 'iso' }}},
];

async function createTable() {
  console.log(`Creating table "${TABLE_NAME}" with ${FIELDS.length} fields...\n`);

  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;

  const body = {
    name: TABLE_NAME,
    description: 'Employers synced from HubSpot for CAP requisitions',
    fields: FIELDS,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.error?.type === 'INVALID_REQUEST_DUPLICATE_TABLE_NAME') {
      console.log(`Table "${TABLE_NAME}" already exists.`);
      return;
    }
    console.error('Failed to create table:', data.error?.message || JSON.stringify(data));
    process.exit(1);
  }

  console.log(`✓ Table created successfully!`);
  console.log(`  Table ID: ${data.id}`);
  console.log(`  Fields: ${data.fields.length}`);
  console.log(`\nAdd this to your .env file:`);
  console.log(`AIRTABLE_EMPLOYERS_TABLE_ID=${data.id}`);
}

createTable().catch(console.error);

#!/usr/bin/env node
import 'dotenv/config';

// Fetch actual Airtable schema

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing required environment variables. Check your .env file.');
  process.exit(1);
}

async function main() {
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`, {
    headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` },
  });

  const data = await response.json();

  for (const table of data.tables) {
    console.log(`\n## ${table.name} (${table.id})\n`);
    console.log('| Field | Type | Options |');
    console.log('|-------|------|---------|');

    for (const field of table.fields) {
      let options = '';
      if (field.options?.choices) {
        options = field.options.choices.map(c => c.name).join(', ');
      }
      console.log(`| ${field.name} | ${field.type} | ${options} |`);
    }
  }
}

main().catch(console.error);

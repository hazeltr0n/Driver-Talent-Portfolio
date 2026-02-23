/**
 * Auth helpers for E2E testing
 *
 * Usage:
 *   node e2e/helpers/auth.js <employer_email>
 *
 * This will generate a JWT for testing employer portal flows
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function getEmployerByEmail(email) {
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const EMPLOYERS_TABLE_ID = process.env.AIRTABLE_EMPLOYERS_TABLE_ID || 'tbl9bxGlAKtQfnPhY';

  const formula = encodeURIComponent(`LOWER({main_contact_email}) = "${email.toLowerCase()}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${EMPLOYERS_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  const data = await response.json();
  return data.records?.[0] || null;
}

async function generateTestJWT(email) {
  const employer = await getEmployerByEmail(email);

  if (!employer) {
    console.error('Employer not found with email:', email);
    console.log('\nAvailable employers:');

    // List all employers
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Employers?maxRecords=10`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });
    const data = await response.json();

    data.records?.forEach(r => {
      console.log(`  - ${r.fields.name}: ${r.fields.main_contact_email}`);
    });

    process.exit(1);
  }

  const JWT_SECRET = process.env.JWT_SECRET;

  const token = jwt.sign({
    employer_id: employer.id,
    email: employer.fields.main_contact_email,
    employer_name: employer.fields.name,
  }, JWT_SECRET, { expiresIn: '24h' });

  console.log('\n=== Test JWT Generated ===\n');
  console.log('Employer:', employer.fields.name);
  console.log('Email:', employer.fields.main_contact_email);
  console.log('ID:', employer.id);
  console.log('\nJWT Token:\n');
  console.log(token);
  console.log('\n\nTo use in browser console:');
  console.log(`localStorage.setItem('employer_token', '${token}')`);
  console.log('\nThen refresh the page.');

  return token;
}

// Run if called directly
const email = process.argv[2];
if (email) {
  generateTestJWT(email);
} else {
  console.log('Usage: node e2e/helpers/auth.js <employer_email>');
  console.log('Example: node e2e/helpers/auth.js rod@lussiertrucking.com');
}

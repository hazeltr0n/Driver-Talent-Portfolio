#!/usr/bin/env node
/**
 * Seed Admin Users table in Airtable
 *
 * Usage: node scripts/seed-admin-users.mjs
 *
 * Prerequisites:
 * 1. Create "Admin Users" table in Airtable with fields:
 *    - email (Email, primary)
 *    - password_hash (Single line text)
 *    - name (Single line text)
 * 2. Set AIRTABLE_ADMIN_USERS_TABLE_ID in .env
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_ADMIN_USERS_TABLE_ID = process.env.AIRTABLE_ADMIN_USERS_TABLE_ID;

const INITIAL_PASSWORD = 'Coach123!';
const SALT_ROUNDS = 10;

const ADMIN_USERS = [
  { email: 'james@freeworld.org', name: 'James' },
  { email: 'chrissy@freeworld.org', name: 'Chrissy' },
  { email: 'lawanda@freeworld.org', name: 'Lawanda' },
  { email: 'emmanuel@freeworld.org', name: 'Emmanuel' },
  { email: 'oneal@freeworld.org', name: 'Oneal' },
  { email: 'bianca@freeworld.org', name: 'Bianca' },
];

async function main() {
  if (!AIRTABLE_API_KEY) {
    console.error('Error: AIRTABLE_API_KEY not set');
    process.exit(1);
  }
  if (!AIRTABLE_BASE_ID) {
    console.error('Error: AIRTABLE_BASE_ID not set');
    process.exit(1);
  }
  if (!AIRTABLE_ADMIN_USERS_TABLE_ID) {
    console.error('Error: AIRTABLE_ADMIN_USERS_TABLE_ID not set');
    console.error('Create an "Admin Users" table in Airtable first, then add its ID to .env');
    process.exit(1);
  }

  console.log('Hashing password...');
  const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, SALT_ROUNDS);
  console.log('Password hashed successfully');

  console.log('\nCreating admin users...');

  for (const user of ADMIN_USERS) {
    try {
      // Check if user already exists
      const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_ADMIN_USERS_TABLE_ID}?filterByFormula=${encodeURIComponent(`{email} = "${user.email}"`)}`;
      const checkRes = await fetch(checkUrl, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      const checkData = await checkRes.json();

      if (checkData.records && checkData.records.length > 0) {
        console.log(`  - ${user.email}: Already exists, skipping`);
        continue;
      }

      // Create new user
      const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_ADMIN_USERS_TABLE_ID}`;
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            email: user.email,
            password_hash: passwordHash,
            name: user.name,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error(`  - ${user.email}: Failed - ${JSON.stringify(err)}`);
      } else {
        console.log(`  - ${user.email}: Created successfully`);
      }
    } catch (err) {
      console.error(`  - ${user.email}: Error - ${err.message}`);
    }
  }

  console.log('\nDone! Users can now log in with:');
  console.log(`  Password: ${INITIAL_PASSWORD}`);
  console.log('\nRemember to remind users to change their password after first login.');
}

main();

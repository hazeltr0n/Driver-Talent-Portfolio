#!/usr/bin/env node
import 'dotenv/config';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !CANDIDATES_TABLE) {
  console.error('Missing required environment variables. Check your .env file.');
  process.exit(1);
}

const storyAnswers = {
  story_who_are_you: `I'm Larenzo Davis, 3 years behind the wheel and proud of every mile. I grew up in Dallas, and after some time away, I came back determined to build something real. Trucking gave me that shot. I'm a husband and father first, and this career lets me provide for my family while doing work I actually enjoy. I take pride in showing up on time, keeping my record clean, and treating every load like it matters - because it does.`,

  story_what_is_your_why: `My why is my family. Everything I do is to give them a better life than I had. When I got my CDL, it wasn't just a license - it was proof that I could turn my life around. Every day I'm on the road, I'm building toward something bigger. I want my kids to see that hard work and staying focused pays off, no matter where you started.`,

  story_freeworld_journey: `FreeWorld changed everything for me. Before the program, I had the drive but didn't know how to break into trucking the right way. They gave me structure, guidance, and people who actually believed in me. Getting my CDL through FreeWorld wasn't just training - it was a second chance. Now I've got 3 years of experience, a clean record, and a real career. I'm grateful every day.`,

  story_why_trucking: `I love the freedom. There's nothing like being out on the open road, knowing that you're responsible for getting the job done. I've worked with forklifts, box trucks, tractor-trailers - I enjoy learning new equipment and taking on different challenges. Trucking lets me see the country while earning an honest living. It's not just a job, it's a lifestyle I chose.`,

  story_looking_for: `I'm looking for a company that values loyalty and clear communication. I've had a few short stints, but when I find the right fit - like my 18 months at Million Dollar Rustic - I stay. I want somewhere that offers room to grow, treats drivers with respect, and keeps their word. I'm not afraid of hard work or touch freight. Just looking for a home where I can build my career long-term.`,

  story_what_others_say: `My dispatchers would tell you I'm reliable and easy to work with. I don't complain, I just get it done. At Million Dollar Rustic, they knew they could count on me for the tough runs. I communicate well, stay calm under pressure, and I've never had a safety incident. Coworkers say I'm the guy who shows up early and helps out without being asked.`
};

async function update() {
  // Get record ID first
  const formula = encodeURIComponent('SEARCH("larenzo", LOWER({fullName}))');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE}?filterByFormula=${formula}&maxRecords=1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
  });
  const data = await res.json();

  if (!data.records || data.records.length === 0) {
    console.log('Not found');
    return;
  }

  const recordId = data.records[0].id;
  console.log('Found record:', recordId);

  // Update with story answers
  const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE}/${recordId}`;
  const updateRes = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: storyAnswers })
  });

  if (updateRes.ok) {
    console.log('\n✓ Updated Larenzo Davis with story answers!\n');
    Object.entries(storyAnswers).forEach(([k, v]) => {
      console.log('---', k.replace('story_', '').replace(/_/g, ' ').toUpperCase(), '---');
      console.log(v);
      console.log('');
    });
  } else {
    const err = await updateRes.text();
    console.log('Error:', err);
  }
}

update();

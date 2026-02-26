// Conversational coaching chat for driver story video
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const QUESTIONS = {
  1: {
    title: 'Who are you?',
    prompt: 'Tell me about yourself',
    objective: `Show the human side - beyond what's on their resume. Employers want to see a real person.

You need TWO things:
1. Something personal - family, hobby, interest (doesn't need to be detailed, just real)
2. How they show up at work - one line is fine ("I'm the guy who...", "coworkers would say...")

If they give you both, you're done. Don't over-ask. "I go to the park with my daughter" is enough - you don't need to know what they do at the park.`,
  },
  2: {
    title: 'What is your why?',
    prompt: 'What drives you every day?',
    objective: `Show what motivates them.

You need: Who or what they're doing this for. Family, a goal, themselves - one clear answer is enough.`,
  },
  3: {
    title: 'Your turning point',
    prompt: 'Tell me about your journey and support system',
    objective: `Address their record and show they've changed.

You need: What's different now. Could be support system, mindset, what they have to lose. One or two things - don't ask for their whole life story.`,
  },
  4: {
    title: 'Why trucking?',
    prompt: 'What do you love about this career?',
    objective: `Show commitment to trucking as a career.

You need: Why trucking works for them. Independence, the work, the lifestyle - one genuine reason is enough.`,
  },
  5: {
    title: 'Your next chapter',
    prompt: 'What are you looking for in your next company?',
    objective: `Tell employers what matters to them.

You need: What they prioritize - safety, home time, equipment, respect. One or two things.`,
  },
  6: {
    title: 'Your message to employers',
    prompt: 'Thank them for watching and tell them why they should hire you',
    objective: `Close the sale.

You need: Why they're worth hiring. Their experience, their attitude, what they'll bring. Keep it simple.`,
  },
};

async function fetchCandidateData(uuid) {
  if (!uuid) return null;

  try {
    const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.records || data.records.length === 0) return null;

    return data.records[0].fields;
  } catch (err) {
    console.error('Failed to fetch candidate data:', err);
    return null;
  }
}

const SYSTEM_PROMPT = `You're an AI coach helping a driver record a strong video intro for employers.

## Your Job
Help them understand what the question is trying to accomplish, then get the specific info you need to write them personalized tips for their re-record.

## How to Talk
- Be direct and human. Not corporate, not scripted.
- Short messages. 2-3 sentences.
- One question at a time.
- Actually respond to what they say - don't just move to the next thing.

## The Flow
1. **Opening**: Acknowledge their attempt, explain what the question is trying to accomplish.
2. **Get what you need**: Ask for the missing pieces. ONE question at a time.
3. **Wrap up fast**: Once you have what the objective says you need, STOP. Don't dig for more detail than necessary. 2-3 exchanges max.

## Output Format (JSON)
Respond with this JSON structure:
{
  "message": "Your response",
  "readyForTips": false
}

Set readyForTips: true as soon as you have what the objective requires. Don't keep digging - wrap up and let them record.

## What You Need (varies by question)
You'll be told the question's objective. Get what the objective asks for - nothing more.

Don't over-ask. If the objective says you need "something personal about outside work" and they say "I go to the park with my daughter" - that's enough. You don't need to know what they do at the park.

"I'm a hard worker" is a bit generic, but "my coworkers struggle to keep up with me" is good enough. Don't ask for a whole story unless the objective requires it.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, transcript, questionNumber, candidateUuid } = req.body;

  if (!questionNumber) {
    return res.status(400).json({ error: 'questionNumber required' });
  }

  try {
    const q = QUESTIONS[questionNumber] || QUESTIONS[1];

    // Fetch candidate data for context
    const candidateData = candidateUuid ? await fetchCandidateData(candidateUuid) : null;

    // Build context about the candidate
    let candidateContext = '';
    if (candidateData) {
      const parts = [];
      if (candidateData.fullName) parts.push(`Name: ${candidateData.fullName}`);
      if (candidateData.city && candidateData.state) parts.push(`From: ${candidateData.city}, ${candidateData.state}`);
      if (candidateData.years_experience) parts.push(`${candidateData.years_experience} years driving experience`);
      if (candidateData.endorsements) parts.push(`Endorsements: ${candidateData.endorsements}`);
      if (parts.length > 0) {
        candidateContext = `\n\nCandidate background:\n${parts.join('\n')}`;
      }
    }

    // Build the conversation for the AI
    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Question: "${q.title}" - ${q.prompt}

OBJECTIVE FOR THIS QUESTION:
${q.objective}

Their recording attempt:
"${transcript || '(no transcript)'}"${candidateContext}

${messages && messages.length > 0 ? 'Continue the conversation.' : 'Start by acknowledging their attempt, explain what this question is trying to accomplish, then ask for what you need.'}`
      }
    ];

    // Add conversation history
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        aiMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.role === 'assistant'
            ? JSON.stringify({ message: msg.content, readyForTips: false })
            : msg.content
        });
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: aiMessages,
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Ensure required fields
    if (!result.message) {
      result.message = "Hey! I just watched your take. Tell me more about yourself - what's something you enjoy doing outside of work?";
    }
    if (typeof result.readyForTips !== 'boolean') {
      result.readyForTips = false;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Coaching chat error:', error);
    res.status(500).json({ error: error.message });
  }
}

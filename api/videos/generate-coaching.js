// Generate personalized coaching tips based on transcript, probing answers, and candidate data
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const QUESTIONS = {
  1: {
    title: 'Who are you?',
    focus: 'Hook the viewer with personality, make them see you as a relatable human with a life outside work, then tease with one reason why you\'re a good worker',
    relevantData: ['city', 'state'],
  },
  2: {
    title: 'What is your why?',
    focus: 'Show your values and what makes you tick - your goals, desires, the people you love',
    relevantData: [],
  },
  3: {
    title: 'Your turning point',
    focus: 'Show you\'ve moved past your background, explain what\'s changed, convince them you\'re reformed and won\'t go back',
    relevantData: [],
  },
  4: {
    title: 'Why trucking?',
    focus: 'Show commitment to trucking, respect for the work, and how it enables your goals',
    relevantData: [],
  },
  5: {
    title: 'Your next chapter',
    focus: 'Tell them what you want from them - emphasize safety and what matters to you. There is nothing wrong with being a career driver.',
    relevantData: [],
  },
  6: {
    title: 'Your message to employers',
    focus: 'Sell yourself humbly - why hire you, what sets you apart, your commitments',
    relevantData: ['years_experience', 'endorsements', 'cdl_class', 'equipment_experience'],
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

const SYSTEM_PROMPT = `You write video scripts for CDL drivers creating intro videos for employers.

## Your Task
Write a short, natural script they can read or use as a guide. Use:
1. The good parts from their first attempt
2. Personal details from their coaching chat
3. Background data if provided and relevant

## Output Format (JSON)
{
  "script": "The full script they can say, written in first person. 3-5 sentences max. Natural, conversational tone - not corporate or stiff."
}

## Guidelines
- Write in THEIR voice - casual, real, human
- Use their actual details (names, specifics they shared)
- Keep it SHORT - this is a 30-60 second video clip
- No filler phrases like "I would say that" or "I believe that"
- Start strong - no "Hi, my name is..." unless it fits the question
- Make it sound like something a real person would say, not a script`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript, probingAnswers, chatHistory, questionNumber, candidateUuid } = req.body;

  if (!questionNumber) {
    return res.status(400).json({ error: 'questionNumber required' });
  }

  try {
    const q = QUESTIONS[questionNumber] || QUESTIONS[1];

    // Fetch candidate data
    const candidateData = candidateUuid ? await fetchCandidateData(candidateUuid) : null;

    // Build candidate context - ONLY include data relevant to this question
    let candidateContext = '';
    if (candidateData && q.relevantData && q.relevantData.length > 0) {
      const contextParts = [];
      const relevant = q.relevantData;

      if (relevant.includes('fullName') && candidateData.fullName) {
        contextParts.push(`Name: ${candidateData.fullName}`);
      }
      if ((relevant.includes('city') || relevant.includes('state')) && candidateData.city && candidateData.state) {
        contextParts.push(`Location: ${candidateData.city}, ${candidateData.state}`);
      }
      if (relevant.includes('years_experience') && candidateData.years_experience) {
        contextParts.push(`Years driving: ${candidateData.years_experience}`);
      }
      if (relevant.includes('endorsements') && candidateData.endorsements) {
        contextParts.push(`Endorsements: ${candidateData.endorsements}`);
      }
      if (relevant.includes('equipment_experience') && candidateData.equipment_experience) {
        contextParts.push(`Equipment experience: ${candidateData.equipment_experience}`);
      }
      if (relevant.includes('cdl_class') && candidateData.cdl_class) {
        contextParts.push(`CDL Class: ${candidateData.cdl_class}`);
      }

      if (contextParts.length > 0) {
        candidateContext = `\n\nRelevant background data for this question:\n${contextParts.join('\n')}`;
      }
    }

    // Format probing answers OR chat history
    let probingContext = '';
    if (chatHistory && chatHistory.length > 0) {
      // Extract user messages from chat history
      const userMessages = chatHistory
        .filter(m => m.role === 'user')
        .map(m => m.content);
      if (userMessages.length > 0) {
        probingContext = `\n\nFrom their coaching chat:\n${userMessages.map(m => `- "${m}"`).join('\n')}`;
      }
    } else if (probingAnswers && Object.keys(probingAnswers).length > 0) {
      const answers = Object.values(probingAnswers).filter(a => a && a.trim());
      if (answers.length > 0) {
        probingContext = `\n\nTheir probing question answers:\n${answers.map((a, i) => `- "${a}"`).join('\n')}`;
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Question: "${q.title}"
Focus areas: ${q.focus}

Their first recording attempt:
"${transcript || '(no transcript available)'}"${probingContext}${candidateContext}

Write a short script for their next take.`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
    });

    const coaching = JSON.parse(response.choices[0].message.content);

    // Ensure we have the required fields
    if (!coaching.script) {
      coaching.script = "I'm [your name] from [your city]. Outside of work, I [what you do for fun or with family]. When I'm on the job, I'm the kind of person who [how you show up at work].";
    }

    res.status(200).json(coaching);
  } catch (error) {
    console.error('Generate coaching error:', error);
    res.status(500).json({ error: error.message });
  }
}

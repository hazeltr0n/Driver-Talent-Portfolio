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

const SYSTEM_PROMPT = `You are a career coach helping CDL drivers with criminal records create compelling video introductions for employers.

## Your Task
Generate personalized talking points for the driver's next recording attempt. Use:
1. What they said in their first attempt (keep the good parts)
2. Their answers to the probing questions (incorporate these)
3. ONLY use background data if it's marked as "relevant to this question"

## Output Format (JSON)
{
  "personalizedTips": [
    "✓ You said: [something good from their recording] - great!",
    "→ Also mention: [new thing based on probing answers]",
    "→ [Another personalized tip]"
  ],
  "suggestedOpening": "A natural opening sentence they could use"
}

## Guidelines
- Start tips with ✓ for things they did well, → for things to add
- Keep tips short and actionable (1 line each)
- The suggested opening should sound natural, not scripted
- Use their actual words and details whenever possible
- IMPORTANT: Only suggest mentioning background data (experience, endorsements, etc.) if it's provided AND relevant to this specific question
- Keep tips focused on THIS question's topic - don't suggest unrelated things
- 3-4 tips max
- Make it feel personal, not generic`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript, probingAnswers, questionNumber, candidateUuid } = req.body;

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

    // Format probing answers
    let probingContext = '';
    if (probingAnswers && Object.keys(probingAnswers).length > 0) {
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

Generate personalized tips for their next attempt.`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
    });

    const coaching = JSON.parse(response.choices[0].message.content);

    // Ensure we have the required fields
    if (!coaching.personalizedTips || coaching.personalizedTips.length === 0) {
      coaching.personalizedTips = [
        '→ Try mentioning where you\'re from',
        '→ Share something about yourself outside of work',
        '→ Tell them how you show up on the job',
      ];
    }

    res.status(200).json(coaching);
  } catch (error) {
    console.error('Generate coaching error:', error);
    res.status(500).json({ error: error.message });
  }
}

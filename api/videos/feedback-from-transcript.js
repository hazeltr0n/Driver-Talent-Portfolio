// Get coaching feedback from an already-transcribed clip
// Returns: status (good | needs_coaching | harmful), encouragement, probingQuestions, etc.
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const QUESTIONS = {
  1: {
    title: 'Who are you?',
    weSuggested: 'Name, where from, things they enjoy outside work that show personality, what kind of person/worker they are',
    keyElements: ['name and where they\'re from', 'personal interests/hobbies that show personality', 'relatable human details', 'quick mention about work ethic'],
    probingQuestions: [
      'What do you enjoy doing when you\'re not working?',
      'What would your friends or family say you\'re like?',
      'What about you makes you a good worker?',
    ],
  },
  2: {
    title: 'What is your why?',
    weSuggested: 'Who or what they\'re doing this for, what they\'re working toward (goals), what motivates them',
    keyElements: ['clear motivation (who or what they\'re working for)', 'authentic passion/drive', 'relatable goals'],
    probingQuestions: [
      'Who are you doing this for?',
      'What does success look like for you in 5 years?',
      'If someone says the word love, what is the first thing you think about?',
    ],
  },
  3: {
    title: 'Your turning point',
    weSuggested: 'Brief acknowledgment of past, what\'s different now (support system, FreeWorld, family), why they won\'t go back, why they\'re ready',
    keyElements: ['acknowledges past without dwelling', 'accepts personal responsibility (doesn\'t blame circumstances)', 'strong support system', 'clear reason they won\'t reoffend', 'forward-looking and ready'],
    probingQuestions: [
      'What support do you have now that you didn\'t have before?',
      'What\'s different about your life that makes you confident you won\'t go back?',
    ],
  },
  4: {
    title: 'Why trucking?',
    weSuggested: 'Why they\'re proud to be a driver, why trucking fits them, how this career enables them to build the life they want',
    keyElements: ['respect/pride for the industry', 'why trucking fits them personally', 'connection to their life goals'],
    probingQuestions: [
      'What do you respect about trucking as a profession?',
      'How does this career help you achieve your goals?',
      'What do you love most about the idea of being a driver?',
    ],
  },
  5: {
    title: 'Your next chapter',
    weSuggested: 'What matters most in a company (safety, respect, equipment, home time), the culture they thrive in, what growth looks like long-term',
    keyElements: ['clear priorities (especially safety)', 'specific about what they want', 'growth mindset'],
    probingQuestions: [
      'What\'s the most important thing you look for in a company?',
      'Where do you see yourself growing in this career?',
    ],
  },
  6: {
    title: 'Your message to employers',
    weSuggested: 'Thank them, why they\'re worth hiring (what sets them apart), their commitment to equipment/customers/reputation',
    keyElements: ['gratitude', 'clear value proposition', 'specific commitments', 'confident but humble'],
    probingQuestions: [
      'What makes you stand out from other candidates?',
      'What can you promise an employer who takes a chance on you?',
    ],
  },
};

const SYSTEM_PROMPT = `You are evaluating video intro recordings from CDL drivers with criminal records seeking employment.

## Your Role
Analyze the transcript and determine if the answer:
1. Is GOOD TO GO - covers key elements, positive/professional tone
2. NEEDS COACHING - missing key elements or could be stronger with more specifics
3. HARMFUL - contains content that would hurt their employment chances

## What Makes an Answer "Good"
- Covers at least 2-3 of the key elements for the question
- Positive, forward-looking tone
- Shows genuine personality
- Appropriate length (not too short, not rambling)

## What Triggers "Needs Coaching"
- Missing key elements (e.g., no work ethic mention in Q1)
- Too short or vague (under 15 seconds worth)
- Could be much stronger with more specifics
- Underselling themselves

## What Triggers "Harmful" (BLOCKS PROGRESS)
These are red flags that would make employers say "no":
- Blaming others for their situation ("the system," "they set me up")
- Negative comments about past employers, coworkers, or supervisors
- Over-sharing incarceration details inappropriately (dwelling on crime, being graphic)
- Expressions of anger, resentment, or lack of accountability
- Victim mentality
- Anything unprofessional or concerning

## Response Format (JSON)
{
  "status": "good" | "needs_coaching" | "harmful",
  "encouragement": "Brief positive feedback (1 sentence)",
  "probingQuestions": ["Question 1?", "Question 2?"] // Only for needs_coaching, help draw out better content
  "harmfulReason": "negative_about_employer" | "blaming_others" | "oversharing" | "unprofessional" | null,
  "harmfulMessage": "Message to show user if harmful" | null
}

## Important Notes
- Drivers aren't expected to be polished speakers - don't be too picky
- Focus on substance, not delivery
- If in doubt between "good" and "needs_coaching", lean toward "good" but offer encouragement
- Only use "harmful" for genuine red flags, not just weak answers`;

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript, questionNumber, candidateUuid } = req.body;

  if (!transcript || !questionNumber) {
    return res.status(400).json({ error: 'transcript and questionNumber required' });
  }

  try {
    const q = QUESTIONS[questionNumber] || QUESTIONS[1];

    // Fetch candidate data for context
    const candidateData = candidateUuid ? await fetchCandidateData(candidateUuid) : null;

    // Build context about the candidate
    let candidateContext = '';
    if (candidateData) {
      const contextParts = [];
      if (candidateData.years_experience) contextParts.push(`${candidateData.years_experience} years driving experience`);
      if (candidateData.city && candidateData.state) contextParts.push(`from ${candidateData.city}, ${candidateData.state}`);
      if (candidateData.endorsements) contextParts.push(`endorsements: ${candidateData.endorsements}`);
      if (candidateData.equipment_experience) contextParts.push(`equipment: ${candidateData.equipment_experience}`);
      if (contextParts.length > 0) {
        candidateContext = `\n\nCandidate background: ${contextParts.join(', ')}`;
      }
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Question: "${q.title}"
We suggested they mention: ${q.weSuggested}
Key elements we're looking for: ${q.keyElements.join(', ')}${candidateContext}

Their answer:
"${transcript}"

Evaluate this answer and respond with JSON.`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const feedback = JSON.parse(response.choices[0].message.content);

    // Ensure probingQuestions is included for needs_coaching
    if (feedback.status === 'needs_coaching' && (!feedback.probingQuestions || feedback.probingQuestions.length === 0)) {
      feedback.probingQuestions = q.probingQuestions;
    }

    res.status(200).json(feedback);
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get coaching feedback from an already-transcribed clip
// Returns: status (good | needs_coaching | harmful), encouragement, probingQuestions, etc.
import { openai, CONTEXT, QUESTIONS, fetchCandidateData, buildCandidateContext } from './coaching-shared.js';

const SYSTEM_PROMPT = `${CONTEXT}

## Your Role
You evaluate their recording and determine if it's ready or needs more work.

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
    const candidateContext = buildCandidateContext(candidateData, q.relevantData || []);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Question: "${q.title}"
Focus: ${q.focus}
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

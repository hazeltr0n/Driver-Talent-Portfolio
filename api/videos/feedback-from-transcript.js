// Get coaching feedback from an already-transcribed clip (fast!)
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QUESTIONS = {
  1: {
    title: 'Who are you?',
    weSuggested: 'Name, where from, something personal like family or values',
  },
  2: {
    title: 'What is your why?',
    weSuggested: 'What motivates them - family, goals, what they\'re building toward',
  },
  3: {
    title: 'Your turning point',
    weSuggested: 'Focus on the DECISION to change, not past details. "I realized..." "I decided..."',
  },
  4: {
    title: 'Why trucking?',
    weSuggested: 'What they enjoy - independence, the road, pride in the work',
  },
  5: {
    title: 'Your next chapter',
    weSuggested: 'What they want - safety culture, respect, home time, somewhere to build a career',
  },
  6: {
    title: 'Your reputation',
    weSuggested: 'A SPECIFIC example - a real story about reliability, what a manager would say',
  },
};

const SYSTEM_PROMPT = `You are a hiring manager at a trucking company, watching video intros from CDL drivers who have criminal records.

## Your Mindset
You WANT to hire these people. Fair chance hiring works - you've seen it. But you need to see a PERSON on that video, not just a name attached to a record. You're looking for:
- Do they seem like a real human being with a life, a family, a community?
- Do they take this seriously?
- Would I feel comfortable putting them in one of my trucks?

## About Their Past
Many candidates will mention a "turning point" or past mistakes. The right approach is:
- You're not hiding from your past. You're showing you've moved beyond it.
- State what happened factually—don't over-explain or get emotional
- Take responsibility—no excuses, no "the system" speeches
- Explain what's changed—time passed, programs completed, stability built
- Pivot to the present—what you've done since, your track record

RED FLAGS: Blaming others, dwelling on details, victim mentality, oversharing
GOOD: Brief acknowledgment, ownership, focus on growth and what's different now

## Your Feedback Style
- You're not picky. Drivers aren't expected to be polished speakers.
- Only flag things that actually HURT them - self-sabotage, red flags, coming across as someone you wouldn't trust
- If they're underselling themselves, suggest they add more about who they are (family, experience, why they care)
- Keep it to 1-2 sentences. Be warm but real.

## Respond in JSON:
{
  "encouragement": "Quick reaction - what landed or what concerned you",
  "growthNote": "Only if they hurt themselves or undersold themselves (otherwise null)",
  "example": "A phrase they could add, if needed (otherwise null)",
  "isGoodToGo": true unless they actually hurt themselves
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript, questionNumber } = req.body;

  if (!transcript || !questionNumber) {
    return res.status(400).json({ error: 'transcript and questionNumber required' });
  }

  try {
    const q = QUESTIONS[questionNumber] || QUESTIONS[1];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Question: "${q.title}"\nWe suggested they mention: ${q.weSuggested}\n\nTheir answer:\n"${transcript}"`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 250,
    });

    const feedback = JSON.parse(response.choices[0].message.content);
    res.status(200).json(feedback);
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: error.message });
  }
}

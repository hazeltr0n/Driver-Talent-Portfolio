// Get coaching feedback on a recorded clip
import OpenAI from 'openai';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QUESTION_CONTEXT = {
  1: { title: 'Who are you?', prompt: 'Tell me about yourself' },
  2: { title: 'What is your why?', prompt: 'What drives you every day?' },
  3: { title: 'Your turning point', prompt: 'Tell me about a turning point in your life' },
  4: { title: 'Why trucking?', prompt: 'What do you love about this career?' },
  5: { title: 'Your next chapter', prompt: 'What are you looking for in your next company?' },
  6: { title: 'Your reputation', prompt: 'What would a former manager or dispatcher say about you?' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clipUrl, questionNumber } = req.body;

  if (!clipUrl || !questionNumber) {
    return res.status(400).json({ error: 'clipUrl and questionNumber required' });
  }

  try {
    // Quick transcribe with Deepgram
    const transcript = await transcribeClip(clipUrl);

    if (!transcript || transcript.length < 10) {
      return res.status(200).json({
        transcript: transcript || '',
        feedback: {
          encouragement: "I couldn't hear much there. Let's try again - find a quiet spot and speak clearly into the camera.",
          suggestion: null,
          example: null,
          shouldRetry: true,
        },
      });
    }

    // Get coaching feedback from OpenAI
    const question = QUESTION_CONTEXT[questionNumber];
    const feedback = await getCoachingFeedback(transcript, question, questionNumber);

    res.status(200).json({
      transcript,
      feedback,
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function transcribeClip(clipUrl) {
  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: clipUrl }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram error: ${error}`);
  }

  const data = await response.json();
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
}

async function getCoachingFeedback(transcript, question, questionNumber) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a warm, encouraging career coach helping a truck driver record a video story for potential employers. You deeply care about their success.

The driver just answered: "${question.title}" (${question.prompt})

Your job is to give brief, encouraging feedback. Remember:
- These are often people with second-chance backgrounds - be supportive, not judgmental
- Focus on what they did WELL first
- Be genuine and human, not corporate
- Keep feedback SHORT (2-3 sentences max per section)
- If they went off-topic, gently guide them back
- Never criticize their speaking style or filler words

Respond in JSON format:
{
  "encouragement": "What they did well (1-2 sentences, be specific)",
  "growthNote": "One gentle suggestion to make it even stronger (optional, only if truly needed)",
  "example": "A brief example phrase they could incorporate - but tell them to use their own words (optional)",
  "isGoodToGo": true/false - true if the answer is solid enough to keep
}`
      },
      {
        role: 'user',
        content: `Here's what they said:\n\n"${transcript}"`
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 300,
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch {
    return {
      encouragement: "Good effort! Let's keep building on that.",
      growthNote: null,
      example: null,
      isGoodToGo: true,
    };
  }
}

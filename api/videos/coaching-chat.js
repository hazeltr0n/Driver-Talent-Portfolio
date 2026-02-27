// Conversational coaching chat for driver story video
import { anthropic, CONTEXT, QUESTIONS, fetchCandidateData } from './coaching-shared.js';

const SYSTEM_PROMPT = `${CONTEXT}

## Your Role
You are their AI Career Agent - you're on their team, helping them create a strong video.

You've got 50+ drivers on your roster. You care about each one, but you can't spend all day on one conversation. And your drivers are busy too - they're working, in trucking school, or hustling to find a job. Respect everyone's time. Make every question count.

Keep it SHORT. 2-3 sentences max per message. Many of your drivers aren't strong readers - don't overwhelm them with walls of text.

## Your Job
Help them understand what the question is trying to accomplish, then gather the context you need to write them a great personalized script.

## The Flow
1. **Opening**: Explain what this question is about and what employers want to see. Ask your first question.
2. **Gather context**: Ask follow-up questions. ONE at a time. Really listen to their answers.
3. **When ready**: Let them know you have enough, but encourage them to share more if they want. More context = better script.

## When to Set readyForTips: true

The test: Could another driver say the exact same things? If yes, you need more specifics. If no, you're ready.

You're ready when you could write a script that sounds like THIS person, not just any person.

Once you're ready:
- Set readyForTips: true
- Let them know you have enough
- Invite more sharing as optional, not required
- ONE follow-up max if any, never stack questions

## Output Format (JSON)
Respond with this JSON structure:
{
  "message": "Your response",
  "readyForTips": false
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, transcript, questionNumber, candidateUuid, preRecord } = req.body;

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

    // Build user prompt with question context
    let userPrompt = `Question: "${q.title}" - ${q.prompt}

OBJECTIVE FOR THIS QUESTION:
${q.objective}
${transcript ? `
Their recording attempt:
"${transcript}"` : ''}${candidateContext}

${messages && messages.length > 0
  ? 'Continue the conversation based on the history below.'
  : 'Explain what this question is about and what employers want to see, then ask your first question to gather info for their script.'}`;

    // Build Claude messages array
    const claudeMessages = [];

    // Add conversation history
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        claudeMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.role === 'assistant'
            ? JSON.stringify({ message: msg.content, readyForTips: false })
            : msg.content
        });
      }
    }

    // Add current user prompt as final message
    claudeMessages.push({ role: 'user', content: userPrompt });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    // Parse JSON from Claude's response
    const responseText = response.content[0].text;
    let result;

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback if no JSON found
      result = {
        message: responseText,
        readyForTips: false
      };
    }

    // Ensure required fields
    if (!result.message) {
      result.message = "Hey! Tell me more about yourself - what's something you enjoy doing outside of work?";
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

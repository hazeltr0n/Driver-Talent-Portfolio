// Generate personalized script from form answers, transcripts, and candidate data
import { anthropic, CONTEXT, QUESTIONS, COACHING_FORMS, fetchCandidateData } from './coaching-shared.js';

const SYSTEM_PROMPT = `${CONTEXT}

## Your Role
You create conversational talking points that guide the driver on what to say while recording. These should be natural prompts that feel like a friend reminding them what to cover.

## Your Task
Generate 3-5 talking points as conversational sentences. Each one tells them what to say next, using THEIR specific details to make it personal.

## Output Format (JSON)
{
  "talkingPoints": [
    "First thing to cover...",
    "Then talk about...",
    "etc."
  ]
}

## Examples

**Question 1 (Who are you?):**
If they said: name is Marcus, from Dallas TX, 5 years experience, hobbies are fishing and Cowboys football, daughter Kayla age 11 plays soccer, coworkers say he shows up early

GOOD talking points:
- "Say your name, that you're from Dallas, and you've been driving for 5 years."
- "Talk about how you love fishing and watching the Cowboys on Sundays."
- "Mention your daughter Kayla - she's 11 and plays soccer."
- "Share that coworkers say you're the guy who shows up early and stays late."

**Question 2 (What is your why?):**
If they said: doing this for wife Maria and kids, saving for a house, wants to give them stability

GOOD talking points:
- "Talk about Maria and the kids - they're your why."
- "Share your goal of buying a house and giving your family stability."
- "Explain what keeps you motivated when the work gets tough."

**Question 3 (Turning point):**
If they said: made mistakes 8 years ago, learned accountability, FreeWorld helped, now has too much to lose

GOOD talking points:
- "Acknowledge what happened - 8 years ago you made some mistakes."
- "Share what you learned and how you've changed."
- "Give FreeWorld a shoutout for helping you get here."
- "Talk about what you have now that you'd never risk losing."

## Rules
- ONLY use details they actually provided - never invent names, ages, places, or specifics
- Write as natural sentences, like you're coaching them: "Talk about..." or "Share how..." or "Mention that..."
- Include their specific details: names, places, numbers, teams, etc.
- Keep each point to 1-2 sentences max
- Organize in a natural speaking flow
- For Q6 (closing): tie back to their WHY from earlier - hiring them helps them achieve their goals`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    transcript,           // Current question's transcript attempt (if any)
    formAnswers,          // Current question's form answers { 0: "...", 1: "...", 2: "..." }
    allFormAnswers,       // All previous questions' form answers { 1: {...}, 2: {...}, ... }
    allTranscripts,       // All previous transcripts { 1: "...", 2: "...", ... }
    questionNumber,
    candidateUuid,
    // Legacy support
    probingAnswers,
    chatHistory,
  } = req.body;

  if (!questionNumber) {
    return res.status(400).json({ error: 'questionNumber required' });
  }

  try {
    const q = QUESTIONS[questionNumber] || QUESTIONS[1];
    const form = COACHING_FORMS[questionNumber] || COACHING_FORMS[1];

    // Fetch candidate data
    const candidateData = candidateUuid ? await fetchCandidateData(candidateUuid) : null;

    // Build ALL candidate context
    let candidateContext = '';
    if (candidateData) {
      const parts = [];
      if (candidateData.fullName) parts.push(`Name: ${candidateData.fullName}`);
      if (candidateData.city && candidateData.state) parts.push(`From: ${candidateData.city}, ${candidateData.state}`);
      if (candidateData.years_experience) parts.push(`${candidateData.years_experience} years driving experience`);
      if (candidateData.endorsements) parts.push(`Endorsements: ${candidateData.endorsements}`);
      if (candidateData.cdl_class) parts.push(`CDL Class: ${candidateData.cdl_class}`);
      if (parts.length > 0) {
        candidateContext = `\n\nCandidate background:\n${parts.join('\n')}`;
      }
    }

    // Build context from ALL previous questions
    let previousContext = '';
    if (allFormAnswers || allTranscripts) {
      const prevParts = [];
      for (let i = 1; i < questionNumber; i++) {
        const prevQ = QUESTIONS[i];
        const prevForm = COACHING_FORMS[i];
        const prevAnswers = allFormAnswers?.[i];
        const prevTranscript = allTranscripts?.[i];

        if (prevAnswers || prevTranscript) {
          let qContext = `\n### Q${i}: ${prevQ.title}`;
          if (prevTranscript) {
            qContext += `\nTheir recording: "${prevTranscript}"`;
          }
          if (prevAnswers) {
            const answerPairs = prevForm.questions.map((question, idx) => {
              const answer = prevAnswers[idx];
              return answer ? `- ${question}\n  "${answer}"` : null;
            }).filter(Boolean);
            if (answerPairs.length > 0) {
              qContext += `\nTheir answers:\n${answerPairs.join('\n')}`;
            }
          }
          prevParts.push(qContext);
        }
      }
      if (prevParts.length > 0) {
        previousContext = `\n\n## What you know from previous questions:${prevParts.join('')}`;
      }
    }

    // Build current question's form answers
    let currentFormContext = '';
    let useNoShareFallback = false;

    if (formAnswers && Object.keys(formAnswers).length > 0) {
      const answerPairs = [];

      form.questions.forEach((question, idx) => {
        const answer = formAnswers[idx];
        if (!answer) return;

        const questionText = typeof question === 'string' ? question : question.text;

        // Check if this is Q3 and they said no to sharing specifics
        if (questionNumber === 3 && idx === 0) {
          const lowerAnswer = answer.toLowerCase();
          if (lowerAnswer.includes('no') && !lowerAnswer.includes('yes')) {
            useNoShareFallback = true;
            return; // Don't include the yes/no answer itself
          }
        }

        answerPairs.push(`- ${questionText}\n  "${answer}"`);
      });

      if (answerPairs.length > 0) {
        currentFormContext = `\n\nTheir answers for this question:\n${answerPairs.join('\n')}`;
      }

      // Add fallback instruction for Q3 if they don't want to share specifics
      if (useNoShareFallback && form.noShareFallback) {
        currentFormContext += `\n\nIMPORTANT: They chose not to share specifics about their charges. Use this general language instead: "${form.noShareFallback}" Then continue with what they learned and their turning point.`;
      }
    }

    // Legacy: support old chat history format
    let legacyContext = '';
    if (!formAnswers && chatHistory && chatHistory.length > 0) {
      const formattedChat = chatHistory.map(m => {
        const role = m.role === 'assistant' ? 'Coach' : 'Driver';
        return `${role}: "${m.content}"`;
      });
      legacyContext = `\n\nCoaching conversation:\n${formattedChat.join('\n')}`;
    } else if (!formAnswers && probingAnswers && Object.keys(probingAnswers).length > 0) {
      const answers = Object.values(probingAnswers).filter(a => a && a.trim());
      if (answers.length > 0) {
        legacyContext = `\n\nTheir probing answers:\n${answers.map(a => `- "${a}"`).join('\n')}`;
      }
    }

    const userPrompt = `Question ${questionNumber}: "${q.title}"
Focus: ${q.focus}${q.scriptRequired ? `\nRequired: ${q.scriptRequired}` : ''}${form.scriptMustInclude ? `\nMUST INCLUDE: ${form.scriptMustInclude}` : ''}
${candidateContext}${previousContext}
${transcript ? `\nTheir recording attempt for this question:\n"${transcript}"` : ''}${currentFormContext}${legacyContext}

Generate conversational talking points for this question. Use all their specific details - names, places, numbers. Each point should guide them on what to say next.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Parse JSON from Claude's response
    const responseText = response.content[0].text;
    let coaching;

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      coaching = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback if no JSON found
      coaching = { talkingPoints: [responseText] };
    }

    // Ensure we have the required fields
    if (!coaching.talkingPoints || !Array.isArray(coaching.talkingPoints)) {
      coaching.talkingPoints = [
        "Say your name and where you're from.",
        "Talk about what you like to do outside of work.",
        "Mention who's important in your life.",
        "Share how your coworkers would describe you.",
      ];
    }

    res.status(200).json(coaching);
  } catch (error) {
    console.error('Generate coaching error:', error);
    res.status(500).json({ error: error.message });
  }
}

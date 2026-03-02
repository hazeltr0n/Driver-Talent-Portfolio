// Generate personalized script from form answers, transcripts, and candidate data
import { anthropic, CONTEXT, QUESTIONS, COACHING_FORMS, fetchCandidateData } from './coaching-shared.js';

const SYSTEM_PROMPT = `${CONTEXT}

## Your Role
You create talking points for the driver to reference while recording. NOT a script - just short bullet points with their key details organized in a natural flow.

## Your Task
Generate 4-5 short bullet points they can glance at while speaking. Each bullet should be a quick reminder of something THEY told you - not your words, their details.

## Output Format (JSON)
{
  "talkingPoints": [
    "Short bullet with their detail",
    "Another bullet",
    "etc."
  ]
}

## Examples

If they said: hobbies are fishing and football, daughter Kayla age 11 plays soccer, coworkers say I show up early

GOOD talking points:
- "Name + where you're from"
- "Outside work: fishing, football on Sundays"
- "Daughter Kayla, 11, plays soccer"
- "Coworkers say: shows up early, reliable"

BAD (too scripted, too wordy):
- "Talk about how you enjoy fishing in your spare time and watching football games"
- "Mention your daughter Kayla who is 11 years old and plays soccer as a midfielder"

Keep bullets SHORT. Just enough to jog their memory. They'll say it in their own words.

## Rules
- ONLY use details they actually gave you
- Never invent names, ages, teams, places, or specifics
- Keep each bullet under 10 words
- Organize in a natural flow for speaking
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

Write a script for this question. Use all the context you have about this person - names, details, stories from any question. Paint a picture the employer can visualize.`;

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
        "Your name + where you're from",
        "What you do outside of work",
        "Who matters to you",
        "How you show up at work",
      ];
    }

    res.status(200).json(coaching);
  } catch (error) {
    console.error('Generate coaching error:', error);
    res.status(500).json({ error: error.message });
  }
}

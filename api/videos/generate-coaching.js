// Generate personalized script from form answers, transcripts, and candidate data
import { anthropic, CONTEXT, QUESTIONS, COACHING_FORMS, fetchCandidateData } from './coaching-shared.js';

const SYSTEM_PROMPT = `${CONTEXT}

## Your Role
You write scripts for the driver to use as a guide when recording.

## Your Task
Write a script they can read/reference while recording. Each question has about 60 seconds.

The goal isn't brevity - it's helping the employer SEE this person. At their job. At home with their family. As a real human they'd want on their team.

Use ONLY what they actually told you. Don't add details, don't infer specifics, don't embellish. If they said "I like football" write "I like football" - don't assume a team. If they said "my kids" don't add names or ages they didn't give you.

You have context from earlier questions, but don't repeat it all in every answer. Each question has its own scope and objective. A brief callback is fine ("like I said, my daughter is everything to me") but don't stuff every script with the same details. Focus on THIS question's objective.

## Output Format (JSON)
{
  "script": "The script in first person. Use their actual words and details. Can be several sentences - they have 60 seconds."
}

## Voice Examples

If they gave you details (daughter Kayla, age 11, soccer, guitar for 2 years):
GOOD: "I'm Marcus, from Dallas. When I'm not driving, I'm usually playing guitar - been learning for about two years now - or watching my daughter Kayla's soccer games. She's 11, plays midfielder. On the job, I'm the guy who shows up early and stays until it's done right."

If they gave you less (just "football" and "my daughter"):
GOOD: "I'm Marcus, from Dallas. Outside of work, I'm watching football and spending time with my daughter. At work, I'm the guy who shows up early and gets it done."

BAD: "When I'm not behind the wheel, you'll find me cheering on the Cowboys with my little girl Mia!" (Don't invent team names or kid's names they didn't give you!)

Only include details they actually provided. Sparse answers = sparse script. That's fine.

## Rules
- ONLY use facts they actually gave you. If they said "football" don't write "Cowboys fan". If they said "my daughter" don't add an age they didn't mention.
- Never invent names, ages, teams, places, or details they didn't provide
- Use the EXACT spelling of names they gave you. Don't "correct" Kayla to Kaila or Mia to Mya. They know how to spell their family's names.
- Don't awkwardly list equipment types (dry van, reefer, end dump, etc.) in the script - it sounds clunky. Years of experience is fine, but skip the equipment list.
- Use their actual words when possible
- No corny phrases like "let's hit the road", "ready to roll", "all business"
- They have 60 seconds - make it count, but don't rush`;

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
      coaching = { script: responseText };
    }

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

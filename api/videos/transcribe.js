// Transcribe video clips and save to story fields
import OpenAI from 'openai';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;

// Map question numbers to story fields
const QUESTION_TO_FIELD = {
  1: 'story_who_are_you',
  2: 'story_what_is_your_why',
  3: 'story_freeworld_journey',
  4: 'story_why_trucking',
  5: 'story_looking_for',
  6: 'story_what_others_say',
};

const QUESTION_CONTEXT = {
  1: 'The speaker is answering "Who are you? Tell me about yourself."',
  2: 'The speaker is answering "What is your why? What drives you every day?"',
  3: 'The speaker is answering "Tell me about a turning point in your life" (their FreeWorld journey).',
  4: 'The speaker is answering "Why trucking? What do you love about this career?"',
  5: 'The speaker is answering "What are you looking for in your next company?"',
  6: 'The speaker is answering "What would a former manager or dispatcher say about you?"',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid } = req.body;

  if (!uuid) {
    return res.status(400).json({ error: 'UUID required' });
  }

  try {
    // Get candidate record with video clips
    const candidate = await getCandidate(uuid);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Parse video_clips JSON
    let videoClips = {};
    if (candidate.fields.video_clips) {
      try {
        videoClips = JSON.parse(candidate.fields.video_clips);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid video_clips data' });
      }
    }

    if (Object.keys(videoClips).length === 0) {
      return res.status(400).json({ error: 'No video clips found' });
    }

    console.log(`Transcribing ${Object.keys(videoClips).length} clips for ${uuid}`);

    // Transcribe each clip
    const transcripts = {};
    const storyUpdates = {};

    for (const [clipKey, clipData] of Object.entries(videoClips)) {
      const questionNum = parseInt(clipKey.replace('q', ''));
      if (!questionNum || questionNum < 1 || questionNum > 6) continue;

      const clipUrl = clipData.url;
      console.log(`Transcribing Q${questionNum}: ${clipUrl}`);

      try {
        // Transcribe with Deepgram
        const rawTranscript = await transcribeWithDeepgram(clipUrl);
        transcripts[questionNum] = { raw: rawTranscript };

        // Clean up with OpenAI
        const cleanedTranscript = await cleanupTranscript(rawTranscript, questionNum);
        transcripts[questionNum].cleaned = cleanedTranscript;

        // Map to story field
        const fieldName = QUESTION_TO_FIELD[questionNum];
        if (fieldName) {
          storyUpdates[fieldName] = cleanedTranscript;
        }
      } catch (err) {
        console.error(`Failed to transcribe Q${questionNum}:`, err.message);
        transcripts[questionNum] = { error: err.message };
      }
    }

    // Update Airtable with story answers and set status to complete
    if (Object.keys(storyUpdates).length > 0) {
      storyUpdates.video_status = 'complete';
      await updateCandidate(candidate.id, storyUpdates);
      console.log(`Updated ${Object.keys(storyUpdates).length} story fields`);
    }

    res.status(200).json({
      success: true,
      transcribed: Object.keys(storyUpdates).length,
      transcripts,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function transcribeWithDeepgram(audioUrl) {
  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: audioUrl }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram error: ${error}`);
  }

  const data = await response.json();
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

  if (!transcript) {
    throw new Error('Empty transcript');
  }

  return transcript;
}

async function cleanupTranscript(rawTranscript, questionNum) {
  const context = QUESTION_CONTEXT[questionNum] || '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are cleaning up a speech-to-text transcript for a driver profile.
${context}

Rules:
- Fix obvious transcription errors and filler words (um, uh, like, you know)
- Keep the speaker's authentic voice and personality
- Write in first person
- Keep it concise (2-4 sentences ideal)
- Don't add information that wasn't said
- Don't make it sound corporate or scripted
- If the transcript is mostly unintelligible, return a brief version of what was said

Return ONLY the cleaned transcript, nothing else.`,
      },
      { role: 'user', content: rawTranscript },
    ],
    max_tokens: 500,
  });

  return response.choices[0].message.content.trim();
}

async function getCandidate(uuid) {
  const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });

  const data = await response.json();
  return data.records?.[0] || null;
}

async function updateCandidate(recordId, fields) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable update failed: ${error}`);
  }

  return response.json();
}

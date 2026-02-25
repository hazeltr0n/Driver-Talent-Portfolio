// Confirm video clip upload and update Airtable
import OpenAI from 'openai';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '8b36f76f7271d135b183f7a7a7d0cb80';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'driver-story-videos';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${R2_ACCOUNT_ID}.r2.dev`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid, questionNumber, clipKey, clips } = req.body;

  // Support batch mode (multiple clips at once) or single clip
  if (!uuid || (!questionNumber && !clips)) {
    return res.status(400).json({ error: 'uuid and (questionNumber or clips) required' });
  }

  try {
    // Get existing record
    const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    const searchData = await searchResponse.json();

    if (!searchData.records || searchData.records.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const record = searchData.records[0];
    const recordId = record.id;

    // Parse existing video_clips JSON or start fresh
    let videoClips = {};
    if (record.fields.video_clips) {
      try {
        videoClips = JSON.parse(record.fields.video_clips);
      } catch (e) {
        videoClips = {};
      }
    }

    // Handle batch mode (multiple clips) or single clip
    if (clips && Array.isArray(clips)) {
      // Batch mode - add all clips at once
      for (const clip of clips) {
        const actualClipKey = clip.clipKey || `videos/${uuid}/q${clip.questionNumber}.webm`;
        const clipUrl = `${R2_PUBLIC_URL}/${actualClipKey}`;
        videoClips[`q${clip.questionNumber}`] = {
          key: actualClipKey,
          url: clipUrl,
          transcript: clip.transcript || '',
          speechStart: clip.speechStart ?? null,
          speechEnd: clip.speechEnd ?? null,
          uploadedAt: new Date().toISOString(),
        };
      }
    } else {
      // Single clip mode (legacy)
      const actualClipKey = clipKey || `videos/${uuid}/q${questionNumber}.webm`;
      const clipUrl = `${R2_PUBLIC_URL}/${actualClipKey}`;
      videoClips[`q${questionNumber}`] = {
        key: actualClipKey,
        url: clipUrl,
        uploadedAt: new Date().toISOString(),
      };
    }

    // Determine video status
    const uploadedQuestions = Object.keys(videoClips).length;
    let videoStatus = 'recording';
    if (uploadedQuestions >= 7) {
      videoStatus = 'ready_for_assembly';
    }

    // Map question transcripts to story fields
    const storyFieldMap = {
      q1: 'story_who_are_you',
      q2: 'story_what_is_your_why',
      q3: 'story_freeworld_journey',
      q4: 'story_why_trucking',
      q5: 'story_looking_for',
      q6: 'story_what_others_say',
      q7: 'story_message_to_employers',
    };

    const storyFields = {};
    for (const [qKey, fieldName] of Object.entries(storyFieldMap)) {
      if (videoClips[qKey]?.transcript) {
        storyFields[fieldName] = videoClips[qKey].transcript;
      }
    }

    // Generate AI narrative when all 7 clips are uploaded
    let aiFields = {};
    if (uploadedQuestions >= 7) {
      try {
        const driverName = record.fields.fullName || 'This driver';
        const transcripts = {
          whoAreYou: videoClips.q1?.transcript || '',
          whatIsYourWhy: videoClips.q2?.transcript || '',
          turningPoint: videoClips.q3?.transcript || '',
          whyTrucking: videoClips.q4?.transcript || '',
          lookingFor: videoClips.q5?.transcript || '',
          reputation: videoClips.q6?.transcript || '',
          messageToEmployers: videoClips.q7?.transcript || '',
        };

        // Generate factual narrative
        const narrativeResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Write a 3-4 sentence factual summary about this CDL driver for recruiters.
Present facts in the best light without exaggeration or fabrication.
Include: who they are, their experience/background, what they're looking for in an employer.
Third person, professional tone. Use their actual words and facts from the transcripts.
Do not invent details not mentioned in the transcripts.`,
            },
            {
              role: 'user',
              content: `Driver: ${driverName}\n\nTheir responses:\n${JSON.stringify(transcripts, null, 2)}`,
            },
          ],
          max_tokens: 300,
        });
        aiFields.ai_narrative = narrativeResponse.choices[0].message.content;

        // Generate pull quote - use their actual words
        const quoteResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Extract a direct 1-2 sentence quote from the driver's responses that best represents who they are or what they want.
Use their actual words as closely as possible. Choose something genuine and compelling.
Return only the quote text, no quotation marks.`,
            },
            {
              role: 'user',
              content: JSON.stringify(transcripts),
            },
          ],
          max_tokens: 100,
        });
        aiFields.ai_pull_quote = quoteResponse.choices[0].message.content;
      } catch (aiError) {
        console.error('AI generation failed:', aiError);
        // Continue without AI fields - not critical
      }
    }

    // Update Airtable
    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}/${recordId}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          video_clips: JSON.stringify(videoClips),
          video_status: videoStatus,
          ...storyFields,
          ...aiFields,
        },
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Update failed: ${error}`);
    }

    res.status(200).json({
      success: true,
      questionNumber: questionNumber || null,
      clips: videoClips,
      totalUploaded: uploadedQuestions,
      videoStatus,
    });
  } catch (error) {
    console.error('Confirm upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Confirm video clip upload and update Airtable

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

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
          uploadedAt: new Date().toISOString(),
        };
      }
    } else {
      // Single clip mode
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
    if (uploadedQuestions >= 6) {
      videoStatus = 'ready_for_assembly';
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
        },
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Update failed: ${error}`);
    }

    res.status(200).json({
      success: true,
      questionNumber,
      clipUrl,
      totalUploaded: uploadedQuestions,
      videoStatus,
    });
  } catch (error) {
    console.error('Confirm upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

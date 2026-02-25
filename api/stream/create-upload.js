// Create TUS upload URL for Cloudflare Stream
// Returns a one-time TUS endpoint that the client can use for resumable uploads

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_STREAM_API_TOKEN = process.env.CF_STREAM_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid, questionNumber, fileSize } = req.body;

  if (!uuid || !questionNumber) {
    return res.status(400).json({ error: 'uuid and questionNumber required' });
  }

  if (questionNumber < 1 || questionNumber > 7) {
    return res.status(400).json({ error: 'questionNumber must be between 1 and 7' });
  }

  if (!CF_ACCOUNT_ID || !CF_STREAM_API_TOKEN) {
    return res.status(500).json({ error: 'Cloudflare Stream not configured' });
  }

  try {
    // Verify candidate exists
    const formula = encodeURIComponent(`{uuid} = "${uuid}"`);
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${CANDIDATES_TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;

    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    const searchData = await searchResponse.json();

    if (!searchData.records || searchData.records.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Create TUS upload URL via Cloudflare Stream API
    // https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/#using-tus-recommended-for-videos-over-200mb
    const streamResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream?direct_user=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_STREAM_API_TOKEN}`,
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(fileSize || 0),
          'Upload-Metadata': `name ${Buffer.from(`${uuid}-q${questionNumber}`).toString('base64')}, requiresignedurls ${Buffer.from('false').toString('base64')}`,
        },
      }
    );

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      console.error('Cloudflare Stream error:', streamResponse.status, errorText);
      throw new Error(`Cloudflare Stream API error: ${streamResponse.status}`);
    }

    // The TUS endpoint is returned in the Location header
    const tusEndpoint = streamResponse.headers.get('location');

    // Extract the Stream video ID from the TUS endpoint
    // Format: https://upload.videodelivery.net/tus/{videoId}?tusv2=true
    const match = tusEndpoint.match(/\/tus\/([a-f0-9]+)/);
    const streamVideoId = match ? match[1] : null;

    if (!tusEndpoint) {
      throw new Error('No TUS endpoint returned from Cloudflare');
    }

    res.status(200).json({
      tusEndpoint,
      streamVideoId,
      questionNumber,
    });
  } catch (error) {
    console.error('Create upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

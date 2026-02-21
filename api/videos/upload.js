// Video clip upload endpoint - generates presigned URLs for R2 upload
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANDIDATES_TABLE_ID = process.env.AIRTABLE_CANDIDATES_TABLE_ID;

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '8b36f76f7271d135b183f7a7a7d0cb80';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '95564662535ee7e0a43d670a55d2d816';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'e9d9a2073372699665eac0fd07ebf65dbd400279e7b1318f2fcd8a022ca77ede';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'driver-story-videos';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Create S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uuid, questionNumber } = req.body;

  if (!uuid || !questionNumber) {
    return res.status(400).json({ error: 'uuid and questionNumber required' });
  }

  if (questionNumber < 1 || questionNumber > 6) {
    return res.status(400).json({ error: 'questionNumber must be between 1 and 6' });
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

    // Generate clip key
    const clipKey = `videos/${uuid}/q${questionNumber}.webm`;

    // Generate presigned URL for R2 upload
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: clipKey,
      ContentType: 'video/webm',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.status(200).json({
      uploadUrl,
      clipKey,
      publicUrl: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${clipKey}`,
    });
  } catch (error) {
    console.error('Upload URL error:', error);
    res.status(500).json({ error: error.message });
  }
}

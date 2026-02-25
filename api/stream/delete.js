// Delete video clips from Cloudflare Stream after render is complete

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_STREAM_API_TOKEN = process.env.CF_STREAM_API_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoIds } = req.body;

  if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({ error: 'videoIds array required' });
  }

  if (!CF_ACCOUNT_ID || !CF_STREAM_API_TOKEN) {
    return res.status(500).json({ error: 'Cloudflare Stream not configured' });
  }

  const results = {
    deleted: 0,
    failed: 0,
    errors: [],
  };

  // Delete each video from Stream
  for (const videoId of videoIds) {
    if (!videoId) continue;

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${videoId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${CF_STREAM_API_TOKEN}`,
          },
        }
      );

      if (response.ok || response.status === 404) {
        // 404 means already deleted, count as success
        results.deleted++;
      } else {
        const errorData = await response.json().catch(() => ({}));
        results.failed++;
        results.errors.push({ videoId, error: errorData.errors?.[0]?.message || response.status });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ videoId, error: error.message });
    }
  }

  res.status(200).json(results);
}

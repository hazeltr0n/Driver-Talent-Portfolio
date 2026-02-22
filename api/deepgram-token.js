// Return a temporary Deepgram API key for browser streaming
// In production, you'd use Deepgram's project key API to create short-lived tokens

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return the API key for WebSocket connection
  // Note: In production, use Deepgram's API to create a temporary scoped key
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Deepgram not configured' });
  }

  res.status(200).json({ apiKey });
}

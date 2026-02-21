// Short.io link shortener API
const SHORT_IO_API_KEY = process.env.SHORT_IO_API_KEY;
const SHORT_DOMAIN = process.env.SHORT_DOMAIN || 'freeworldjobs.short.gy';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, title } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }

  if (!SHORT_IO_API_KEY) {
    return res.status(500).json({ error: 'SHORT_IO_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.short.io/links', {
      method: 'POST',
      headers: {
        'authorization': SHORT_IO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: SHORT_DOMAIN,
        originalURL: url,
        title: title || undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Short.io error:', error);
      return res.status(response.status).json({ error: 'Failed to create short link' });
    }

    const data = await response.json();

    res.status(200).json({
      shortUrl: data.shortURL,
      originalUrl: data.originalURL,
      id: data.idString,
    });
  } catch (error) {
    console.error('Shorten error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Transcribe audio/video using Deepgram pre-recorded API
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Deepgram not configured' });
  }

  try {
    // Read raw body using micro's buffer helper
    const audioBuffer = await buffer(req);

    console.log('Received audio buffer size:', audioBuffer.length);

    if (audioBuffer.length < 100) {
      return res.status(400).json({ error: 'No audio data received' });
    }

    // Send to Deepgram pre-recorded API
    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Deepgram error:', error);
      return res.status(response.status).json({ error: 'Transcription failed', details: error });
    }

    const result = await response.json();
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    console.log('Transcript:', transcript);
    res.status(200).json({ transcript, words });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Transcription failed', details: err.message });
  }
}

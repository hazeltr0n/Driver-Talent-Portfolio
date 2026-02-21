// Direct video upload endpoint for development/demo mode
// In production, uploads go directly to R2 via presigned URL

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For development, we'll accept the upload and store it locally or just acknowledge
  // This is a fallback when R2 isn't configured

  try {
    // In a real scenario without R2, you'd save to local filesystem or another storage
    // For now, just acknowledge the upload
    res.status(200).json({
      success: true,
      message: 'Upload received (development mode)',
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

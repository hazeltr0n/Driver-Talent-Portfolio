// TUS resumable upload client wrapper for Cloudflare Stream
import * as tus from 'tus-js-client';

// Cloudflare Stream customer code for download URLs
const CF_STREAM_CUSTOMER_CODE = import.meta.env.VITE_CF_STREAM_CUSTOMER_CODE;

/**
 * Upload a video clip using TUS protocol for resumable uploads
 * @param {string} uuid - Candidate UUID
 * @param {number} questionNumber - Question number (1-7)
 * @param {Blob} blob - Video blob to upload
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<{questionNumber, streamVideoId, downloadUrl}>}
 */
export async function uploadVideoClipTUS(uuid, questionNumber, blob, onProgress) {
  // Get TUS upload URL from our API
  const response = await fetch('/api/stream/create-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, questionNumber, fileSize: blob.size }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to get upload URL: ${response.status}`);
  }

  const { tusEndpoint, streamVideoId } = await response.json();

  // Upload using TUS client
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      endpoint: tusEndpoint,
      uploadUrl: tusEndpoint,
      retryDelays: [0, 1000, 3000, 5000, 10000], // Auto-retry with backoff
      chunkSize: 5 * 1024 * 1024, // 5MB chunks for reliable mobile uploads
      metadata: {
        filename: `${uuid}-q${questionNumber}.webm`,
        filetype: blob.type || 'video/webm',
      },
      onError: (error) => {
        console.error('TUS upload error:', error);
        reject(new Error(`Upload failed: ${error.message || error}`));
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        if (onProgress) {
          onProgress(percentage);
        }
      },
      onSuccess: () => {
        // Build download URL using Cloudflare Stream format
        const downloadUrl = CF_STREAM_CUSTOMER_CODE
          ? `https://customer-${CF_STREAM_CUSTOMER_CODE}.cloudflarestream.com/${streamVideoId}/downloads/default.mp4`
          : null;

        resolve({
          questionNumber,
          streamVideoId,
          downloadUrl,
        });
      },
    });

    // Check for previous upload to resume
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        console.log(`Resuming upload for Q${questionNumber}`);
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}

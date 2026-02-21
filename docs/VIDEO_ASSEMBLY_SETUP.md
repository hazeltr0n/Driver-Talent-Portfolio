# Video Assembly Setup with Remotion + AWS Lambda

This guide covers setting up the video assembly pipeline using Remotion on AWS Lambda.

## Overview

The video assembly process:
1. Driver records 6 video clips via browser
2. Clips are uploaded to Cloudflare R2 (or S3)
3. Lambda function is triggered to assemble the final video
4. Final video is uploaded back to R2 and Airtable is updated

## Prerequisites

- AWS Account with Lambda access
- Node.js 18+
- Remotion CLI installed (`npm install -g @remotion/cli`)
- Cloudflare R2 bucket (or AWS S3)

## Step 1: Install Remotion Dependencies

```bash
cd Driver-Talent-Portfolio
npm install remotion @remotion/lambda @remotion/cli @aws-sdk/client-s3
```

## Step 2: Create Remotion Composition

Create `src/remotion/DriverStoryVideo.jsx`:

```jsx
import { Composition, Sequence, Video, Img, Audio, useCurrentFrame, useVideoConfig } from 'remotion';

const QUESTION_CARDS = [
  { title: "Who are you?", duration: 60 },      // 2 seconds at 30fps
  { title: "What is your why?", duration: 60 },
  { title: "Your turning point", duration: 60 },
  { title: "Why trucking?", duration: 60 },
  { title: "Your next chapter", duration: 60 },
  { title: "Your reputation", duration: 60 },
];

export const DriverStoryVideo = ({ driverName, driverLocation, clips }) => {
  const { fps } = useVideoConfig();

  let currentFrame = 0;

  return (
    <>
      {/* Intro Card - 3 seconds */}
      <Sequence from={currentFrame} durationInFrames={fps * 3}>
        <IntroCard name={driverName} location={driverLocation} />
      </Sequence>

      {/* Question Cards + Clips */}
      {clips.map((clip, index) => {
        const questionCardStart = currentFrame + fps * 3 + (index * (fps * 62)); // 2s card + 60s max clip

        return (
          <React.Fragment key={index}>
            {/* Question Card - 2 seconds */}
            <Sequence from={questionCardStart} durationInFrames={fps * 2}>
              <QuestionCard
                number={index + 1}
                title={QUESTION_CARDS[index].title}
              />
            </Sequence>

            {/* Video Clip */}
            <Sequence from={questionCardStart + fps * 2} durationInFrames={clip.durationInFrames}>
              <Video src={clip.url} />
            </Sequence>
          </React.Fragment>
        );
      })}

      {/* Outro Card - 4 seconds */}
      <Sequence from={currentFrame + fps * 3 + clips.length * (fps * 62)} durationInFrames={fps * 4}>
        <OutroCard />
      </Sequence>

      {/* Background Music */}
      <Audio src="/audio/background-music.mp3" volume={0.3} />
    </>
  );
};

const IntroCard = ({ name, location }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#004751',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
    }}>
      <img src="/cards/fw-logo-white.svg" style={{ width: 80, marginBottom: 40 }} />
      <h1 style={{ fontSize: 64, fontFamily: 'Georgia, serif', margin: 0 }}>{name}</h1>
      <p style={{ fontSize: 24, color: '#B0CDD4', marginTop: 16 }}>{location}</p>
      <p style={{ fontSize: 18, color: '#CDF95C', marginTop: 40 }}>DRIVER STORY</p>
    </div>
  );
};

const QuestionCard = ({ number, title }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#004751',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
    }}>
      <span style={{ fontSize: 48, color: '#CDF95C', fontWeight: 'bold' }}>Q{number}</span>
      <h2 style={{ fontSize: 48, fontFamily: 'Georgia, serif', textAlign: 'center', margin: '24px 48px' }}>
        {title}
      </h2>
    </div>
  );
};

const OutroCard = () => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#004751',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
    }}>
      <img src="/cards/fw-logo-white.svg" style={{ width: 120 }} />
      <p style={{ fontSize: 24, marginTop: 40, color: '#B0CDD4' }}>
        Powered by FreeWorld
      </p>
      <p style={{ fontSize: 18, marginTop: 16, color: '#5A7A82' }}>
        freeworld.co
      </p>
    </div>
  );
};

// Register composition
export const RemotionRoot = () => {
  return (
    <Composition
      id="DriverStoryVideo"
      component={DriverStoryVideo}
      durationInFrames={30 * 60 * 8} // 8 minutes max at 30fps
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        driverName: "James H.",
        driverLocation: "Dallas, TX",
        clips: [],
      }}
    />
  );
};
```

## Step 3: Deploy to AWS Lambda

```bash
# Configure AWS credentials
aws configure

# Deploy Remotion Lambda function
npx remotion lambda functions deploy

# Deploy your site to S3
npx remotion lambda sites deploy
```

Note the deployed function name and site URL.

## Step 4: Configure Environment Variables

Add to your `.env` or Vercel environment:

```env
# Remotion Lambda
REMOTION_AWS_REGION=us-east-1
REMOTION_FUNCTION_NAME=remotion-render-xxxx
REMOTION_SERVE_URL=https://your-site.s3.amazonaws.com

# R2/S3 Storage
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=driver-videos
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

## Step 5: Update Assembly API

Update `api/videos/assemble.js` to trigger Lambda:

```javascript
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda';

export default async function handler(req, res) {
  const { uuid } = req.body;

  // ... existing validation code ...

  // Get clip URLs and durations
  const inputProps = {
    driverName: fields.fullName || fields.name,
    driverLocation: `${fields.city}, ${fields.state}`,
    clips: Object.entries(videoClips).map(([key, clip]) => ({
      url: clip.url,
      durationInFrames: 30 * 60, // 60 seconds max per clip
    })),
  };

  // Trigger Lambda render
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: process.env.REMOTION_AWS_REGION,
    functionName: process.env.REMOTION_FUNCTION_NAME,
    serveUrl: process.env.REMOTION_SERVE_URL,
    composition: 'DriverStoryVideo',
    inputProps,
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 1,
    privacy: 'public',
    outName: `${uuid}-final.mp4`,
  });

  // Store render ID for polling
  await updateCandidate(recordId, {
    video_status: 'processing',
    video_render_id: renderId,
  });

  res.status(200).json({ success: true, renderId });
}
```

## Step 6: Create Progress Webhook

Create `api/videos/webhook.js` to handle render completion:

```javascript
export default async function handler(req, res) {
  const { renderId, outputUrl, status } = req.body;

  if (status === 'done') {
    // Find candidate by render_id and update
    // video_status = 'complete'
    // video_url = outputUrl
  }

  res.status(200).json({ received: true });
}
```

## Alternative: FFmpeg on Server

If you prefer not to use Lambda, you can run FFmpeg on a server:

```bash
# Install FFmpeg
apt-get install ffmpeg

# Stitch videos with FFmpeg
ffmpeg -i intro.mp4 -i q1_card.mp4 -i q1_clip.webm -i q2_card.mp4 ... \
  -filter_complex "[0:v][1:v][2:v]...concat=n=14:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" output.mp4
```

## Cost Estimate

- **Remotion Lambda**: ~$0.01-0.05 per video (depending on length)
- **R2 Storage**: $0.015/GB/month
- **Bandwidth**: $0.09/GB for egress

## Testing

1. Navigate to `/record/{uuid}` where uuid is a valid candidate
2. Record all 6 questions
3. Check Airtable for `video_status` updates
4. Verify final video at `video_url`

## Troubleshooting

### Lambda timeout
Increase Lambda timeout to 15 minutes for longer videos.

### Out of memory
Increase Lambda memory to 3GB or higher.

### Video codec issues
Ensure clips are in WebM format with VP9/VP8 codec.

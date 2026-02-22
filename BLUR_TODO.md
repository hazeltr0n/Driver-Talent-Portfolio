# Video Recorder - Background Blur TODO

## What We Were Doing
Implementing Zoom-style background blur for the video recorder at `/record/{uuid}`

## What Works
- Video recording with real-time Deepgram transcription
- AI coaching feedback (tough-love style for fair-chance candidates)
- Clean mobile-first UI with CSS (not inline styles)
- Basic camera works fine

## Background Blur - NEEDS WORK
Tried two approaches, both had issues:

### 1. MediaPipe SelfieSegmentation
- Crashed the browser immediately
- Probably WASM loading issues

### 2. TensorFlow.js BodyPix
- Works but laggy and looks bad
- Model is too heavy for real-time on MacBook

## Better Options to Try
1. **MediaPipe in a Web Worker** - Offload to separate thread
2. **Lighter model** - BodyPix has lighter options (MobileNetV1 with lower resolution)
3. **Lower framerate blur** - Run segmentation at 10fps, interpolate
4. **Browser native** - Some browsers support `navigator.mediaDevices.getUserMedia({ video: { backgroundBlur: true } })` but limited support
5. **Skip it** - Just ship without blur, it's a nice-to-have

## Files Changed
- `src/pages/VideoRecorder.jsx` - Main component
- `src/pages/VideoRecorder.css` - Styles
- `api/videos/feedback-from-transcript.js` - Tough coaching AI
- `api/deepgram-token.js` - Token for real-time transcription

## To Test
```
cd /Users/freeworld_james/Development/Driver-Talent-Portfolio
vercel dev
# Open http://localhost:3000/record/{uuid}
```

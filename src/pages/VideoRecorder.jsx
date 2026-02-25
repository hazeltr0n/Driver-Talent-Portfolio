import { useState, useEffect, useRef, useCallback } from 'react';
// Background blur disabled for now - too laggy
// import * as tf from '@tensorflow/tfjs';
// import * as bodyPix from '@tensorflow-models/body-pix';
import { getCandidate, uploadVideoClip, confirmAllClips, triggerVideoAssembly } from '../lib/api';
import './VideoRecorder.css';

const QUESTIONS = [
  {
    id: 1,
    title: "Who are you?",
    prompt: "Tell me about yourself",
    coaching: {
      why: "This is your first impression. Help them see the person behind the resume.",
      tips: [
        "Start with your name and where you're from",
        "Share what matters to you - family, goals, values",
        "Keep it warm and genuine",
      ],
      example: "\"I'm Marcus from Memphis. Father of two girls. I'm the kind of person who shows up early and stays late - that's just how I was raised.\"",
    },
  },
  {
    id: 2,
    title: "What is your why?",
    prompt: "What drives you every day?",
    coaching: {
      why: "Employers remember drivers who know their purpose. This shows commitment.",
      tips: [
        "What gets you out of bed every morning?",
        "Who are you doing this for?",
        "What are you building toward?",
      ],
      example: "\"Everything I do is for my kids. I want them to see their dad as someone who never gave up and built something real.\"",
    },
  },
  {
    id: 3,
    title: "Your turning point",
    prompt: "Tell me about your journey and support system",
    coaching: {
      why: "Employers want to see you have support and a plan. Show them you're set up for success.",
      tips: [
        "Briefly acknowledge your past (details optional)",
        "Talk about your support system - FreeWorld, community, family",
        "Share why your future is bright and you're ready for this opportunity",
      ],
      example: "\"I made mistakes in my past, but FreeWorld gave me a real path forward. Between my training, my family backing me, and this community - I've never been more ready to build a career.\"",
    },
  },
  {
    id: 4,
    title: "Why trucking?",
    prompt: "What do you love about this career?",
    coaching: {
      why: "Employers want drivers who love the craft, not just anyone looking for a job.",
      tips: [
        "What do you genuinely enjoy about driving?",
        "The independence? The open road? The pride?",
        "Show passion - it sets you apart",
      ],
      example: "\"There's nothing like being out on the open road, knowing I'm keeping the country moving. I take pride in every load.\"",
    },
  },
  {
    id: 5,
    title: "Your next chapter",
    prompt: "What are you looking for in your next company?",
    coaching: {
      why: "This shows you're selective and serious about finding the right fit.",
      tips: [
        "What matters to you? (Safety, respect, home time)",
        "Be honest about what you need to succeed",
        "This helps match you with the right company",
      ],
      example: "\"I'm looking for a company that values safety and treats drivers with respect. Somewhere I can build a career.\"",
    },
  },
  {
    id: 6,
    title: "Your reputation",
    prompt: "What would a former manager say about you?",
    coaching: {
      why: "Specific examples beat vague promises. This is what hiring managers want.",
      tips: [
        "Think of a real person who supervised you",
        "Give a SPECIFIC example of your reliability",
        "\"They knew they could count on me to...\"",
      ],
      example: "\"My last dispatcher knew he could call me at 3am for an emergency load and I'd be there. I never missed a pickup.\"",
    },
  },
  {
    id: 7,
    title: "Your message to employers",
    prompt: "Thank them for watching and share your final message",
    coaching: {
      why: "This is your closing statement. Leave them wanting to pick up the phone.",
      tips: [
        "Thank them for watching and considering you",
        "Tell them what they'll get if they hire you",
        "End with confidence - you're the right choice",
      ],
      example: "\"Thank you for taking the time to watch this. If you give me this opportunity, you're getting someone who will show up every day, work hard, and never let you down. I'm ready.\"",
    },
  },
];

const MAX_RECORDING_SECONDS = 60;

// Detect supported video mime type (iOS Safari uses mp4, others use webm)
function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const types = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export default function VideoRecorder({ uuid }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [showCoaching, setShowCoaching] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [recordingState, setRecordingState] = useState('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [clips, setClips] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [processingStep, setProcessingStep] = useState(null);
  const [seenCoaching, setSeenCoaching] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [gettingFeedback, setGettingFeedback] = useState(false);

  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const gettingStreamRef = useRef(false); // Lock to prevent concurrent getUserMedia calls
  const audioChunksRef = useRef([]);
  const backgroundUploadsRef = useRef({}); // Track background upload promises by question number

  // Load driver data
  useEffect(() => {
    if (!uuid) {
      setError('No recording ID provided');
      setLoading(false);
      return;
    }
    getCandidate(uuid)
      .then(data => { setDriver(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [uuid]);

  // Helper to get/refresh camera stream
  const getStream = useCallback(async () => {
    // Reuse existing active stream
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      const allActive = tracks.length > 0 && tracks.every(t => t.readyState === 'live');
      if (allActive) {
        // Ensure video element has the stream
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
        return streamRef.current;
      }
      tracks.forEach(t => t.stop());
    }

    // Prevent concurrent getUserMedia calls
    if (gettingStreamRef.current) {
      while (gettingStreamRef.current) {
        await new Promise(r => setTimeout(r, 50));
      }
      return streamRef.current;
    }

    gettingStreamRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      // Assign to video element if it exists
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      return stream;
    } finally {
      gettingStreamRef.current = false;
    }
  }, []);

  // Setup camera after intro dismissed (video element exists)
  useEffect(() => {
    if (showIntro) return; // Wait until intro is dismissed

    let mounted = true;

    async function setupCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not available');
        return;
      }

      try {
        await getStream();
      } catch (err) {
        console.error('Camera setup failed:', err);
        if (mounted) setError('Camera access denied. Please enable camera permissions.');
      }
    }

    setupCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [getStream, showIntro]);

  // Reconnect video element to existing stream when UI changes
  // Use requestAnimationFrame + setTimeout to avoid Chrome crashes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      // Chrome can crash if we assign srcObject during layout/paint
      // Use double-RAF to ensure we're past the current frame
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
          }
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
  }, [showIntro, showCoaching, recordingState, currentQuestion]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    // Clear srcObject before video element switches to prevent Chrome crash
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    // Ensure we have an active stream
    let stream;
    try {
      stream = await getStream();
    } catch (err) {
      console.error('Failed to get stream:', err);
      setError('Camera access lost. Please refresh and try again.');
      return;
    }
    if (!stream) return;

    chunksRef.current = [];
    audioChunksRef.current = [];
    setRecordingTime(0);
    setRecordingState('recording');

    // Use supported mime types (iOS Safari uses mp4, others use webm)
    const videoMimeType = getSupportedMimeType();
    const audioMimeType = getSupportedAudioMimeType();
    console.log('Using video mimeType:', videoMimeType);
    console.log('Using audio mimeType:', audioMimeType);

    const recorderOptions = {
      ...(videoMimeType && { mimeType: videoMimeType }),
      videoBitsPerSecond: 1500000, // 1.5 Mbps - good quality, ~2MB per 10sec instead of 12MB
    };
    const recorder = new MediaRecorder(stream, recorderOptions);
    mediaRecorderRef.current = recorder;

    // Create audio-only recorder for transcription
    const audioTracks = stream.getAudioTracks();
    const audioStream = new MediaStream(audioTracks);
    const audioRecorderOptions = audioMimeType ? { mimeType: audioMimeType } : {};
    const audioRecorder = new MediaRecorder(audioStream, audioRecorderOptions);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    audioRecorder.ondataavailable = (event) => {
      console.log('Audio chunk received:', event.data.size);
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      // Stop audio recorder and wait for final chunk
      if (audioRecorder.state !== 'inactive') {
        await new Promise((resolve) => {
          audioRecorder.onstop = resolve;
          audioRecorder.stop();
        });
      }

      // Use the actual mime type from the recorder
      const actualMimeType = recorder.mimeType || videoMimeType || 'video/webm';
      console.log('Creating blob with mimeType:', actualMimeType);
      const blob = new Blob(chunksRef.current, { type: actualMimeType });
      const localUrl = URL.createObjectURL(blob);
      const questionNum = currentQuestion + 1;

      // Transcribe audio using REST API
      setGettingFeedback(true);
      let transcript = '';
      let speechStart = null;
      let speechEnd = null;

      try {
        console.log('Audio chunks collected:', audioChunksRef.current.length);
        const actualAudioMimeType = audioRecorder.mimeType || audioMimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualAudioMimeType });
        console.log('Audio blob size:', audioBlob.size);
        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          body: audioBlob,
        });
        console.log('Transcribe response status:', transcribeRes.status);
        if (transcribeRes.ok) {
          const data = await transcribeRes.json();
          transcript = data.transcript || '';
          if (data.words && data.words.length > 0) {
            speechStart = data.words[0].start;
            speechEnd = data.words[data.words.length - 1].end;
          }
        }
      } catch (err) {
        console.error('Transcription failed:', err);
      }

      setClips(prev => ({ ...prev, [questionNum]: { blob, url: localUrl, transcript, speechStart, speechEnd, mimeType: actualMimeType } }));
      setRecordingState('preview');

      if (!transcript || transcript.length < 10) {
        setFeedback({ encouragement: "I couldn't hear much. Try again in a quiet spot and speak clearly.", isGoodToGo: false });
        setGettingFeedback(false);
        return;
      }

      try {
        const res = await fetch('/api/videos/feedback-from-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, questionNumber: questionNum }),
        });
        if (!res.ok) throw new Error('Feedback failed');
        const coachFeedback = await res.json();
        setFeedback({ transcript, ...coachFeedback });
      } catch (err) {
        setFeedback({ transcript, encouragement: 'Good effort!', isGoodToGo: true });
      } finally {
        setGettingFeedback(false);
      }
    };

    recorder.start(250);
    audioRecorder.start(250);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= MAX_RECORDING_SECONDS - 1) { stopRecording(); return MAX_RECORDING_SECONDS; }
        return prev + 1;
      });
    }, 1000);
  }, [currentQuestion, stopRecording, getStream]);

  const startCountdown = useCallback(() => {
    setRecordingState('countdown');
    setCountdown(3);
    let count = 3;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) { clearInterval(countdownRef.current); startRecording(); }
    }, 1000);
  }, [startRecording]);

  const handleStartRecording = useCallback(() => {
    if (!seenCoaching[currentQuestion]) {
      setSeenCoaching(prev => ({ ...prev, [currentQuestion]: true }));
      setShowCoaching(true);
      return;
    }
    startCountdown();
  }, [currentQuestion, seenCoaching, startCountdown]);

  const cancelRecording = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    setRecordingState('idle');
  }, []);

  const retakeRecording = useCallback(() => {
    const questionId = currentQuestion + 1;
    setClips(prev => {
      const newClips = { ...prev };
      if (newClips[questionId]?.url) URL.revokeObjectURL(newClips[questionId].url);
      delete newClips[questionId];
      return newClips;
    });
    // Clear any background upload for this question (user is re-recording)
    delete backgroundUploadsRef.current[questionId];
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[questionId];
      return newProgress;
    });
    setFeedback(null);
    setRecordingState('idle');
    // Reconnect stream to video element after returning from preview
    requestAnimationFrame(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    });
  }, [currentQuestion]);

  // Start uploading a clip in the background
  const uploadClipInBackground = useCallback((questionNum, clip) => {
    // Skip if already uploading or uploaded
    if (backgroundUploadsRef.current[questionNum]) return;

    setUploadProgress(prev => ({ ...prev, [questionNum]: 0 }));

    const onProgress = (percentage) => {
      setUploadProgress(prev => ({ ...prev, [questionNum]: percentage }));
    };

    const uploadPromise = uploadVideoClip(uuid, questionNum, clip.blob, onProgress)
      .then(clipInfo => {
        setUploadProgress(prev => ({ ...prev, [questionNum]: 'done' }));
        // Free blob from memory after successful upload (helps Android)
        // Keep the object URL for preview playback
        setClips(prev => ({
          ...prev,
          [questionNum]: { ...prev[questionNum], blob: null, uploaded: true }
        }));
        return {
          ...clipInfo,
          transcript: clip.transcript || '',
          speechStart: clip.speechStart,
          speechEnd: clip.speechEnd,
        };
      })
      .catch(err => {
        console.error(`Background upload failed for Q${questionNum}:`, err);
        setUploadProgress(prev => ({ ...prev, [questionNum]: 'error' }));
        throw err;
      });

    backgroundUploadsRef.current[questionNum] = uploadPromise;
  }, [uuid]);

  const acceptClip = useCallback(() => {
    setFeedback(null);
    const questionNum = currentQuestion + 1;
    const clip = clips[questionNum];

    // Start uploading current clip in background
    if (clip?.blob) {
      uploadClipInBackground(questionNum, clip);
    }

    if (currentQuestion < QUESTIONS.length - 1) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      setRecordingState('idle');
      // Auto-show coaching for next question
      if (!seenCoaching[nextQuestion]) {
        setSeenCoaching(prev => ({ ...prev, [nextQuestion]: true }));
        setShowCoaching(true);
      }
    } else {
      finishAndConfirmUploads(clips);
    }
  }, [currentQuestion, clips, seenCoaching, uploadClipInBackground]);

  const finishAndConfirmUploads = async (clipsToUpload) => {
    setRecordingState('uploading');
    setProcessingStep('uploading');

    // Collect all upload promises - either from background or start new ones
    const uploadPromises = [];

    for (let i = 1; i <= QUESTIONS.length; i++) {
      const clip = clipsToUpload[i];
      if (!clip) continue;

      // Check if already uploading/uploaded in background
      if (backgroundUploadsRef.current[i]) {
        uploadPromises.push(backgroundUploadsRef.current[i]);
      } else if (clip.blob) {
        // Start upload now (shouldn't happen often - mostly just the last clip)
        setUploadProgress(prev => ({ ...prev, [i]: 0 }));
        const questionIndex = i; // Capture for closure
        const onProgress = (percentage) => {
          setUploadProgress(prev => ({ ...prev, [questionIndex]: percentage }));
        };
        const promise = uploadVideoClip(uuid, i, clip.blob, onProgress)
          .then(clipInfo => {
            setUploadProgress(prev => ({ ...prev, [questionIndex]: 'done' }));
            return {
              ...clipInfo,
              transcript: clip.transcript || '',
              speechStart: clip.speechStart,
              speechEnd: clip.speechEnd,
            };
          })
          .catch(err => {
            setUploadProgress(prev => ({ ...prev, [questionIndex]: 'error' }));
            throw err;
          });
        uploadPromises.push(promise);
      }
      // If clip.uploaded is true and no blob, the background upload promise should exist
    }

    try {
      const uploadedClips = await Promise.all(uploadPromises);
      // Pass transcripts to confirm - no need to re-transcribe
      await confirmAllClips(uuid, uploadedClips);
      triggerVideoAssembly(uuid).catch(console.error);
      setProcessingStep('complete');
    } catch (err) {
      setError('Failed to process videos. Please try again.');
      setRecordingState('preview');
      setProcessingStep(null);
    }
  };

  const goToQuestion = (index) => {
    if (clips[index + 1] || index <= currentQuestion) {
      setCurrentQuestion(index);
      setRecordingState(clips[index + 1] ? 'preview' : 'idle');
    }
  };

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  // Loading
  if (loading) {
    return (
      <div className="recorder">
        <div className="loading-screen">
          <img src="/fw-logo.svg" alt="FreeWorld" />
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="recorder">
        <div className="error-screen">
          <img src="/fw-logo.svg" alt="FreeWorld" />
          <h2 className="error-title">Error</h2>
          <p className="error-text">{error}</p>
        </div>
      </div>
    );
  }

  // Intro
  if (showIntro) {
    return (
      <div className="recorder">
        <div className="intro-screen">
          <img src="/fw-logo-white.svg" alt="FreeWorld" className="intro-logo" />
          <h1 className="intro-title">Record Your Story</h1>
          <p className="intro-subtitle">
            You're about to record 7 short video answers. This is your chance to show employers who you really are.
          </p>
          <div className="intro-section">
            <h3 className="intro-section-title">Before You Start</h3>
            <div className="intro-tips">
              <div className="intro-tip"><span className="intro-tip-bullet">•</span><span><strong>Lighting:</strong> Face a window or light source.</span></div>
              <div className="intro-tip"><span className="intro-tip-bullet">•</span><span><strong>Quiet space:</strong> No background noise.</span></div>
              <div className="intro-tip"><span className="intro-tip-bullet">•</span><span><strong>Look at the camera:</strong> Not at yourself.</span></div>
              <div className="intro-tip"><span className="intro-tip-bullet">•</span><span><strong>Be yourself:</strong> Speak naturally.</span></div>
            </div>
          </div>
          <div className="intro-reminder">
            <strong>Remember:</strong> Your story is your strength. Focus on who you are today, not where you've been.
          </div>
          <button onClick={() => { setShowIntro(false); setShowCoaching(true); setSeenCoaching({ 0: true }); }} className="intro-btn">
            I'm Ready
          </button>
        </div>
      </div>
    );
  }

  // Success
  if (processingStep === 'complete') {
    return (
      <div className="recorder">
        <div className="success-screen">
          <div className="success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9EF01A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="success-title">You're All Set!</h1>
          <p className="success-text">Your story video has been recorded and saved to your profile.</p>
          <div className="success-details">
            <div className="success-detail-item"><span className="success-check">✓</span><span>7 video clips uploaded</span></div>
            <div className="success-detail-item"><span className="success-check">✓</span><span>Story responses saved</span></div>
            <div className="success-detail-item"><span className="success-check">✓</span><span>Video assembly started</span></div>
          </div>
          <p className="success-subtext">Your Career Agent will review your profile soon.</p>
        </div>
      </div>
    );
  }

  const question = QUESTIONS[currentQuestion];
  const hasCurrentClip = !!clips[currentQuestion + 1];

  return (
    <div className="recorder">
      {/* Header */}
      <div className="recorder-header">
        <img src="/fw-logo-white.svg" alt="FreeWorld" />
        <span>Record Your Story</span>
      </div>

      {/* Progress */}
      <div className="progress-bar">
        {QUESTIONS.map((q, idx) => {
          const questionNum = idx + 1;
          const hasClip = !!clips[questionNum];
          const uploadStatus = uploadProgress[questionNum];
          const isUploaded = uploadStatus === 'done';
          const isUploading = typeof uploadStatus === 'number';
          const percentage = isUploading ? uploadStatus : null;
          return (
            <button
              key={q.id}
              onClick={() => goToQuestion(idx)}
              className={`progress-dot ${idx === currentQuestion ? 'active' : ''} ${hasClip ? 'complete' : ''} ${isUploaded ? 'uploaded' : ''} ${isUploading ? 'uploading' : ''}`}
              title={isUploading ? `Uploading: ${percentage}%` : undefined}
            >
              {isUploaded ? '✓' : hasClip ? '✓' : idx + 1}
            </button>
          );
        })}
      </div>

      {/* Main */}
      <div className="recorder-main">
        {/* Question */}
        <div className="question-card">
          <div className="question-number">Question {currentQuestion + 1} of {QUESTIONS.length}</div>
          <h2 className="question-title">{question.title}</h2>
          <p className="question-prompt">{question.prompt}</p>
        </div>

        {/* Video */}
        <div className="video-container">
          {/* Always render both videos to prevent Chrome crash from unmounting video with srcObject */}
          {/* No autoPlay - we call play() manually after srcObject to avoid Chrome crash */}
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ display: recordingState === 'preview' && hasCurrentClip ? 'none' : 'block' }}
          />
          <video
            ref={previewRef}
            src={recordingState === 'preview' && hasCurrentClip ? clips[currentQuestion + 1]?.url : undefined}
            controls
            playsInline
            style={{ display: recordingState === 'preview' && hasCurrentClip ? 'block' : 'none' }}
          />

          {recordingState === 'countdown' && (
            <div className="countdown-overlay">
              <div className="countdown-number">{countdown}</div>
            </div>
          )}

          {recordingState === 'recording' && (
            <div className="recording-indicator">
              <div className="recording-dot" />
              <span className="recording-time">{formatTime(recordingTime)}</span>
              <span className="recording-max"> / {formatTime(MAX_RECORDING_SECONDS)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="controls">
          {recordingState === 'idle' && (
            <button onClick={handleStartRecording} className="record-btn">
              <div className="record-btn-circle" />
              <span className="record-btn-text">Tap to Record</span>
            </button>
          )}

          {recordingState === 'countdown' && (
            <button onClick={cancelRecording} className="cancel-btn">Cancel</button>
          )}

          {recordingState === 'recording' && (
            <button onClick={stopRecording} className="record-btn">
              <div className="stop-btn-square" />
              <span className="record-btn-text">Stop Recording</span>
            </button>
          )}

          {recordingState === 'preview' && !gettingFeedback && !feedback && (
            <div className="preview-controls">
              <button onClick={retakeRecording} className="retake-btn">Re-record</button>
              <button onClick={acceptClip} className="accept-btn">
                {currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Finish'}
              </button>
            </div>
          )}

          {recordingState === 'preview' && gettingFeedback && (
            <div className="feedback-loading">
              <div className="spinner" />
              <p className="feedback-loading-text">AI Coach is reviewing...</p>
            </div>
          )}

          {recordingState === 'uploading' && (
            <div className="uploading-container">
              <div className="spinner" />
              <p className="uploading-text">
                {processingStep === 'uploading' && 'Uploading your videos...'}
                {processingStep === 'transcribing' && 'Processing responses...'}
              </p>
              {processingStep === 'uploading' && (
                <div className="upload-progress">
                  {QUESTIONS.map((q, idx) => {
                    const status = uploadProgress[idx + 1];
                    const isUploading = typeof status === 'number';
                    const percentage = isUploading ? status : null;
                    return (
                      <div key={q.id} className={`upload-progress-item ${status === 'done' ? 'done' : status === 'error' ? 'error' : isUploading ? 'uploading' : ''}`}>
                        <span>Q{idx + 1}</span>
                        <span>{status === 'done' ? '✓' : status === 'error' ? '✗' : isUploading ? `${percentage}%` : '○'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Coaching Modal */}
      {showCoaching && (
        <div className="coaching-overlay">
          <div className="coaching-modal">
            <div className="coaching-header">
              <span className="coaching-question-num">Question {currentQuestion + 1} of {QUESTIONS.length}</span>
              <h2 className="coaching-title">{question.title}</h2>
            </div>
            <p className="coaching-why">{question.coaching.why}</p>
            <span className="coaching-tips-label">Tips:</span>
            <ul className="coaching-tips-list">
              {question.coaching.tips.map((tip, idx) => (
                <li key={idx} className="coaching-tip-item">{tip}</li>
              ))}
            </ul>
            <div className="coaching-example">
              <span className="coaching-example-label">Example:</span>
              <p className="coaching-example-text">{question.coaching.example}</p>
            </div>
            <button onClick={() => setShowCoaching(false)} className="coaching-btn">Got It</button>
          </div>
        </div>
      )}

      {/* AI Coach Feedback Modal */}
      {feedback && recordingState === 'preview' && (
        <div className="coaching-overlay">
          <div className="coaching-modal">
            <div className="feedback-header">
              <span className="feedback-badge">AI Coach</span>
              <h2 className="coaching-title">Feedback</h2>
            </div>
            <div className={`feedback-content ${feedback.isGoodToGo === false ? 'needs-work' : ''}`}>
              <p className="feedback-encouragement">{feedback.encouragement}</p>
              {feedback.growthNote && <p className="feedback-growth">{feedback.growthNote}</p>}
              {feedback.example && <p className="feedback-example">Try: "{feedback.example}"</p>}
            </div>
            <div className="feedback-modal-buttons">
              <button onClick={retakeRecording} className="retake-btn">Re-record</button>
              <button onClick={acceptClip} className="accept-btn">
                {feedback.isGoodToGo === false ? 'Keep Anyway' : currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

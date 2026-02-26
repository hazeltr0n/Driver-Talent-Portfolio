import { useState, useEffect, useRef, useCallback } from 'react';
import { getCandidate, uploadVideoClip, confirmAllClips, triggerVideoAssembly } from '../lib/api';
import './VideoRecorder.css';

const QUESTIONS = [
  {
    id: 1,
    title: "Who are you?",
    prompt: "Tell me about yourself",
    talkingPoints: [
      '"I\'m [name] from [city, state]"',
      "Things you enjoy outside work that show your personality (family, hobbies, sports)",
      "What kind of person/worker you are",
    ],
    example: "I'm Marcus from Memphis, Tennessee. Outside of work, I'm all about my family - I've got two daughters who keep me busy. I'm also big into fishing when I get the chance. At work, I'm the guy who shows up early and stays late if that's what it takes.",
  },
  {
    id: 2,
    title: "What is your why?",
    prompt: "What drives you every day?",
    talkingPoints: [
      "Who or what are you doing this for? (You is an acceptable answer!)",
      "What are you working toward? (What are your goals)",
      "What gets you up in the morning? (What motivates you?)",
    ],
    example: "Everything I do is for my kids. I want them to see their dad as someone who never gave up, who worked hard and built something real. That's what drives me every single day.",
  },
  {
    id: 3,
    title: "Your turning point",
    prompt: "Tell me about your journey and support system",
    talkingPoints: [
      "Brief acknowledgment of your past (as much or little detail as you're comfortable with)",
      "What's different now - your support system, FreeWorld, family",
      "Why you won't go back - what's changed in your life",
    ],
    example: "I made some bad choices that landed me in prison for 3 years. But that chapter is closed. When I got out, FreeWorld helped me get my CDL and gave me real support. My family is behind me. I have too much to lose now - I'm never going back to that life. The person I am today is focused, ready, and set up to succeed.",
  },
  {
    id: 4,
    title: "Why trucking?",
    prompt: "What do you love about this career?",
    talkingPoints: [
      "Why you're proud to be a driver / respect for the industry",
      "Why trucking is the right fit for you",
      "How this career enables you to build the life you want",
    ],
    example: "I'm proud to be a driver. We keep this country moving and I respect that. Trucking fits me - I love the independence and being responsible for my rig. This career lets me provide for my family and build the future I want for my kids.",
  },
  {
    id: 5,
    title: "Your next chapter",
    prompt: "What are you looking for in your next company?",
    talkingPoints: [
      "What matters most to you in a company (safety, respect, equipment, home time)",
      "The kind of culture you thrive in",
      "What growth looks like for you long-term (becoming a better driver, or growing into other roles)",
    ],
    example: "Safety is number one for me - I want a company that takes it seriously, not just talks about it. I want to be treated with respect and have good equipment. I'm looking for somewhere I can build a career long-term, maybe become a trainer someday.",
  },
  {
    id: 6,
    title: "Your message to employers",
    prompt: "Thank them for watching and tell them why they should hire you",
    talkingPoints: [
      "Thank them for their time and consideration",
      "Why you're worth hiring - what sets you apart",
      "Your commitment - how you'll take care of their equipment, customers, and reputation",
    ],
    example: "Thank you for taking the time to watch this. If you hire me, you're getting a driver with 5 years experience and a Hazmat endorsement who will show up every day, take care of your equipment like it's my own, and never let you down. I'm ready to prove myself.",
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
  const [_driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [recordingState, setRecordingState] = useState('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [clips, setClips] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [processingStep, setProcessingStep] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [gettingFeedback, setGettingFeedback] = useState(false);

  // Coaching flow state
  const [coachingStep, setCoachingStep] = useState(null); // 'probing_questions' | 'personalized_tips' | null
  const [probingAnswers, setProbingAnswers] = useState({});
  const [personalizedTips, setPersonalizedTips] = useState(null);
  const [isReRecord, setIsReRecord] = useState(false);
  const [generatingTips, setGeneratingTips] = useState(false);

  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const gettingStreamRef = useRef(false);
  const audioChunksRef = useRef([]);
  const backgroundUploadsRef = useRef({});

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
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      const allActive = tracks.length > 0 && tracks.every(t => t.readyState === 'live');
      if (allActive) {
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
        return streamRef.current;
      }
      tracks.forEach(t => t.stop());
    }

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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      return stream;
    } finally {
      gettingStreamRef.current = false;
    }
  }, []);

  // Setup camera after intro dismissed
  useEffect(() => {
    if (showIntro) return;

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

  // Reconnect video element when UI changes
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
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
  }, [showIntro, recordingState, currentQuestion, coachingStep]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
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

    const videoMimeType = getSupportedMimeType();
    const audioMimeType = getSupportedAudioMimeType();

    const recorderOptions = {
      ...(videoMimeType && { mimeType: videoMimeType }),
      videoBitsPerSecond: 1500000,
    };
    const recorder = new MediaRecorder(stream, recorderOptions);
    mediaRecorderRef.current = recorder;

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
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      if (audioRecorder.state !== 'inactive') {
        await new Promise((resolve) => {
          audioRecorder.onstop = resolve;
          audioRecorder.stop();
        });
      }

      const actualMimeType = recorder.mimeType || videoMimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: actualMimeType });
      const localUrl = URL.createObjectURL(blob);
      const questionNum = currentQuestion + 1;

      setGettingFeedback(true);
      let transcript = '';
      let speechStart = null;
      let speechEnd = null;

      try {
        const actualAudioMimeType = audioRecorder.mimeType || audioMimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualAudioMimeType });
        const transcribeRes = await fetch('/api/transcribe', {
          method: 'POST',
          body: audioBlob,
        });
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
        setFeedback({
          status: 'needs_coaching',
          encouragement: "I couldn't hear much. Try again in a quiet spot and speak clearly.",
          probingQuestions: []
        });
        setShowFeedbackModal(true);
        setGettingFeedback(false);
        return;
      }

      try {
        const res = await fetch('/api/videos/feedback-from-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, questionNumber: questionNum, candidateUuid: uuid }),
        });
        if (!res.ok) throw new Error('Feedback failed');
        const coachFeedback = await res.json();
        setFeedback({ transcript, ...coachFeedback });
        setShowFeedbackModal(true);
      } catch {
        setFeedback({ transcript, status: 'good', encouragement: 'Good effort!' });
        setShowFeedbackModal(true);
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
  }, [currentQuestion, stopRecording, getStream, uuid]);

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
    startCountdown();
  }, [startCountdown]);

  const cancelRecording = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    setRecordingState('idle');
  }, []);

  const retakeRecording = useCallback((withPersonalizedTips = false) => {
    const questionId = currentQuestion + 1;
    setClips(prev => {
      const newClips = { ...prev };
      if (newClips[questionId]?.url) URL.revokeObjectURL(newClips[questionId].url);
      delete newClips[questionId];
      return newClips;
    });
    delete backgroundUploadsRef.current[questionId];
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[questionId];
      return newProgress;
    });
    setFeedback(null);
    setShowFeedbackModal(false);
    setCoachingStep(null);
    setIsReRecord(withPersonalizedTips);
    setRecordingState('idle');
    requestAnimationFrame(() => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
    });
  }, [currentQuestion]);

  const uploadClipInBackground = useCallback((questionNum, clip) => {
    if (backgroundUploadsRef.current[questionNum]) return;

    setUploadProgress(prev => ({ ...prev, [questionNum]: 0 }));

    const onProgress = (percentage) => {
      setUploadProgress(prev => ({ ...prev, [questionNum]: percentage }));
    };

    const uploadPromise = uploadVideoClip(uuid, questionNum, clip.blob, onProgress)
      .then(clipInfo => {
        setUploadProgress(prev => ({ ...prev, [questionNum]: 'done' }));
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

  const finishAndConfirmUploads = useCallback(async (clipsToUpload) => {
    setRecordingState('uploading');
    setProcessingStep('uploading');

    const uploadPromises = [];

    for (let i = 1; i <= QUESTIONS.length; i++) {
      const clip = clipsToUpload[i];
      if (!clip) continue;

      if (backgroundUploadsRef.current[i]) {
        uploadPromises.push(backgroundUploadsRef.current[i]);
      } else if (clip.blob) {
        setUploadProgress(prev => ({ ...prev, [i]: 0 }));
        const questionIndex = i;
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
    }

    try {
      const uploadedClips = await Promise.all(uploadPromises);
      await confirmAllClips(uuid, uploadedClips);
      triggerVideoAssembly(uuid).catch(console.error);
      setProcessingStep('complete');
    } catch {
      setError('Failed to process videos. Please try again.');
      setRecordingState('preview');
      setProcessingStep(null);
    }
  }, [uuid]);

  const acceptClip = useCallback(() => {
    setFeedback(null);
    setShowFeedbackModal(false);
    setCoachingStep(null);
    setPersonalizedTips(null);
    setProbingAnswers({});
    setIsReRecord(false);

    const questionNum = currentQuestion + 1;
    const clip = clips[questionNum];

    if (clip?.blob) {
      uploadClipInBackground(questionNum, clip);
    }

    if (currentQuestion < QUESTIONS.length - 1) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      setRecordingState('idle');
    } else {
      finishAndConfirmUploads(clips);
    }
  }, [currentQuestion, clips, uploadClipInBackground, finishAndConfirmUploads]);

  const goToQuestion = (index) => {
    if (clips[index + 1] || index <= currentQuestion) {
      setCurrentQuestion(index);
      setRecordingState(clips[index + 1] ? 'preview' : 'idle');
      setFeedback(null);
      setShowFeedbackModal(false);
      setCoachingStep(null);
      setPersonalizedTips(null);
      setProbingAnswers({});
      setIsReRecord(false);
    }
  };

  const handleShowProbingQuestions = () => {
    setCoachingStep('probing_questions');
  };

  const handleProbingAnswerChange = (index, value) => {
    setProbingAnswers(prev => ({ ...prev, [index]: value }));
  };

  const handleGeneratePersonalizedTips = async () => {
    setGeneratingTips(true);
    try {
      const res = await fetch('/api/videos/generate-coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: feedback?.transcript || '',
          probingAnswers,
          questionNumber: currentQuestion + 1,
          candidateUuid: uuid,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate tips');
      const data = await res.json();
      setPersonalizedTips(data);
      setCoachingStep('personalized_tips');
    } catch (err) {
      console.error('Failed to generate personalized tips:', err);
      // Fall back to re-recording without personalized tips
      retakeRecording(false);
    } finally {
      setGeneratingTips(false);
    }
  };

  const handleSaveAndExit = () => {
    // For harmful content - save progress and exit
    // TODO: Could notify career agent here
    setProcessingStep('blocked');
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
            You're about to record 6 short video answers. This is your chance to show employers who you really are.
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
          <button onClick={() => setShowIntro(false)} className="intro-btn">
            I'm Ready
          </button>
        </div>
      </div>
    );
  }

  // Blocked (harmful content)
  if (processingStep === 'blocked') {
    return (
      <div className="recorder">
        <div className="blocked-screen">
          <div className="blocked-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="blocked-title">We've Saved Your Progress</h1>
          <p className="blocked-text">Your Career Agent will reach out to help you complete your video. They'll work with you to make sure your story gives you the best chance with employers.</p>
          <p className="blocked-subtext">You can close this page now.</p>
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
            <div className="success-detail-item"><span className="success-check">✓</span><span>6 video clips uploaded</span></div>
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
  const tipsToShow = isReRecord && personalizedTips ? personalizedTips.personalizedTips : question.talkingPoints;

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
          <div className="question-number">
            Question {currentQuestion + 1} of {QUESTIONS.length}
            {isReRecord && <span className="take-badge">Take 2</span>}
          </div>
          <h2 className="question-title">{question.title}</h2>
          <p className="question-prompt">{question.prompt}</p>
        </div>

        {/* Video */}
        <div className="video-container">
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

        {/* Talking Points - shown during idle, countdown, and recording */}
        {(recordingState === 'idle' || recordingState === 'countdown' || recordingState === 'recording') && (
          <div className="talking-points">
            <div className="talking-points-header">
              {isReRecord && personalizedTips ? 'Your Personalized Tips:' : 'Talking Points:'}
            </div>
            <ul className="talking-points-list">
              {tipsToShow.map((tip, idx) => (
                <li key={idx} className={`talking-point-item ${isReRecord && personalizedTips ? 'personalized' : ''}`}>
                  {tip}
                </li>
              ))}
            </ul>
            {question.note && !isReRecord && (
              <p className="talking-points-note">{question.note}</p>
            )}
          </div>
        )}

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

          {recordingState === 'preview' && gettingFeedback && (
            <div className="feedback-loading">
              <div className="spinner" />
              <p className="feedback-loading-text">AI Coach is reviewing...</p>
            </div>
          )}

          {/* Preview controls - shown when watching playback (feedback modal dismissed) */}
          {recordingState === 'preview' && !gettingFeedback && !showFeedbackModal && !coachingStep && (
            <div className="preview-controls-stack">
              {feedback?.probingQuestions && feedback.probingQuestions.length > 0 && (
                <button onClick={handleShowProbingQuestions} className="coaching-btn-secondary">
                  Get Personalized Tips
                </button>
              )}
              <div className="preview-controls">
                <button onClick={() => retakeRecording(false)} className="retake-btn">Re-record</button>
                <button onClick={acceptClip} className="accept-btn">
                  {currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Finish'}
                </button>
              </div>
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

      {/* Feedback Modal - Status: Good */}
      {showFeedbackModal && feedback && recordingState === 'preview' && feedback.status === 'good' && !coachingStep && (
        <div className="coaching-overlay">
          <div className="coaching-modal">
            <div className="feedback-header">
              <span className="feedback-badge feedback-badge-good">Great Job!</span>
            </div>
            <div className="feedback-content feedback-good">
              <p className="feedback-encouragement">{feedback.encouragement}</p>
            </div>
            <div className="feedback-modal-buttons-stack">
              <button onClick={acceptClip} className="coaching-btn">
                {currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Finish'}
              </button>
              <div className="feedback-modal-buttons">
                <button onClick={() => setShowFeedbackModal(false)} className="retake-btn">Watch Playback</button>
                <button onClick={() => retakeRecording(false)} className="retake-btn">Re-record</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal - Status: Needs Coaching (Step 1: Show options) */}
      {showFeedbackModal && feedback && recordingState === 'preview' && feedback.status === 'needs_coaching' && !coachingStep && (
        <div className="coaching-overlay">
          <div className="coaching-modal">
            <div className="feedback-header">
              <span className="feedback-badge feedback-badge-coaching">Good Start!</span>
              <h2 className="coaching-title">Let's make it even stronger</h2>
            </div>
            <div className="feedback-content feedback-coaching">
              <p className="feedback-encouragement">{feedback.encouragement}</p>
            </div>
            <div className="feedback-modal-buttons-stack">
              {feedback.probingQuestions && feedback.probingQuestions.length > 0 && (
                <button onClick={handleShowProbingQuestions} className="coaching-btn">
                  Get Personalized Tips
                </button>
              )}
              <button onClick={acceptClip} className="keep-btn">
                Keep Anyway
              </button>
              <div className="feedback-modal-buttons">
                <button onClick={() => setShowFeedbackModal(false)} className="retake-btn">Watch Playback</button>
                <button onClick={() => retakeRecording(false)} className="retake-btn">Re-record</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Probing Questions Modal */}
      {feedback && recordingState === 'preview' && coachingStep === 'probing_questions' && (
        <div className="coaching-overlay">
          <div className="coaching-modal">
            <div className="feedback-header">
              <span className="feedback-badge feedback-badge-coaching">Quick Questions</span>
              <h2 className="coaching-title">Help us help you</h2>
            </div>
            <div className="probing-questions">
              {feedback.probingQuestions?.map((question, idx) => (
                <div key={idx} className="probing-question">
                  <label className="probing-label">{question}</label>
                  <input
                    type="text"
                    className="probing-input"
                    value={probingAnswers[idx] || ''}
                    onChange={(e) => handleProbingAnswerChange(idx, e.target.value)}
                    placeholder="Type your answer..."
                  />
                </div>
              ))}
            </div>
            <div className="feedback-modal-buttons">
              <button onClick={() => setCoachingStep(null)} className="retake-btn">Back</button>
              <button
                onClick={handleGeneratePersonalizedTips}
                className="accept-btn"
                disabled={generatingTips || Object.keys(probingAnswers).length === 0}
              >
                {generatingTips ? 'Generating...' : 'Get My Tips'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personalized Tips Modal */}
      {feedback && recordingState === 'preview' && coachingStep === 'personalized_tips' && personalizedTips && (
        <div className="coaching-overlay">
          <div className="coaching-modal">
            <div className="feedback-header">
              <span className="feedback-badge feedback-badge-tips">Your Personalized Tips</span>
            </div>
            <div className="personalized-tips-content">
              <ul className="personalized-tips-list">
                {personalizedTips.personalizedTips.map((tip, idx) => (
                  <li key={idx} className="personalized-tip-item">{tip}</li>
                ))}
              </ul>
              {personalizedTips.suggestedOpening && (
                <div className="suggested-opening">
                  <span className="suggested-opening-label">Try starting with:</span>
                  <p className="suggested-opening-text">"{personalizedTips.suggestedOpening}"</p>
                </div>
              )}
            </div>
            <button onClick={() => retakeRecording(true)} className="coaching-btn">
              Record Again with These Tips
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal - Status: Harmful (Blocked) */}
      {showFeedbackModal && feedback && recordingState === 'preview' && feedback.status === 'harmful' && !coachingStep && (
        <div className="coaching-overlay">
          <div className="coaching-modal">
            <div className="feedback-header">
              <span className="feedback-badge feedback-badge-harmful">Let's Pause</span>
            </div>
            <div className="feedback-content feedback-harmful">
              <p className="feedback-encouragement">
                We want to make sure your video gives you the best chance with employers.
              </p>
              <p className="feedback-harmful-message">
                {feedback.harmfulMessage || "Your Career Agent will reach out to help with this question."}
              </p>
            </div>
            <div className="feedback-modal-buttons-stack">
              <button onClick={() => retakeRecording(false)} className="coaching-btn">
                Try Again
              </button>
              <div className="feedback-modal-buttons">
                <button onClick={() => setShowFeedbackModal(false)} className="retake-btn">Watch Playback</button>
                <button onClick={handleSaveAndExit} className="harmful-exit-btn">
                  Save & Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

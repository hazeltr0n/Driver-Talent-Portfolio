import { useState, useEffect, useRef, useCallback } from 'react';
import { getCandidate, uploadVideoClip, transcribeVideoClips, triggerVideoAssembly } from '../lib/api';

const QUESTIONS = [
  {
    id: 1,
    title: "Who are you?",
    prompt: "Tell me about yourself",
    cardImage: "/cards/card_01_question.png",
    coaching: {
      why: "This is your first impression. Help them see the person behind the resume.",
      tips: [
        "Start with your name and where you're from",
        "Share something personal - family, hobbies, what you're about",
        "Keep it warm and genuine, like meeting someone new",
      ],
      example: "\"I'm Marcus from Memphis. Father of two girls, been driving for 8 years. I'm the guy who shows up early and stays late.\"",
    },
  },
  {
    id: 2,
    title: "What is your why?",
    prompt: "What drives you every day?",
    cardImage: "/cards/card_02_question.png",
    coaching: {
      why: "This is powerful. Employers remember drivers who know their purpose.",
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
    prompt: "Tell me about a turning point in your life",
    cardImage: "/cards/card_03_question.png",
    coaching: {
      why: "Your story is your strength. Focus on the moment you decided to change, not the past.",
      tips: [
        "You don't need to share details of your past",
        "Focus on the DECISION to do things differently",
        "Show growth and accountability - \"I realized...\" \"I decided...\"",
      ],
      example: "\"There came a point where I had to ask myself who I wanted to be. I chose to be someone my family could count on.\"",
    },
  },
  {
    id: 4,
    title: "Why trucking?",
    prompt: "What do you love about this career?",
    cardImage: "/cards/card_04_question.png",
    coaching: {
      why: "Employers want drivers who love the craft, not just anyone looking for a job.",
      tips: [
        "What do you genuinely enjoy about driving?",
        "The independence? The open road? The pride in hauling freight?",
        "Show passion - it sets you apart",
      ],
      example: "\"There's nothing like being out on the open road, knowing I'm keeping the country moving. I take pride in every load I deliver.\"",
    },
  },
  {
    id: 5,
    title: "Your next chapter",
    prompt: "What are you looking for in your next company?",
    cardImage: "/cards/card_05_question.png",
    coaching: {
      why: "This shows you're selective and serious about finding the right fit.",
      tips: [
        "What matters to you? (Safety culture, respect, home time, growth)",
        "Be honest about what you need to succeed",
        "This helps match you with the right company",
      ],
      example: "\"I'm looking for a company that values safety and treats drivers with respect. Somewhere I can build a long-term career.\"",
    },
  },
  {
    id: 6,
    title: "Your reputation",
    prompt: "What would a former manager or dispatcher say about you?",
    cardImage: "/cards/card_06_question.png",
    coaching: {
      why: "Specific examples beat vague promises. This is what hiring managers really want to hear.",
      tips: [
        "Think of a real person who supervised you",
        "Give a SPECIFIC example of your reliability or work ethic",
        "\"They knew they could count on me to...\"",
      ],
      example: "\"My last dispatcher knew he could call me at 3am for an emergency load and I'd be there. I never missed a pickup.\"",
    },
  },
];

const MAX_RECORDING_SECONDS = 60;

export default function VideoRecorder({ uuid }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Recording state
  const [showIntro, setShowIntro] = useState(true);
  const [showCoaching, setShowCoaching] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [recordingState, setRecordingState] = useState('idle'); // idle, countdown, recording, preview, uploading
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [clips, setClips] = useState({}); // { 1: { blob, url }, 2: { blob, url }, ... }
  const [uploadProgress, setUploadProgress] = useState({});
  const [processingStep, setProcessingStep] = useState(null); // null, 'uploading', 'transcribing', 'complete'
  const [seenCoaching, setSeenCoaching] = useState({}); // Track which questions we've seen coaching for

  // Refs
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Load driver data
  useEffect(() => {
    if (!uuid) {
      setError('No recording ID provided');
      setLoading(false);
      return;
    }

    getCandidate(uuid)
      .then((data) => {
        setDriver(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [uuid]);

  // Setup camera on mount
  useEffect(() => {
    let mounted = true;

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: { ideal: 9/16 },
          },
          audio: true,
        });

        if (mounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Camera access denied. Please enable camera permissions.');
        }
      }
    }

    setupCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Connect stream to video element when it becomes available
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setRecordingTime(0);
    setRecordingState('recording');

    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm';
    }

    const recorder = new MediaRecorder(streamRef.current, options);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);

      setClips((prev) => ({
        ...prev,
        [currentQuestion + 1]: { blob, url },
      }));

      setRecordingState('preview');
    };

    recorder.start(1000); // Collect data every second

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= MAX_RECORDING_SECONDS - 1) {
          stopRecording();
          return MAX_RECORDING_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  }, [currentQuestion, stopRecording]);

  const startCountdown = useCallback(() => {
    setRecordingState('countdown');
    setCountdown(3);
    let count = 3;

    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(countdownRef.current);
        startRecording();
      }
    }, 1000);
  }, [startRecording]);

  const handleStartRecording = useCallback(() => {
    // Show coaching if we haven't seen it for this question yet
    if (!seenCoaching[currentQuestion]) {
      setSeenCoaching(prev => ({ ...prev, [currentQuestion]: true }));
      setShowCoaching(true);
      return;
    }
    startCountdown();
  }, [currentQuestion, seenCoaching, startCountdown]);

  const cancelRecording = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingState('idle');
  }, []);

  const retakeRecording = useCallback(() => {
    // Remove current clip and go back to idle
    const questionId = currentQuestion + 1;
    setClips((prev) => {
      const newClips = { ...prev };
      if (newClips[questionId]?.url) {
        URL.revokeObjectURL(newClips[questionId].url);
      }
      delete newClips[questionId];
      return newClips;
    });
    setRecordingState('idle');
  }, [currentQuestion]);

  const acceptClip = useCallback(() => {
    // Move to next question or finish
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setRecordingState('idle');
    } else {
      // All questions done - trigger uploads
      uploadAllClips();
    }
  }, [currentQuestion, clips, uuid]);

  const uploadAllClips = async () => {
    setRecordingState('uploading');
    setProcessingStep('uploading');
    const uploadPromises = [];

    for (let i = 1; i <= QUESTIONS.length; i++) {
      const clip = clips[i];
      if (clip?.blob) {
        setUploadProgress((prev) => ({ ...prev, [i]: 'uploading' }));

        const promise = uploadVideoClip(uuid, i, clip.blob)
          .then(() => {
            setUploadProgress((prev) => ({ ...prev, [i]: 'done' }));
          })
          .catch((err) => {
            setUploadProgress((prev) => ({ ...prev, [i]: 'error' }));
            throw err;
          });

        uploadPromises.push(promise);
      }
    }

    try {
      await Promise.all(uploadPromises);

      // Now transcribe the clips
      setProcessingStep('transcribing');
      await transcribeVideoClips(uuid);

      // Trigger video assembly in background (don't wait)
      triggerVideoAssembly(uuid).catch(console.error);

      setProcessingStep('complete');
    } catch (err) {
      console.error('Processing error:', err);
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingScreen}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={styles.logo} />
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorScreen}>
          <img src="/fw-logo.svg" alt="FreeWorld" style={styles.logo} />
          <h2 style={styles.errorTitle}>Error</h2>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  // Intro Screen
  if (showIntro) {
    return (
      <div style={styles.container}>
        <div style={styles.introScreen}>
          <img src="/fw-logo-white.svg" alt="FreeWorld" style={styles.introLogo} />
          <h1 style={styles.introTitle}>Record Your Story</h1>
          <p style={styles.introSubtitle}>
            You're about to record 6 short video answers. This is your chance to show employers who you really are.
          </p>

          <div style={styles.introSection}>
            <h3 style={styles.introSectionTitle}>Before You Start</h3>
            <div style={styles.introTips}>
              <div style={styles.introTip}>
                <span style={styles.introTipBullet}>•</span>
                <span><strong>Lighting:</strong> Face a window or light source. Avoid sitting with a window behind you.</span>
              </div>
              <div style={styles.introTip}>
                <span style={styles.introTipBullet}>•</span>
                <span><strong>Quiet space:</strong> Find somewhere without background noise - no TV, traffic, or interruptions.</span>
              </div>
              <div style={styles.introTip}>
                <span style={styles.introTipBullet}>•</span>
                <span><strong>Dress the part:</strong> Wear what you'd wear to meet a hiring manager.</span>
              </div>
              <div style={styles.introTip}>
                <span style={styles.introTipBullet}>•</span>
                <span><strong>Look at the camera:</strong> Look at the camera dot, not at yourself on screen.</span>
              </div>
              <div style={styles.introTip}>
                <span style={styles.introTipBullet}>•</span>
                <span><strong>Be yourself:</strong> Speak naturally. Employers want to see the real you.</span>
              </div>
            </div>
          </div>

          <div style={styles.introSection}>
            <h3 style={styles.introSectionTitle}>What to Expect</h3>
            <p style={styles.introText}>
              You'll answer 6 questions, up to 60 seconds each. Before each question, we'll show you tips on what makes a great answer. You can re-record any answer until you're happy with it.
            </p>
          </div>

          <div style={styles.introReminder}>
            <strong>Remember:</strong> Your story is your strength. Focus on who you are today and where you're headed, not where you've been.
          </div>

          <button onClick={() => { setShowIntro(false); setShowCoaching(true); setSeenCoaching({ 0: true }); }} style={styles.introButton}>
            I'm Ready - Let's Go
          </button>
        </div>
      </div>
    );
  }

  // Coaching Screen (shown before each question)
  if (showCoaching) {
    const question = QUESTIONS[currentQuestion];
    return (
      <div style={styles.container}>
        <div style={styles.coachingScreen}>
          <div style={styles.coachingHeader}>
            <span style={styles.coachingQuestionNum}>Question {currentQuestion + 1} of {QUESTIONS.length}</span>
            <h2 style={styles.coachingTitle}>{question.title}</h2>
            <p style={styles.coachingPrompt}>{question.prompt}</p>
          </div>

          <div style={styles.coachingWhy}>
            <span style={styles.coachingWhyLabel}>Why this matters:</span>
            <p style={styles.coachingWhyText}>{question.coaching.why}</p>
          </div>

          <div style={styles.coachingTips}>
            <span style={styles.coachingTipsLabel}>Tips for a great answer:</span>
            <ul style={styles.coachingTipsList}>
              {question.coaching.tips.map((tip, idx) => (
                <li key={idx} style={styles.coachingTipItem}>{tip}</li>
              ))}
            </ul>
          </div>

          <div style={styles.coachingExample}>
            <span style={styles.coachingExampleLabel}>Example:</span>
            <p style={styles.coachingExampleText}>{question.coaching.example}</p>
          </div>

          <button onClick={() => { setShowCoaching(false); startCountdown(); }} style={styles.coachingButton}>
            Got It - Start Recording
          </button>
        </div>
      </div>
    );
  }

  if (processingStep === 'complete') {
    return (
      <div style={styles.container}>
        <div style={styles.successScreen}>
          <div style={styles.successIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CDF95C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 style={styles.successTitle}>You're All Set!</h1>
          <p style={styles.successText}>
            Your story video has been recorded and your responses have been saved to your profile.
          </p>
          <div style={styles.successDetails}>
            <div style={styles.successDetailItem}>
              <span style={styles.successCheck}>✓</span>
              <span>6 video clips uploaded</span>
            </div>
            <div style={styles.successDetailItem}>
              <span style={styles.successCheck}>✓</span>
              <span>Story responses saved</span>
            </div>
            <div style={styles.successDetailItem}>
              <span style={styles.successCheck}>✓</span>
              <span>Video assembly started</span>
            </div>
          </div>
          <p style={styles.successSubtext}>
            Your Career Agent will review your profile soon. You can close this page now.
          </p>
        </div>
      </div>
    );
  }

  const question = QUESTIONS[currentQuestion];
  const hasCurrentClip = !!clips[currentQuestion + 1];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <img src="/fw-logo-white.svg" alt="FreeWorld" style={styles.headerLogo} />
        <span style={styles.headerTitle}>Record Your Story</span>
      </div>

      {/* Progress */}
      <div style={styles.progressContainer}>
        {QUESTIONS.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => goToQuestion(idx)}
            style={{
              ...styles.progressDot,
              ...(idx === currentQuestion ? styles.progressDotActive : {}),
              ...(clips[idx + 1] ? styles.progressDotComplete : {}),
            }}
          >
            {clips[idx + 1] ? '✓' : idx + 1}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Question Card */}
        <div style={styles.questionCard}>
          <div style={styles.questionNumber}>Question {currentQuestion + 1} of {QUESTIONS.length}</div>
          <h2 style={styles.questionTitle}>{question.title}</h2>
          <p style={styles.questionPrompt}>{question.prompt}</p>
        </div>

        {/* Video Area */}
        <div style={styles.videoContainer}>
          {recordingState === 'preview' && hasCurrentClip ? (
            <video
              ref={previewRef}
              src={clips[currentQuestion + 1]?.url}
              style={styles.video}
              controls
              playsInline
            />
          ) : (
            <video
              ref={videoRef}
              style={styles.video}
              autoPlay
              playsInline
              muted
            />
          )}

          {/* Countdown Overlay */}
          {recordingState === 'countdown' && (
            <div style={styles.countdownOverlay}>
              <div style={styles.countdownNumber}>{countdown}</div>
            </div>
          )}

          {/* Recording Indicator */}
          {recordingState === 'recording' && (
            <div style={styles.recordingIndicator}>
              <div style={styles.recordingDot} />
              <span style={styles.recordingTime}>{formatTime(recordingTime)}</span>
              <span style={styles.recordingMax}> / {formatTime(MAX_RECORDING_SECONDS)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          {recordingState === 'idle' && (
            <button onClick={handleStartRecording} style={styles.recordButton}>
              <div style={styles.recordButtonInner} />
              <span style={styles.recordButtonText}>Tap to Record</span>
            </button>
          )}

          {recordingState === 'countdown' && (
            <button onClick={cancelRecording} style={styles.cancelButton}>
              Cancel
            </button>
          )}

          {recordingState === 'recording' && (
            <button onClick={stopRecording} style={styles.stopButton}>
              <div style={styles.stopButtonInner} />
              <span style={styles.recordButtonText}>Stop Recording</span>
            </button>
          )}

          {recordingState === 'preview' && (
            <div style={styles.previewControls}>
              <button onClick={retakeRecording} style={styles.retakeButton}>
                Retake
              </button>
              <button onClick={acceptClip} style={styles.acceptButton}>
                {currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Finish & Upload'}
              </button>
            </div>
          )}

          {recordingState === 'uploading' && (
            <div style={styles.uploadingContainer}>
              <div style={styles.uploadingSpinner} />
              <p style={styles.uploadingText}>
                {processingStep === 'uploading' && 'Uploading your videos...'}
                {processingStep === 'transcribing' && 'Transcribing your responses...'}
              </p>
              <div style={styles.uploadProgress}>
                {processingStep === 'uploading' && QUESTIONS.map((q, idx) => (
                  <div key={q.id} style={styles.uploadProgressItem}>
                    <span>Q{idx + 1}</span>
                    <span style={{
                      color: uploadProgress[idx + 1] === 'done' ? '#CDF95C' :
                             uploadProgress[idx + 1] === 'error' ? '#EF4444' :
                             uploadProgress[idx + 1] === 'uploading' ? '#FFFFFF' : '#5A7A82'
                    }}>
                      {uploadProgress[idx + 1] === 'done' ? '✓' :
                       uploadProgress[idx + 1] === 'error' ? '✗' :
                       uploadProgress[idx + 1] === 'uploading' ? '...' : '○'}
                    </span>
                  </div>
                ))}
                {processingStep === 'transcribing' && (
                  <p style={styles.transcribingNote}>
                    Converting your spoken answers to text...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      {recordingState === 'idle' && !hasCurrentClip && (
        <div style={styles.tips}>
          <p style={styles.tipText}>
            <strong>Tips:</strong> Find good lighting, speak clearly, and be yourself!
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#004751',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  headerLogo: {
    height: 28,
    width: 28,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 600,
  },
  progressContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 20px',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid #5A7A82',
    background: 'transparent',
    color: '#5A7A82',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    borderColor: '#FFFFFF',
    color: '#FFFFFF',
  },
  progressDotComplete: {
    borderColor: '#CDF95C',
    background: '#CDF95C',
    color: '#004751',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '0 20px 20px',
    gap: 16,
    maxWidth: 500,
    margin: '0 auto',
    width: '100%',
  },
  questionCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
  },
  questionNumber: {
    fontSize: 12,
    color: '#CDF95C',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: 600,
    marginBottom: 8,
  },
  questionTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#FFFFFF',
    fontFamily: 'Georgia, serif',
  },
  questionPrompt: {
    margin: '8px 0 0',
    fontSize: 15,
    color: '#B0CDD4',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    background: '#000',
    minHeight: 300,
    maxHeight: 500,
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Mirror for selfie view
  },
  countdownOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: 800,
    color: '#FFFFFF',
    fontFamily: 'Georgia, serif',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(0, 0, 0, 0.6)',
    padding: '8px 16px',
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#EF4444',
    animation: 'pulse 1s infinite',
  },
  recordingTime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  recordingMax: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0',
  },
  recordButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  recordButtonInner: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#EF4444',
    border: '4px solid #FFFFFF',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 500,
  },
  cancelButton: {
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 600,
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  stopButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  stopButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 12,
    background: '#EF4444',
    border: '4px solid #FFFFFF',
  },
  previewControls: {
    display: 'flex',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  retakeButton: {
    flex: 1,
    maxWidth: 150,
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  acceptButton: {
    flex: 1,
    maxWidth: 200,
    padding: '14px 24px',
    fontSize: 16,
    fontWeight: 600,
    background: '#CDF95C',
    color: '#004751',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  uploadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  uploadingSpinner: {
    width: 48,
    height: 48,
    border: '4px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: '#CDF95C',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    margin: 0,
  },
  uploadProgress: {
    display: 'flex',
    gap: 16,
  },
  uploadProgressItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    color: '#5A7A82',
    fontSize: 12,
  },
  tips: {
    padding: '12px 20px',
    background: 'rgba(205, 249, 92, 0.1)',
    borderRadius: 8,
    margin: '0 20px 20px',
  },
  tipText: {
    margin: 0,
    fontSize: 14,
    color: '#B0CDD4',
    textAlign: 'center',
  },
  loadingScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  logo: {
    height: 48,
    width: 48,
  },
  loadingText: {
    color: '#B0CDD4',
    fontSize: 16,
    margin: 0,
  },
  errorScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    margin: 0,
    fontFamily: 'Georgia, serif',
  },
  errorText: {
    color: '#B0CDD4',
    fontSize: 16,
    margin: 0,
  },
  successScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 20,
    textAlign: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'rgba(205, 249, 92, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    margin: 0,
    fontFamily: 'Georgia, serif',
  },
  successText: {
    color: '#B0CDD4',
    fontSize: 16,
    margin: 0,
    maxWidth: 300,
  },
  successSubtext: {
    color: '#5A7A82',
    fontSize: 14,
    margin: 0,
  },
  successDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: 'rgba(205, 249, 92, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  successDetailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#B0CDD4',
    fontSize: 15,
  },
  successCheck: {
    color: '#CDF95C',
    fontSize: 18,
    fontWeight: 700,
  },
  transcribingNote: {
    color: '#B0CDD4',
    fontSize: 14,
    margin: 0,
    textAlign: 'center',
  },
  // Intro Screen
  introScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 24,
    maxWidth: 500,
    margin: '0 auto',
    overflowY: 'auto',
  },
  introLogo: {
    height: 48,
    width: 48,
    marginBottom: 16,
  },
  introTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#FFFFFF',
    fontFamily: 'Georgia, serif',
  },
  introSubtitle: {
    margin: '12px 0 24px',
    fontSize: 16,
    color: '#B0CDD4',
    lineHeight: 1.5,
  },
  introSection: {
    marginBottom: 24,
  },
  introSectionTitle: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 600,
    color: '#CDF95C',
  },
  introTips: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  introTip: {
    display: 'flex',
    gap: 12,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 1.4,
  },
  introTipBullet: {
    fontSize: 18,
    color: '#CDF95C',
    flexShrink: 0,
    fontWeight: 700,
  },
  introText: {
    margin: 0,
    fontSize: 14,
    color: '#B0CDD4',
    lineHeight: 1.5,
  },
  introReminder: {
    background: 'rgba(205, 249, 92, 0.15)',
    borderLeft: '4px solid #CDF95C',
    padding: 16,
    borderRadius: '0 8px 8px 0',
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 1.5,
    marginBottom: 24,
  },
  introButton: {
    padding: '16px 32px',
    fontSize: 18,
    fontWeight: 700,
    background: '#CDF95C',
    color: '#004751',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    marginTop: 'auto',
  },
  // Coaching Screen
  coachingScreen: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 24,
    maxWidth: 500,
    margin: '0 auto',
    overflowY: 'auto',
  },
  coachingHeader: {
    textAlign: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  coachingQuestionNum: {
    fontSize: 12,
    color: '#CDF95C',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: 600,
  },
  coachingTitle: {
    margin: '8px 0 4px',
    fontSize: 28,
    fontWeight: 700,
    color: '#FFFFFF',
    fontFamily: 'Georgia, serif',
  },
  coachingPrompt: {
    margin: 0,
    fontSize: 16,
    color: '#B0CDD4',
  },
  coachingWhy: {
    marginBottom: 20,
  },
  coachingWhyLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#CDF95C',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  coachingWhyText: {
    margin: 0,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 1.5,
  },
  coachingTips: {
    marginBottom: 20,
  },
  coachingTipsLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#CDF95C',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  coachingTipsList: {
    margin: 0,
    padding: '0 0 0 20px',
    listStyle: 'disc',
  },
  coachingTipItem: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  coachingExample: {
    background: 'rgba(205, 249, 92, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  coachingExampleLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#CDF95C',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  coachingExampleText: {
    margin: 0,
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  coachingButton: {
    padding: '16px 32px',
    fontSize: 16,
    fontWeight: 700,
    background: '#CDF95C',
    color: '#004751',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    marginTop: 'auto',
  },
};

// Add CSS animations via style tag
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);
}

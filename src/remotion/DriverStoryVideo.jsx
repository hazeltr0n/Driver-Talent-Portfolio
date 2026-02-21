import { AbsoluteFill, Sequence, OffthreadVideo, useVideoConfig, Img, Audio } from 'remotion';

const QUESTIONS = [
  { title: 'Who are you?', subtitle: 'Tell me about yourself' },
  { title: 'What is your why?', subtitle: 'What drives you every day?' },
  { title: 'Your turning point', subtitle: 'A turning point in your life' },
  { title: 'Why trucking?', subtitle: 'What do you love about this career?' },
  { title: 'Your next chapter', subtitle: 'What are you looking for?' },
  { title: 'Your reputation', subtitle: 'What would others say about you?' },
];

const INTRO_DURATION_SECONDS = 3;
const CARD_DURATION_SECONDS = 2;
const OUTRO_DURATION_SECONDS = 4;

export const DriverStoryVideo = ({ driverName, driverLocation, clips, musicUrl }) => {
  const { fps } = useVideoConfig();

  const introDuration = fps * INTRO_DURATION_SECONDS;
  const cardDuration = fps * CARD_DURATION_SECONDS;
  const outroDuration = fps * OUTRO_DURATION_SECONDS;

  let currentFrame = 0;
  const sequences = [];

  // Intro
  sequences.push(
    <Sequence key="intro" from={currentFrame} durationInFrames={introDuration}>
      <IntroCard name={driverName} location={driverLocation} />
    </Sequence>
  );
  currentFrame += introDuration;

  // Questions + Clips
  clips.forEach((clip, index) => {
    // Question card
    sequences.push(
      <Sequence key={`card-${index}`} from={currentFrame} durationInFrames={cardDuration}>
        <QuestionCard
          number={index + 1}
          title={QUESTIONS[index]?.title || `Question ${index + 1}`}
          subtitle={QUESTIONS[index]?.subtitle || ''}
        />
      </Sequence>
    );
    currentFrame += cardDuration;

    // Video clip with VAD-based trimming
    const trimStart = clip.trimStart ?? 0;
    const trimEnd = clip.trimEnd ?? null;

    // Calculate frames to skip at start and actual duration
    const startFromFrame = Math.floor(trimStart * fps);
    // Add 0.3s buffer before speech starts (if we have trim data)
    const bufferFrames = trimStart > 0 ? Math.floor(0.3 * fps) : 0;
    const adjustedStartFrame = Math.max(0, startFromFrame - bufferFrames);

    // Calculate duration: if we have trimEnd, use that; otherwise use full clip
    let clipDuration;
    if (trimEnd !== null && trimEnd > trimStart) {
      // Duration = (speech end + buffer) - (speech start - buffer)
      const speechDuration = trimEnd - trimStart;
      clipDuration = Math.ceil((speechDuration + 0.6) * fps); // 0.3s buffer on each side
    } else {
      clipDuration = clip.durationInFrames || fps * 60;
    }

    sequences.push(
      <Sequence key={`clip-${index}`} from={currentFrame} durationInFrames={clipDuration}>
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
          <OffthreadVideo
            src={clip.url}
            startFrom={adjustedStartFrame}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AbsoluteFill>
      </Sequence>
    );
    currentFrame += clipDuration;
  });

  // Outro
  sequences.push(
    <Sequence key="outro" from={currentFrame} durationInFrames={outroDuration}>
      <OutroCard />
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#004751' }}>
      {sequences}
      {musicUrl && (
        <Audio src={musicUrl} volume={0.2} />
      )}
    </AbsoluteFill>
  );
};

const IntroCard = ({ name, location }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#004751',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          marginBottom: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="45" stroke="#CDF95C" strokeWidth="4" />
          <text x="50" y="58" textAnchor="middle" fill="#CDF95C" fontSize="24" fontWeight="bold">
            FW
          </text>
        </svg>
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {name}
      </div>

      <div
        style={{
          fontSize: 32,
          color: '#B0CDD4',
          textAlign: 'center',
          marginBottom: 48,
        }}
      >
        {location}
      </div>

      <div
        style={{
          fontSize: 24,
          color: '#CDF95C',
          textTransform: 'uppercase',
          letterSpacing: 4,
          fontWeight: 600,
        }}
      >
        Driver Story
      </div>
    </AbsoluteFill>
  );
};

const QuestionCard = ({ number, title, subtitle }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#004751',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          fontSize: 64,
          color: '#CDF95C',
          fontWeight: 800,
          marginBottom: 32,
        }}
      >
        Q{number}
      </div>

      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          marginBottom: 24,
          maxWidth: 900,
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: 28,
            color: '#B0CDD4',
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};

const OutroCard = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#004751',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          marginBottom: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="45" stroke="#CDF95C" strokeWidth="4" />
          <text x="50" y="58" textAnchor="middle" fill="#CDF95C" fontSize="24" fontWeight="bold">
            FW
          </text>
        </svg>
      </div>

      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        FreeWorld
      </div>

      <div
        style={{
          fontSize: 24,
          color: '#B0CDD4',
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        Connecting talent with opportunity
      </div>

      <div
        style={{
          fontSize: 20,
          color: '#5A7A82',
        }}
      >
        freeworld.co
      </div>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, Sequence, OffthreadVideo, useVideoConfig, Img, Audio, useCurrentFrame, interpolate } from 'remotion';

const QUESTIONS = [
  { title: 'Who are you?', subtitle: 'Tell me about yourself' },
  { title: 'What is your why?', subtitle: 'What drives you every day?' },
  { title: 'Your turning point', subtitle: 'A turning point in your life' },
  { title: 'Why trucking?', subtitle: 'What do you love about this career?' },
  { title: 'Your next chapter', subtitle: 'What are you looking for?' },
  { title: 'Your reputation', subtitle: 'What would others say about you?' },
];

const INTRO_DURATION_SECONDS = 3;
const CARD_DURATION_SECONDS = 4; // 4 seconds for question cards
const OUTRO_DURATION_SECONDS = 4;
const TRANSITION_FRAMES = 30; // 1 second transition at 30fps

export const DriverStoryVideo = ({ driverName, driverLocation, clips, musicUrl }) => {
  const { fps } = useVideoConfig();

  const introDuration = fps * INTRO_DURATION_SECONDS;
  const cardDuration = fps * CARD_DURATION_SECONDS;
  const outroDuration = fps * OUTRO_DURATION_SECONDS;

  let currentFrame = 0;
  const sequences = [];

  // Intro with fade out
  sequences.push(
    <Sequence key="intro" from={currentFrame} durationInFrames={introDuration}>
      <FadeInOut durationInFrames={introDuration} fadeOutFrames={TRANSITION_FRAMES}>
        <IntroCard name={driverName} location={driverLocation} />
      </FadeInOut>
    </Sequence>
  );
  currentFrame += introDuration - TRANSITION_FRAMES; // Overlap with first card

  // Questions + Clips
  clips.forEach((clip, index) => {
    // Question card - overlaps with end of previous clip/intro
    sequences.push(
      <Sequence key={`card-${index}`} from={currentFrame} durationInFrames={cardDuration}>
        <FadeInOut durationInFrames={cardDuration} fadeInFrames={TRANSITION_FRAMES} fadeOutFrames={TRANSITION_FRAMES}>
          <QuestionCard
            number={index + 1}
            title={QUESTIONS[index]?.title || `Question ${index + 1}`}
            subtitle={QUESTIONS[index]?.subtitle || ''}
          />
        </FadeInOut>
      </Sequence>
    );
    currentFrame += cardDuration - TRANSITION_FRAMES; // Overlap card with clip start

    // Use full clip duration - no trimming
    const clipDuration = clip.durationInFrames || fps * 60;

    sequences.push(
      <Sequence key={`clip-${index}`} from={currentFrame} durationInFrames={clipDuration}>
        <FadeInOut durationInFrames={clipDuration} fadeInFrames={TRANSITION_FRAMES} fadeOutFrames={TRANSITION_FRAMES}>
          <BrandedVideoFrame name={driverName} location={driverLocation} videoUrl={clip.url} />
        </FadeInOut>
      </Sequence>
    );
    currentFrame += clipDuration - TRANSITION_FRAMES; // Overlap with next card
  });

  // Outro - overlaps with end of last clip
  sequences.push(
    <Sequence key="outro" from={currentFrame} durationInFrames={outroDuration}>
      <FadeInOut durationInFrames={outroDuration} fadeInFrames={TRANSITION_FRAMES}>
        <OutroCard />
      </FadeInOut>
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#004751' }}>
      {sequences}
      {musicUrl && (
        <Audio src={musicUrl} volume={0.10} />
      )}
    </AbsoluteFill>
  );
};

// Fade transition wrapper
const FadeInOut = ({ children, durationInFrames, fadeInFrames = 0, fadeOutFrames = 0 }) => {
  const frame = useCurrentFrame();

  // Build input/output ranges avoiding duplicates
  const inputRange = [];
  const outputRange = [];

  if (fadeInFrames > 0) {
    inputRange.push(0, fadeInFrames);
    outputRange.push(0, 1);
  } else {
    inputRange.push(0);
    outputRange.push(1);
  }

  if (fadeOutFrames > 0) {
    const fadeOutStart = durationInFrames - fadeOutFrames;
    if (fadeOutStart > inputRange[inputRange.length - 1]) {
      inputRange.push(fadeOutStart, durationInFrames);
      outputRange.push(1, 0);
    }
  }

  const opacity = inputRange.length > 1
    ? interpolate(frame, inputRange, outputRange, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

const IntroCard = ({ name, location }) => {
  // Format name as "First L." (first name + last initial)
  const formatName = (fullName) => {
    if (!fullName) return 'Driver';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0];
    return `${firstName} ${lastInitial}.`;
  };

  const displayName = formatName(name);

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
      <Img
        src="https://pub-422282bc0284434c83ea29192d0e301c.r2.dev/assets/FW-Logo-White.png"
        style={{
          width: 120,
          height: 120,
          marginBottom: 48,
        }}
      />

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
        {displayName}
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
      <Img
        src="https://pub-422282bc0284434c83ea29192d0e301c.r2.dev/assets/FW-Logo-White.png"
        style={{
          width: 120,
          height: 120,
          marginBottom: 32,
        }}
      />

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
            fontSize: 32,
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

// Branded frame overlay on video clips
const BrandedVideoFrame = ({ name, location, videoUrl }) => {
  const formatName = (fullName) => {
    if (!fullName) return 'Driver';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0];
    return `${firstName} ${lastInitial}.`;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Video */}
      <OffthreadVideo
        src={videoUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Top gradient + logo */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(to bottom, rgba(0,71,81,0.8) 0%, rgba(0,71,81,0) 100%)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 24,
        }}
      >
        <Img
          src="https://pub-422282bc0284434c83ea29192d0e301c.r2.dev/assets/FW-Logo-White.png"
          style={{ width: 48, height: 48 }}
        />
      </div>

      {/* Bottom gradient + name/location */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 140,
          background: 'linear-gradient(to top, rgba(0,71,81,0.9) 0%, rgba(0,71,81,0) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 32,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: 'Georgia, serif',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {formatName(name)}
        </div>
        {location && (
          <div
            style={{
              fontSize: 22,
              color: '#CDF95C',
              fontWeight: 600,
              marginTop: 4,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            {location}
          </div>
        )}
      </div>
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
      <Img
        src="https://pub-422282bc0284434c83ea29192d0e301c.r2.dev/assets/FW-Logo-White.png"
        style={{
          width: 120,
          height: 120,
          marginBottom: 48,
        }}
      />

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
        FreeWorld
      </div>

      <div
        style={{
          fontSize: 32,
          color: '#B0CDD4',
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        Connecting talent with opportunity
      </div>

      <div
        style={{
          fontSize: 32,
          color: '#CDF95C',
          fontWeight: 600,
        }}
      >
        www.freeworld.org
      </div>
    </AbsoluteFill>
  );
};

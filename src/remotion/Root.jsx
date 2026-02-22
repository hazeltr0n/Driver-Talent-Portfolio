import { Composition } from 'remotion';
import { DriverStoryVideo } from './DriverStoryVideo.jsx';

const FPS = 30;
const INTRO_DURATION = 3 * FPS;
const CARD_DURATION = 4 * FPS; // 4 seconds for question cards
const OUTRO_DURATION = 4 * FPS;
const TRANSITION_FRAMES = 30; // 1 second overlap

const calculateDuration = ({ props }) => {
  const { clips } = props;

  // Intro (minus overlap with first card)
  let totalFrames = INTRO_DURATION - TRANSITION_FRAMES;

  for (const clip of clips) {
    // Question card (minus overlap with clip)
    totalFrames += CARD_DURATION - TRANSITION_FRAMES;

    // Clip duration based on speech timing or default
    const trimStart = clip.trimStart ?? 0;
    const trimEnd = clip.trimEnd ?? null;

    let clipDuration;
    if (trimEnd !== null && trimEnd > trimStart) {
      const speechDuration = trimEnd - trimStart;
      clipDuration = Math.ceil((speechDuration + 3) * FPS); // +3s buffer
    } else {
      clipDuration = clip.durationInFrames || FPS * 45;
    }

    // Clip (minus overlap with next card)
    totalFrames += clipDuration - TRANSITION_FRAMES;
  }

  // Outro (full duration, no overlap after)
  totalFrames += OUTRO_DURATION;

  return {
    durationInFrames: totalFrames,
  };
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="DriverStoryVideo"
        component={DriverStoryVideo}
        durationInFrames={30 * 60}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          driverName: 'Driver Name',
          driverLocation: 'City, State',
          clips: [],
          musicUrl: null,
        }}
        calculateMetadata={calculateDuration}
      />
    </>
  );
};

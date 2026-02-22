import { Composition } from 'remotion';
import { DriverStoryVideo } from './DriverStoryVideo.jsx';

const FPS = 30;
const INTRO_DURATION = 3 * FPS;
const CARD_DURATION = 2 * FPS;
const OUTRO_DURATION = 4 * FPS;

const calculateDuration = ({ props }) => {
  const { clips } = props;

  let totalFrames = INTRO_DURATION;

  for (const clip of clips) {
    // Question card
    totalFrames += CARD_DURATION;

    // Clip duration based on speech timing or default
    const trimStart = clip.trimStart ?? 0;
    const trimEnd = clip.trimEnd ?? null;

    if (trimEnd !== null && trimEnd > trimStart) {
      const speechDuration = trimEnd - trimStart;
      totalFrames += Math.ceil((speechDuration + 1) * FPS);
    } else {
      totalFrames += clip.durationInFrames || FPS * 30;
    }
  }

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
        }}
        calculateMetadata={calculateDuration}
      />
    </>
  );
};

import { Composition } from 'remotion';
import { DriverStoryVideo } from './DriverStoryVideo.jsx';

const FPS = 30;
const INTRO_DURATION = 3 * FPS;
const CARD_DURATION = 4 * FPS; // 4 seconds for question cards
const OUTRO_DURATION = 4 * FPS;
const TRANSITION_FRAMES = 30; // 1 second overlap

const calculateDuration = async ({ props }) => {
  const { clips } = props;

  // Duration already set by render-service using ffprobe
  const clipsWithDuration = clips.map((clip, index) => {
    console.log(`[Clip ${index + 1}] ${(clip.durationInFrames / FPS).toFixed(1)}s (${clip.durationInFrames} frames)`);
    return clip;
  });

  // Intro (minus overlap with first card)
  let totalFrames = INTRO_DURATION - TRANSITION_FRAMES;

  for (const clip of clipsWithDuration) {
    // Question card (minus overlap with clip)
    totalFrames += CARD_DURATION - TRANSITION_FRAMES;
    // Clip (minus overlap with next card)
    totalFrames += clip.durationInFrames - TRANSITION_FRAMES;
  }

  // Outro (full duration, no overlap after)
  totalFrames += OUTRO_DURATION;

  return {
    durationInFrames: totalFrames,
    props: {
      ...props,
      clips: clipsWithDuration, // Pass clips with actual durations
    },
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

import { Composition } from 'remotion';
import { getVideoMetadata } from '@remotion/media-utils';
import { DriverStoryVideo } from './DriverStoryVideo.jsx';

const FPS = 30;
const INTRO_DURATION = 3 * FPS;
const CARD_DURATION = 4 * FPS; // 4 seconds for question cards
const OUTRO_DURATION = 4 * FPS;
const TRANSITION_FRAMES = 30; // 1 second overlap

const calculateDuration = async ({ props }) => {
  const { clips } = props;

  // Get actual video durations from files
  const clipsWithDuration = await Promise.all(
    clips.map(async (clip) => {
      try {
        const metadata = await getVideoMetadata(clip.url);
        return {
          ...clip,
          durationInFrames: Math.ceil(metadata.durationInSeconds * FPS),
        };
      } catch (e) {
        // Fallback if can't read metadata
        return {
          ...clip,
          durationInFrames: clip.durationInFrames || FPS * 30,
        };
      }
    })
  );

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

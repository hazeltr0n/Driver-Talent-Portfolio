import { Composition } from 'remotion';
import { DriverStoryVideo } from './DriverStoryVideo.jsx';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="DriverStoryVideo"
        component={DriverStoryVideo}
        durationInFrames={30 * 60 * 8}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          driverName: 'James H.',
          driverLocation: 'Dallas, TX',
          clips: [],
        }}
      />
    </>
  );
};

import { Composition } from 'remotion';
import { YulaDemo } from './Composition';
import './styles.css';

// Video specs: 1920x1080 at 30fps
// Total duration: 5 scenes with 4 transitions
// Scenes: 12s + 12s + 12s + 14s + 10s = 60s raw
// Transitions overlap by 20 frames each = 4 * 20 = 80 frames
// Total: (60 * 30) - 80 = 1720 frames ≈ 57.3 seconds
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="YulaDemo"
      component={YulaDemo}
      durationInFrames={1720}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};

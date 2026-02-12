import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

// ============================================
// MAIN COMPOSITION
// ============================================
export const YulaDemo: React.FC = () => {
  const { fps } = useVideoConfig();

  // Scene durations in frames
  const SCENE_1_DURATION = 12 * fps; // Memory Liberty
  const SCENE_2_DURATION = 12 * fps; // Unified Mind
  const SCENE_3_DURATION = 12 * fps; // Agentic Integration
  const SCENE_4_DURATION = 14 * fps; // PAC Moment
  const SCENE_5_DURATION = 10 * fps; // Outro

  const TRANSITION_DURATION = 20; // ~0.67 seconds

  return (
    <AbsoluteFill style={{ backgroundColor: '#050505' }}>
      <TransitionSeries>
        {/* Scene 1: Memory Liberty */}
        <TransitionSeries.Sequence durationInFrames={SCENE_1_DURATION}>
          <Scene1MemoryLiberty />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 2: Unified Mind */}
        <TransitionSeries.Sequence durationInFrames={SCENE_2_DURATION}>
          <Scene2UnifiedMind />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 3: Agentic Integration */}
        <TransitionSeries.Sequence durationInFrames={SCENE_3_DURATION}>
          <Scene3AgenticIntegration />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 4: PAC Moment */}
        <TransitionSeries.Sequence durationInFrames={SCENE_4_DURATION}>
          <Scene4PACMoment />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 5: Outro */}
        <TransitionSeries.Sequence durationInFrames={SCENE_5_DURATION}>
          <Scene5Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

// ============================================
// SHARED STYLES
// ============================================
const COLORS = {
  bg: '#050505',
  surface: '#0a0a0a',
  amber: '#F59E0B',
  amberGlow: 'rgba(245, 158, 11, 0.4)',
  white: '#ffffff',
  white90: 'rgba(255, 255, 255, 0.9)',
  white70: 'rgba(255, 255, 255, 0.7)',
  white50: 'rgba(255, 255, 255, 0.5)',
  white30: 'rgba(255, 255, 255, 0.3)',
  white10: 'rgba(255, 255, 255, 0.1)',
  green: '#4ade80',
  purple: '#8B5CF6',
};

const glassStyle: React.CSSProperties = {
  background: 'rgba(10, 10, 10, 0.8)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${COLORS.white10}`,
  borderRadius: 16,
};

// ============================================
// SCENE 1: MEMORY LIBERTY
// ============================================
const Scene1MemoryLiberty: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation timeline
  const containerAppear = spring({ frame, fps, config: { damping: 200 } });
  const fileAppearFrame = 1.5 * fps;
  const fileDragFrame = 2.5 * fps;
  const fileAbsorbFrame = 4.5 * fps;
  const successFrame = 6 * fps;
  const textFrame = 8 * fps;

  // Container scale and opacity
  const containerScale = interpolate(containerAppear, [0, 1], [0.9, 1]);
  const containerOpacity = interpolate(containerAppear, [0, 1], [0, 1]);

  // File position (from outside to center)
  const fileProgress = interpolate(
    frame,
    [fileAppearFrame, fileDragFrame, fileAbsorbFrame],
    [0, 0.8, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }
  );
  const fileX = interpolate(fileProgress, [0, 1], [-300, 0]);
  const fileY = interpolate(fileProgress, [0, 1], [-150, 0]);

  // Absorption effect
  const absorbProgress = interpolate(
    frame,
    [fileAbsorbFrame, fileAbsorbFrame + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const fileScale = interpolate(absorbProgress, [0, 1], [1, 0]);
  const fileOpacity = interpolate(absorbProgress, [0, 0.5, 1], [1, 0.8, 0]);

  // Success badge
  const successAppear = frame >= successFrame
    ? spring({ frame: frame - successFrame, fps, config: { damping: 200 } })
    : 0;

  // Text overlay
  const textAppear = frame >= textFrame
    ? spring({ frame: frame - textFrame, fps, config: { damping: 200 } })
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 30%, rgba(124, 58, 237, 0.1) 0%, transparent 50%),
                     radial-gradient(ellipse at 70% 70%, rgba(245, 158, 11, 0.08) 0%, transparent 50%),
                     ${COLORS.bg}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Main Container */}
      <div
        style={{
          transform: `scale(${containerScale})`,
          opacity: containerOpacity,
          ...glassStyle,
          width: 600,
          height: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Drop Zone */}
        {absorbProgress < 1 && (
          <div
            style={{
              width: 400,
              height: 200,
              borderRadius: 16,
              border: `2px dashed ${fileProgress > 0.5 ? COLORS.amber : COLORS.white30}`,
              background: fileProgress > 0.5 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <UploadIcon color={fileProgress > 0.5 ? COLORS.amber : COLORS.white30} />
            <span style={{ color: COLORS.white50, fontSize: 16 }}>
              {fileProgress > 0.5 ? 'Release to import' : 'Drop your AI memories here'}
            </span>
            <div style={{ display: 'flex', gap: 16, color: COLORS.white30, fontSize: 14 }}>
              <span>ChatGPT</span>
              <span>•</span>
              <span>Claude</span>
              <span>•</span>
              <span>Gemini</span>
            </div>
          </div>
        )}

        {/* Yula Core (after absorption) */}
        {absorbProgress >= 0.8 && (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.amber}, #ea580c)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 60px ${COLORS.amberGlow}`,
              opacity: interpolate(absorbProgress, [0.8, 1], [0, 1]),
              transform: `scale(${interpolate(absorbProgress, [0.8, 1], [0.5, 1])})`,
            }}
          >
            <SparkIcon color={COLORS.white} size={60} />
          </div>
        )}

        {/* Dragged File */}
        {frame >= fileAppearFrame && absorbProgress < 1 && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${fileX}px), calc(-50% + ${fileY}px)) scale(${fileScale})`,
              opacity: fileOpacity,
            }}
          >
            <FileIcon />
          </div>
        )}

        {/* Particles during absorption */}
        {absorbProgress > 0 && absorbProgress < 1 && (
          <Particles progress={absorbProgress} />
        )}

        {/* Success Badge */}
        {successAppear > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              ...glassStyle,
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: successAppear,
              transform: `translateY(${interpolate(successAppear, [0, 1], [20, 0])}px)`,
            }}
          >
            <CheckCircleIcon color={COLORS.green} />
            <span style={{ color: COLORS.white90, fontSize: 16, fontWeight: 500 }}>
              247 memories imported
            </span>
          </div>
        )}
      </div>

      {/* Bottom Text */}
      {textAppear > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            ...glassStyle,
            padding: '16px 32px',
            opacity: textAppear,
            transform: `translateY(${interpolate(textAppear, [0, 1], [20, 0])}px)`,
          }}
        >
          <TypewriterText
            text="Your memory. Platform independent."
            frame={frame - textFrame}
            fps={fps}
            style={{ color: COLORS.white, fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 2: UNIFIED MIND
// ============================================
const Scene2UnifiedMind: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const models = [
    { id: 'gpt', name: 'GPT-5.2', color: '#10B981', angle: -60 },
    { id: 'claude', name: 'Claude 4.5', color: COLORS.amber, angle: 60 },
    { id: 'groq', name: 'Groq', color: COLORS.purple, angle: 180 },
  ];

  const centerAppear = spring({ frame, fps, config: { damping: 200 } });
  const modelSwitchFrame = 3 * fps;
  const councilFrame = 6 * fps;
  const textFrame = 9 * fps;

  const activeModel = frame < modelSwitchFrame ? 'gpt' : 'claude';
  const councilActive = frame >= councilFrame;

  const textAppear = frame >= textFrame
    ? spring({ frame: frame - textFrame, fps, config: { damping: 200 } })
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, rgba(124, 58, 237, 0.1) 0%, transparent 60%), ${COLORS.bg}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Central Memory Node */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: `linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))`,
          border: `2px solid ${councilActive ? COLORS.amber : COLORS.white10}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: councilActive
            ? `0 0 60px ${COLORS.amberGlow}, 0 0 120px rgba(245, 158, 11, 0.2)`
            : `0 0 30px rgba(255,255,255,0.1)`,
          opacity: centerAppear,
          transform: `scale(${interpolate(centerAppear, [0, 1], [0.8, 1])})`,
        }}
      >
        <BrainIcon color={COLORS.white70} size={48} />
        <span style={{ color: COLORS.white50, fontSize: 11, marginTop: 8 }}>Unified Memory</span>
      </div>

      {/* Model Nodes */}
      {models.map((model, index) => {
        const nodeDelay = index * 8;
        const nodeAppear = frame >= nodeDelay
          ? spring({ frame: frame - nodeDelay, fps, config: { damping: 200 } })
          : 0;

        const isActive = activeModel === model.id || councilActive;
        const radius = 200;
        const angleRad = (model.angle * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const y = Math.sin(angleRad) * radius;

        // Pulse effect for active
        const pulse = isActive ? Math.sin(frame * 0.15) * 0.5 + 0.5 : 0;

        return (
          <div key={model.id}>
            {/* Connection Line */}
            {isActive && nodeAppear > 0.5 && (
              <ConnectionLine
                x1={0}
                y1={0}
                x2={x}
                y2={y}
                color={model.color}
                progress={councilActive ? 1 : interpolate(nodeAppear, [0.5, 1], [0, 1])}
              />
            )}

            {/* Node */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                opacity: nodeAppear,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: isActive
                    ? `linear-gradient(135deg, ${model.color}40, ${model.color}20)`
                    : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${isActive ? model.color : COLORS.white10}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isActive ? `0 0 ${20 + pulse * 20}px ${model.color}40` : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: isActive ? model.color : COLORS.white30,
                  }}
                >
                  {model.name.charAt(0)}
                </span>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  marginTop: 8,
                  color: isActive ? model.color : COLORS.white50,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {model.name}
              </div>
              {councilActive && (
                <div style={{ textAlign: 'center', color: COLORS.white30, fontSize: 12, marginTop: 4 }}>
                  Contributing
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Council Mode Badge */}
      {councilActive && (
        <div
          style={{
            position: 'absolute',
            top: 100,
            ...glassStyle,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            opacity: interpolate(frame - councilFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: COLORS.green,
            }}
          />
          <span style={{ color: COLORS.white90, fontWeight: 500 }}>Council Mode Active</span>
        </div>
      )}

      {/* Bottom Text */}
      {textAppear > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            ...glassStyle,
            padding: '16px 32px',
            opacity: textAppear,
            transform: `translateY(${interpolate(textAppear, [0, 1], [20, 0])}px)`,
          }}
        >
          <TypewriterText
            text="One Memory. Any Model."
            frame={frame - textFrame}
            fps={fps}
            style={{ color: COLORS.white, fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 3: AGENTIC INTEGRATION
// ============================================
const Scene3AgenticIntegration: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerAppear = spring({ frame, fps, config: { damping: 200 } });
  const notionFrame = 2 * fps;
  const figmaFrame = 3.5 * fps;
  const designFrame = 5 * fps;
  const textFrame = 9 * fps;

  const notionConnected = frame >= notionFrame;
  const figmaConnected = frame >= figmaFrame;
  const designProgress = frame >= designFrame
    ? interpolate(frame - designFrame, [0, 3 * fps], [0, 1], { extrapolateRight: 'clamp' })
    : 0;

  const textAppear = frame >= textFrame
    ? spring({ frame: frame - textFrame, fps, config: { damping: 200 } })
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 70% 30%, rgba(245, 158, 11, 0.08) 0%, transparent 50%), ${COLORS.bg}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Main Workspace Container */}
      <div
        style={{
          ...glassStyle,
          width: 900,
          height: 550,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          opacity: containerAppear,
          transform: `scale(${interpolate(containerAppear, [0, 1], [0.95, 1])})`,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${COLORS.white10}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <span style={{ color: COLORS.white50, fontSize: 14 }}>Yula Workspace</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <IntegrationBadge name="Notion" icon="N" connected={notionConnected} />
            <IntegrationBadge name="Figma" icon="F" connected={figmaConnected} />
          </div>
        </div>

        {/* Split Content */}
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Left: Chat */}
          <div style={{ width: '45%', borderRight: `1px solid ${COLORS.white10}`, padding: 24 }}>
            {/* User Message */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <div
                style={{
                  ...glassStyle,
                  padding: '12px 16px',
                  maxWidth: 280,
                }}
              >
                <TypewriterText
                  text="Design a login flow based on my Notion brand guidelines."
                  frame={frame}
                  fps={fps}
                  style={{ color: COLORS.white90, fontSize: 14 }}
                />
              </div>
            </div>

            {/* Yula Response */}
            {frame >= 60 && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    ...glassStyle,
                    padding: 16,
                    maxWidth: 300,
                    borderLeft: `3px solid ${COLORS.amber}`,
                  }}
                >
                  <ActionStep text="Reading brand guidelines..." complete={notionConnected} frame={frame - 60} fps={fps} />
                  {notionConnected && (
                    <ActionStep text="Generating UI with Figma..." complete={figmaConnected} frame={frame - 90} fps={fps} />
                  )}
                  {figmaConnected && (
                    <ActionStep text="Login flow designed. Preview ready." complete={designProgress > 0.5} frame={frame - 120} fps={fps} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div style={{ flex: 1, padding: 24, background: 'rgba(0,0,0,0.2)' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 12,
                border: `1px solid ${COLORS.white10}`,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '8px 16px',
                  borderBottom: `1px solid ${COLORS.white10}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: COLORS.white50, fontSize: 12 }}>Live Preview</span>
                <span style={{ color: COLORS.amber, fontSize: 12 }}>{Math.round(designProgress * 100)}%</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LoginPreview progress={designProgress} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Text */}
      {textAppear > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            ...glassStyle,
            padding: '16px 32px',
            opacity: textAppear,
            transform: `translateY(${interpolate(textAppear, [0, 1], [20, 0])}px)`,
          }}
        >
          <TypewriterText
            text="Connected to your tools. Not just a chat."
            frame={frame - textFrame}
            fps={fps}
            style={{ color: COLORS.white, fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 4: PAC MOMENT
// ============================================
const Scene4PACMoment: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline
  const chatFrame = 0;
  const replyFrame = 1.5 * fps;
  const clockFrame = 3 * fps;
  const pacFrame = 6 * fps;
  const cursorFrame = 9 * fps;
  const clickFrame = 10 * fps;
  const textFrame = 11 * fps;

  const showChat = frame < clockFrame + 30;
  const showClock = frame >= clockFrame && frame < pacFrame;
  const showPac = frame >= pacFrame;

  const chatOpacity = interpolate(
    frame,
    [0, 15, clockFrame, clockFrame + 30],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const clockProgress = showClock
    ? interpolate(frame - clockFrame, [0, 3 * fps], [0, 1], { extrapolateRight: 'clamp' })
    : 0;

  const pacAppear = showPac
    ? spring({ frame: frame - pacFrame, fps, config: { damping: 200 } })
    : 0;

  const cursorProgress = frame >= cursorFrame
    ? interpolate(frame - cursorFrame, [0, fps], [0, 1], { extrapolateRight: 'clamp' })
    : 0;

  const clicked = frame >= clickFrame;

  const textAppear = frame >= textFrame
    ? spring({ frame: frame - textFrame, fps, config: { damping: 200 } })
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Chat Messages */}
      {showChat && (
        <div
          style={{
            ...glassStyle,
            width: 500,
            padding: 24,
            opacity: chatOpacity,
          }}
        >
          {/* User message */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ ...glassStyle, padding: '12px 16px', maxWidth: 300 }}>
              <TypewriterText
                text="Great work. Let's deploy this tomorrow."
                frame={frame - chatFrame}
                fps={fps}
                style={{ color: COLORS.white90, fontSize: 14 }}
              />
            </div>
          </div>

          {/* Yula reply */}
          {frame >= replyFrame && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ ...glassStyle, padding: '12px 16px', maxWidth: 300, borderLeft: `3px solid ${COLORS.amber}` }}>
                <TypewriterText
                  text="Understood. Deployment queued for tomorrow."
                  frame={frame - replyFrame}
                  fps={fps}
                  style={{ color: COLORS.white90, fontSize: 14 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clock Animation */}
      {showClock && (
        <ClockDial progress={clockProgress} />
      )}

      {/* PAC Notification */}
      {showPac && (
        <div
          style={{
            ...glassStyle,
            width: 400,
            border: `1px solid rgba(245, 158, 11, 0.3)`,
            boxShadow: `0 0 40px ${COLORS.amberGlow}`,
            opacity: pacAppear,
            transform: `scale(${interpolate(pacAppear, [0, 1], [0.9, 1])})`,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${COLORS.white10}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${COLORS.amber}, #ea580c)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircleIcon color={COLORS.white} size={20} />
            </div>
            <div>
              <div style={{ color: COLORS.amber, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>PAC Alert</div>
              <div style={{ color: COLORS.white, fontSize: 18, fontWeight: 600 }}>It's deployment time.</div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 20 }}>
            <p style={{ color: COLORS.white70, marginBottom: 16 }}>
              I've prepared the Playwright tests and opened the PR.
            </p>

            {/* Tasks */}
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                padding: 12,
                border: `1px solid ${COLORS.white10}`,
              }}
            >
              <div style={{ color: COLORS.white50, fontSize: 12, marginBottom: 8 }}>Prepared tasks:</div>
              <TaskItem text="Playwright tests generated (12 scenarios)" status="done" />
              <TaskItem text="PR #47 opened with deployment config" status="done" />
              <TaskItem text="Waiting for your approval" status="pending" />
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              padding: 20,
              borderTop: `1px solid ${COLORS.white10}`,
              display: 'flex',
              gap: 12,
            }}
          >
            <button
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 12,
                border: 'none',
                background: `linear-gradient(135deg, ${COLORS.amber}, #ea580c)`,
                color: COLORS.white,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transform: clicked ? 'scale(0.95)' : 'scale(1)',
                boxShadow: clicked ? `0 0 40px ${COLORS.amberGlow}` : `0 0 20px rgba(245, 158, 11, 0.3)`,
              }}
            >
              Approve
            </button>
            <button
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 12,
                border: 'none',
                background: 'rgba(255,255,255,0.1)',
                color: COLORS.white70,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Review First
            </button>
          </div>

          {/* Cursor */}
          {cursorProgress > 0 && !clicked && (
            <Cursor
              x={interpolate(cursorProgress, [0, 1], [200, 100])}
              y={interpolate(cursorProgress, [0, 1], [200, 280])}
            />
          )}
        </div>
      )}

      {/* Bottom Text */}
      {textAppear > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              ...glassStyle,
              padding: '16px 32px',
              opacity: textAppear,
              transform: `translateY(${interpolate(textAppear, [0, 1], [20, 0])}px)`,
            }}
          >
            <TypewriterText
              text="Proactive Agentic Callback."
              frame={frame - textFrame}
              fps={fps}
              style={{ color: COLORS.white, fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}
            />
          </div>
          <div
            style={{
              ...glassStyle,
              padding: '10px 24px',
              opacity: interpolate(textAppear, [0.3, 1], [0, 1], { extrapolateLeft: 'clamp' }),
            }}
          >
            <span style={{ color: COLORS.amber, fontSize: 18, fontWeight: 500 }}>
              It remembers when you don't.
            </span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ============================================
// SCENE 5: OUTRO
// ============================================
const Scene5Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoAppear = spring({ frame, fps, config: { damping: 200 } });
  const textAppear = frame >= 1.5 * fps
    ? spring({ frame: frame - 1.5 * fps, fps, config: { damping: 200 } })
    : 0;
  const subtextAppear = frame >= 2.5 * fps
    ? spring({ frame: frame - 2.5 * fps, fps, config: { damping: 200 } })
    : 0;
  const ctaAppear = frame >= 4 * fps
    ? spring({ frame: frame - 4 * fps, fps, config: { damping: 200 } })
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, rgba(245, 158, 11, 0.15) 0%, transparent 50%), ${COLORS.bg}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${COLORS.amber}, #ea580c)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 80px ${COLORS.amberGlow}, 0 0 160px rgba(245, 158, 11, 0.2)`,
          opacity: logoAppear,
          transform: `scale(${interpolate(logoAppear, [0, 1], [0.5, 1])})`,
        }}
      >
        <SparkIcon color={COLORS.white} size={80} />
      </div>

      {/* YULA Text */}
      <div
        style={{
          marginTop: 32,
          opacity: textAppear,
          transform: `translateY(${interpolate(textAppear, [0, 1], [20, 0])}px)`,
        }}
      >
        <h1
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: -4,
            textShadow: `0 0 40px ${COLORS.amberGlow}, 0 0 80px rgba(245, 158, 11, 0.3)`,
            margin: 0,
          }}
        >
          YULA.
        </h1>
      </div>

      {/* Subtext */}
      <div
        style={{
          marginTop: 16,
          opacity: subtextAppear,
          transform: `translateY(${interpolate(subtextAppear, [0, 1], [20, 0])}px)`,
        }}
      >
        <p style={{ fontSize: 24, fontWeight: 500, color: COLORS.white70, margin: 0 }}>
          The Proactive AI Operating System.
        </p>
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 48,
          padding: '16px 40px',
          borderRadius: 999,
          border: `2px solid ${COLORS.amber}`,
          boxShadow: `0 0 30px ${COLORS.amberGlow}`,
          opacity: ctaAppear,
          transform: `scale(${interpolate(ctaAppear, [0, 1], [0.9, 1])})`,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 600, color: COLORS.amber }}>
          yula.dev
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

// Typewriter Text
const TypewriterText: React.FC<{
  text: string;
  frame: number;
  fps: number;
  style?: React.CSSProperties;
  speed?: number;
}> = ({ text, frame, fps, style, speed = 2 }) => {
  const charsToShow = Math.min(text.length, Math.floor(frame / speed));
  const displayText = text.slice(0, charsToShow);

  return <span style={style}>{displayText}</span>;
};

// Particles
const Particles: React.FC<{ progress: number }> = ({ progress }) => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    angle: (i / 20) * Math.PI * 2,
    offset: i * 0.02,
  }));

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const particleProgress = Math.max(0, Math.min(1, (progress - p.offset) * 1.5));
        const radius = interpolate(particleProgress, [0, 1], [150, 0]);
        const x = Math.cos(p.angle) * radius;
        const y = Math.sin(p.angle) * radius;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: COLORS.amber,
              boxShadow: `0 0 10px ${COLORS.amber}`,
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              opacity: 1 - particleProgress,
            }}
          />
        );
      })}
    </div>
  );
};

// Connection Line
const ConnectionLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  progress: number;
}> = ({ x1, y1, x2, y2, color, progress }) => {
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: length * progress,
        height: 2,
        background: `linear-gradient(90deg, ${color}80, ${color}20)`,
        boxShadow: `0 0 10px ${color}60`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%',
      }}
    />
  );
};

// Clock Dial
const ClockDial: React.FC<{ progress: number }> = ({ progress }) => {
  const rotation = progress * 720; // 2 full rotations
  const opacity = interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  const scale = interpolate(progress, [0, 0.1, 0.9, 1], [0.8, 1, 1, 0.8]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: `2px solid ${COLORS.white30}`,
          background: 'rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* Hour hand */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '50%',
            width: 4,
            height: 40,
            background: COLORS.amber,
            borderRadius: 2,
            transformOrigin: 'bottom center',
            transform: `translateX(-50%) rotate(${rotation}deg)`,
          }}
        />
        {/* Center dot */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: COLORS.amber,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 20px ${COLORS.amberGlow}`,
          }}
        />
      </div>
      <div style={{ color: COLORS.white70, fontSize: 18, marginTop: 24 }}>
        24 hours later...
      </div>
    </div>
  );
};

// Integration Badge
const IntegrationBadge: React.FC<{ name: string; icon: string; connected: boolean }> = ({
  name,
  icon,
  connected,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      background: connected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)',
      color: connected ? COLORS.green : COLORS.white50,
      fontSize: 12,
      fontWeight: 500,
    }}
  >
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        background: connected ? (name === 'Notion' ? '#000' : '#A259FF') : COLORS.white10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        color: COLORS.white,
      }}
    >
      {icon}
    </span>
    {name}
    {connected && <span style={{ color: COLORS.green }}>✓</span>}
  </div>
);

// Action Step
const ActionStep: React.FC<{ text: string; complete: boolean; frame: number; fps: number }> = ({
  text,
  complete,
  frame,
  fps,
}) => {
  if (frame < 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: complete ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {complete ? (
          <span style={{ color: COLORS.green, fontSize: 12 }}>✓</span>
        ) : (
          <div
            style={{
              width: 10,
              height: 10,
              border: `2px solid ${COLORS.white30}`,
              borderTopColor: COLORS.white70,
              borderRadius: '50%',
            }}
          />
        )}
      </div>
      <span style={{ color: complete ? COLORS.white70 : COLORS.white50, fontSize: 13 }}>{text}</span>
    </div>
  );
};

// Login Preview
const LoginPreview: React.FC<{ progress: number }> = ({ progress }) => {
  const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ width: 260, opacity }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${COLORS.amber}, #ea580c)`,
          }}
        />
        <span style={{ color: COLORS.white, fontWeight: 600, fontSize: 16 }}>Acme Corp</span>
      </div>

      {/* Form */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: COLORS.white50, fontSize: 11, marginBottom: 4, display: 'block' }}>Email</label>
        <div
          style={{
            height: 36,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            border: `1px solid ${COLORS.white10}`,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ color: COLORS.white70, fontSize: 13 }}>user@example.com</span>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: COLORS.white50, fontSize: 11, marginBottom: 4, display: 'block' }}>Password</label>
        <div
          style={{
            height: 36,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            border: `1px solid ${COLORS.white10}`,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ color: COLORS.white70, fontSize: 13 }}>••••••••</span>
        </div>
      </div>
      <button
        style={{
          width: '100%',
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: `linear-gradient(135deg, ${COLORS.amber}, #ea580c)`,
          color: COLORS.white,
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        Sign In
      </button>
    </div>
  );
};

// Task Item
const TaskItem: React.FC<{ text: string; status: 'done' | 'pending' }> = ({ text, status }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: status === 'done' ? COLORS.green : '#eab308',
      }}
    />
    <span style={{ color: COLORS.white70, fontSize: 13 }}>{text}</span>
  </div>
);

// Cursor
const Cursor: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      pointerEvents: 'none',
    }}
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.86a.5.5 0 0 0-.85.35Z"
        fill="#fff"
        stroke="#000"
        strokeWidth="1"
      />
    </svg>
  </div>
);

// Icons
const SparkIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

const UploadIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
    <path d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const CheckCircleIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

const BrainIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

const FileIcon: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div
      style={{
        width: 70,
        height: 90,
        borderRadius: 8,
        background: 'linear-gradient(135deg, #10B981, #0d9488)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
      }}
    >
      <svg width="36" height="36" viewBox="0 0 20 20" fill="#fff">
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          clipRule="evenodd"
        />
      </svg>
    </div>
    <span style={{ marginTop: 8, color: COLORS.white70, fontSize: 12, fontFamily: 'monospace' }}>
      conversations.json
    </span>
  </div>
);

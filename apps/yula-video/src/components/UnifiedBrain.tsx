import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';

interface UnifiedBrainProps {
  frame: number;
  activeModel: 'gpt' | 'claude' | 'groq';
  councilActive: boolean;
}

export const UnifiedBrain: React.FC<UnifiedBrainProps> = ({
  frame,
  activeModel,
  councilActive,
}) => {
  const { fps } = useVideoConfig();

  const models = [
    { id: 'gpt', name: 'GPT-5.2', color: '#10B981', x: -250, y: -120 },
    { id: 'claude', name: 'Claude 4.5', color: '#F59E0B', x: 250, y: -120 },
    { id: 'groq', name: 'Groq', color: '#8B5CF6', x: 0, y: 180 },
  ];

  // Council activation animation
  const councilProgress = councilActive
    ? spring({ frame: frame, fps, config: { damping: 20 } })
    : 0;

  return (
    <div className="relative w-[900px] h-[600px]">
      {/* Central Memory Node */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className="w-32 h-32 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center"
          style={{
            boxShadow: councilActive
              ? '0 0 60px rgba(245, 158, 11, 0.4), 0 0 120px rgba(245, 158, 11, 0.2)'
              : '0 0 30px rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="text-center">
            <svg className="w-12 h-12 text-white/80 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span className="text-xs text-white/60 mt-1 block">Unified Memory</span>
          </div>
        </div>

        {/* Pulsing rings */}
        {councilActive && (
          <>
            <div
              className="absolute inset-0 rounded-full border border-yula-amber/30"
              style={{
                transform: `scale(${1.5 + councilProgress * 0.5})`,
                opacity: 0.5 - councilProgress * 0.3,
              }}
            />
            <div
              className="absolute inset-0 rounded-full border border-yula-amber/20"
              style={{
                transform: `scale(${2 + councilProgress * 0.7})`,
                opacity: 0.3 - councilProgress * 0.2,
              }}
            />
          </>
        )}
      </div>

      {/* Model Nodes */}
      {models.map((model, index) => {
        const isActive = activeModel === model.id || councilActive;
        const nodeDelay = index * 5;
        const nodeAppear = spring({
          frame: frame - nodeDelay,
          fps,
          config: { damping: 15 },
        });

        return (
          <div
            key={model.id}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(calc(-50% + ${model.x}px), calc(-50% + ${model.y}px))`,
              opacity: interpolate(nodeAppear, [0, 1], [0, 1]),
            }}
          >
            <ModelNode
              name={model.name}
              color={model.color}
              active={isActive}
              councilActive={councilActive}
              frame={frame}
            />

            {/* Connection line to center */}
            {isActive && (
              <ConnectionBeam
                startX={0}
                startY={0}
                endX={-model.x}
                endY={-model.y}
                color={model.color}
                progress={councilActive ? councilProgress : 1}
                active={true}
              />
            )}
          </div>
        );
      })}

      {/* Model Selector UI */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 glass rounded-full px-2 py-2 flex gap-2">
        {models.map((model) => (
          <button
            key={model.id}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all
              ${
                activeModel === model.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/50'
              }
            `}
            style={{
              borderColor: activeModel === model.id ? model.color : 'transparent',
              borderWidth: 1,
            }}
          >
            {model.name}
          </button>
        ))}
      </div>

      {/* Council Mode Indicator */}
      {councilActive && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 glass rounded-full px-6 py-3 flex items-center gap-3"
          style={{
            opacity: councilProgress,
            transform: `translateX(-50%) translateY(${interpolate(councilProgress, [0, 1], [-20, 0])}px)`,
          }}
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/90 font-medium">Council Mode Active</span>
        </div>
      )}

      {/* Context Indicator */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center">
        <div className="glass rounded-lg px-6 py-4 max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-yula-amber" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs text-white/50 uppercase tracking-wider">Shared Context</span>
          </div>
          <p className="text-sm text-white/70">
            247 memories • Last sync: 2 min ago • All models have access
          </p>
        </div>
      </div>
    </div>
  );
};

interface ModelNodeProps {
  name: string;
  color: string;
  active: boolean;
  councilActive: boolean;
  frame: number;
}

const ModelNode: React.FC<ModelNodeProps> = ({ name, color, active, councilActive, frame }) => {
  const pulse = Math.sin(frame * 0.1) * 0.5 + 0.5;

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300"
        style={{
          background: active
            ? `linear-gradient(135deg, ${color}40, ${color}20)`
            : 'rgba(255,255,255,0.05)',
          border: `2px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
          boxShadow: active
            ? `0 0 ${20 + pulse * 20}px ${color}40`
            : 'none',
        }}
      >
        <span className="text-2xl font-bold" style={{ color: active ? color : 'rgba(255,255,255,0.3)' }}>
          {name.charAt(0)}
        </span>
      </div>
      <span
        className="mt-2 text-sm font-medium"
        style={{ color: active ? color : 'rgba(255,255,255,0.5)' }}
      >
        {name}
      </span>
      {councilActive && (
        <span className="text-xs text-white/40 mt-1">Contributing</span>
      )}
    </div>
  );
};

interface ConnectionBeamProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  progress: number;
  active: boolean;
}

const ConnectionBeam: React.FC<ConnectionBeamProps> = ({
  startX,
  startY,
  endX,
  endY,
  color,
  progress,
  active,
}) => {
  if (!active) return null;

  const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: startX + 40,
        top: startY + 40,
        width: length * progress,
        height: 2,
        background: `linear-gradient(90deg, ${color}80, ${color}20)`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%',
        boxShadow: `0 0 10px ${color}60`,
      }}
    />
  );
};

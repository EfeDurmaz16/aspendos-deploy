import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';

interface MemoryImporterProps {
  dragStartFrame: number;
  dragEndFrame: number;
  currentFrame: number;
}

export const MemoryImporter: React.FC<MemoryImporterProps> = ({
  dragStartFrame,
  dragEndFrame,
  currentFrame,
}) => {
  const { fps } = useVideoConfig();

  // File animation states
  const isDragging = currentFrame >= dragStartFrame && currentFrame < dragEndFrame;
  const isAbsorbed = currentFrame >= dragEndFrame;

  // File position during drag
  const fileX = interpolate(
    currentFrame,
    [dragStartFrame, dragEndFrame - 30],
    [-200, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const fileY = interpolate(
    currentFrame,
    [dragStartFrame, dragEndFrame - 30],
    [-100, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Absorption animation
  const absorptionProgress = isAbsorbed
    ? spring({
        frame: currentFrame - dragEndFrame,
        fps,
        config: { damping: 15, stiffness: 100 },
      })
    : 0;

  const fileScale = isAbsorbed ? interpolate(absorptionProgress, [0, 1], [1, 0]) : 1;
  const fileOpacity = isAbsorbed ? interpolate(absorptionProgress, [0, 0.8, 1], [1, 0.5, 0]) : 1;

  // Particle generation
  const particleCount = 50;
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    angle: (i / particleCount) * Math.PI * 2,
    delay: i * 0.5,
    speed: 0.5 + Math.random() * 0.5,
    size: 3 + Math.random() * 4,
  }));

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Drop Zone */}
      <div
        className={`
          relative w-96 h-64 rounded-2xl border-2 border-dashed
          transition-all duration-300 flex flex-col items-center justify-center gap-4
          ${isDragging ? 'border-yula-amber bg-yula-amber/10 scale-105' : 'border-white/20 bg-white/5'}
        `}
      >
        {!isAbsorbed && (
          <>
            {/* Upload Icon */}
            <svg
              className={`w-16 h-16 transition-colors ${isDragging ? 'text-yula-amber' : 'text-white/30'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <span className="text-white/50 text-lg">
              {isDragging ? 'Release to import' : 'Drop your AI memories here'}
            </span>
            <div className="flex gap-4 text-sm text-white/30">
              <span>ChatGPT</span>
              <span>•</span>
              <span>Claude</span>
              <span>•</span>
              <span>Gemini</span>
            </div>
          </>
        )}

        {/* Yula Core (Absorption Target) */}
        {isAbsorbed && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: interpolate(absorptionProgress, [0, 0.5, 1], [0, 1, 1]),
            }}
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yula-amber to-orange-600 glow-amber flex items-center justify-center">
              <svg className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Dragged File */}
      {currentFrame >= dragStartFrame && !isAbsorbed && (
        <div
          className="absolute pointer-events-none"
          style={{
            transform: `translate(${fileX}px, ${fileY}px) scale(${fileScale})`,
            opacity: fileOpacity,
          }}
        >
          <FileIcon name="conversations.json" type="chatgpt" />
        </div>
      )}

      {/* Particles during absorption */}
      {isAbsorbed && absorptionProgress < 1 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((particle) => {
            const progress = Math.max(0, absorptionProgress - particle.delay / 30);
            const x = Math.cos(particle.angle) * (200 - progress * 200);
            const y = Math.sin(particle.angle) * (200 - progress * 200);
            const opacity = 1 - progress;
            const scale = 1 - progress * 0.5;

            return (
              <div
                key={particle.id}
                className="absolute left-1/2 top-1/2 rounded-full bg-yula-amber"
                style={{
                  width: particle.size,
                  height: particle.size,
                  transform: `translate(${x}px, ${y}px) scale(${scale})`,
                  opacity,
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.8)',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Success State */}
      {isAbsorbed && absorptionProgress >= 0.9 && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 glass rounded-full px-6 py-3 flex items-center gap-3"
          style={{
            opacity: interpolate(absorptionProgress, [0.9, 1], [0, 1]),
            transform: `translateX(-50%) translateY(${interpolate(absorptionProgress, [0.9, 1], [20, 0])}px)`,
          }}
        >
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-white/90 font-medium">247 memories imported</span>
        </div>
      )}
    </div>
  );
};

interface FileIconProps {
  name: string;
  type: 'chatgpt' | 'claude';
}

const FileIcon: React.FC<FileIconProps> = ({ name, type }) => {
  const colors = {
    chatgpt: 'from-emerald-500 to-teal-600',
    claude: 'from-orange-400 to-amber-600',
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-20 h-24 rounded-lg bg-gradient-to-br ${colors[type]} shadow-lg flex items-center justify-center`}
      >
        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <span className="mt-2 text-sm text-white/70 font-mono">{name}</span>
    </div>
  );
};

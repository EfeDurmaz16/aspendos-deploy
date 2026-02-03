import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface YulaLogoProps {
  size?: number;
}

export const YulaLogo: React.FC<YulaLogoProps> = ({ size = 120 }) => {
  const frame = useCurrentFrame();

  // Continuous subtle animation
  const pulse = Math.sin(frame * 0.05) * 0.5 + 0.5;
  const rotation = interpolate(frame, [0, 300], [0, 360], {
    extrapolateRight: 'extend',
  });

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from ${rotation}deg, rgba(245, 158, 11, 0.3), rgba(124, 58, 237, 0.3), rgba(245, 158, 11, 0.3))`,
          filter: `blur(${20 + pulse * 10}px)`,
          transform: `scale(${1.2 + pulse * 0.1})`,
        }}
      />

      {/* Inner glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%)',
          transform: `scale(${1.1 + pulse * 0.05})`,
        }}
      />

      {/* Main logo circle */}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
          boxShadow: `
            0 0 ${30 + pulse * 20}px rgba(245, 158, 11, 0.5),
            0 0 ${60 + pulse * 40}px rgba(245, 158, 11, 0.3),
            inset 0 2px 10px rgba(255, 255, 255, 0.3)
          `,
        }}
      >
        {/* Spark Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-white"
          style={{
            width: size * 0.5,
            height: size * 0.5,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </div>

      {/* Orbiting particles */}
      {[0, 1, 2].map((i) => {
        const angle = rotation * (1 + i * 0.3) + i * 120;
        const radius = size * 0.6;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 6,
              height: 6,
              background: i === 0 ? '#F59E0B' : i === 1 ? '#8B5CF6' : '#10B981',
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 10px ${i === 0 ? '#F59E0B' : i === 1 ? '#8B5CF6' : '#10B981'}`,
              opacity: 0.7 + pulse * 0.3,
            }}
          />
        );
      })}
    </div>
  );
};

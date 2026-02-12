import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';

interface SyncStatusProps {
  frame: number;
  status: string;
  complete: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ frame, status, complete }) => {
  const { fps } = useVideoConfig();

  const appear = spring({ frame, fps, config: { damping: 20 } });
  const slideY = interpolate(appear, [0, 1], [50, 0]);
  const opacity = interpolate(appear, [0, 1], [0, 1]);

  return (
    <div
      style={{
        transform: `translateY(${slideY}px)`,
        opacity,
      }}
    >
      <div className="glass rounded-full px-5 py-2.5 flex items-center gap-3">
        {!complete ? (
          <>
            {/* Spinning loader */}
            <div className="w-4 h-4 border-2 border-yula-amber/30 border-t-yula-amber rounded-full animate-spin" />
            <span className="text-sm text-white/70">{status}</span>
          </>
        ) : (
          <>
            {/* Check mark */}
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-white/70">{status.replace('...', '')} [Done]</span>
          </>
        )}

        {/* Integration icons */}
        <div className="flex items-center gap-1 ml-2 pl-3 border-l border-white/10">
          <IntegrationIcon type="obsidian" active={complete} />
        </div>
      </div>
    </div>
  );
};

interface IntegrationIconProps {
  type: 'obsidian' | 'notion' | 'roam';
  active?: boolean;
}

const IntegrationIcon: React.FC<IntegrationIconProps> = ({ type, active }) => {
  return (
    <div
      className={`
        w-6 h-6 rounded flex items-center justify-center text-xs font-bold
        ${active ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/30'}
      `}
    >
      {type === 'obsidian' && 'O'}
      {type === 'notion' && 'N'}
      {type === 'roam' && 'R'}
    </div>
  );
};

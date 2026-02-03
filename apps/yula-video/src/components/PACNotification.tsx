import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';

interface PACNotificationProps {
  frame: number;
  title: string;
  message: string;
  actions: string[];
  cursorPosition: number; // 0-1, position of cursor moving to button
  clicked: boolean;
}

export const PACNotification: React.FC<PACNotificationProps> = ({
  frame,
  title,
  message,
  actions,
  cursorPosition,
  clicked,
}) => {
  const { fps } = useVideoConfig();

  // Slide-in animation
  const slideIn = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const translateX = interpolate(slideIn, [0, 1], [500, 0]);
  const opacity = interpolate(slideIn, [0, 1], [0, 1]);

  // Click flash effect
  const clickFlash = clicked
    ? spring({
        frame: frame - Math.floor(cursorPosition * fps),
        fps,
        config: { damping: 10, stiffness: 200 },
      })
    : 0;

  return (
    <div
      className="relative"
      style={{
        transform: `translateX(${translateX}px)`,
        opacity,
      }}
    >
      {/* Notification Card */}
      <div
        className="w-[420px] rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: `
            0 0 40px rgba(245, 158, 11, 0.2),
            0 25px 50px -12px rgba(0, 0, 0, 0.5)
          `,
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
          {/* PAC Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yula-amber to-orange-600 flex items-center justify-center glow-amber">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-yula-amber uppercase tracking-wider">
                PAC Alert
              </span>
              <span className="text-xs text-white/30">Just now</span>
            </div>
            <h3 className="text-lg font-semibold text-white mt-0.5">{title}</h3>
          </div>
          {/* Pulse indicator */}
          <div className="w-2 h-2 rounded-full bg-yula-amber animate-pulse" />
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-white/70 leading-relaxed">{message}</p>

          {/* Task Preview */}
          <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <span>Prepared tasks:</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-center gap-2 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Playwright tests generated (12 scenarios)
              </li>
              <li className="flex items-center gap-2 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                PR #47 opened with deployment config
              </li>
              <li className="flex items-center gap-2 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                Waiting for your approval
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-white/10 flex gap-3">
          {actions.map((action, index) => (
            <button
              key={action}
              className={`
                flex-1 py-3 rounded-xl font-medium text-sm transition-all
                ${
                  index === 0
                    ? 'bg-gradient-to-r from-yula-amber to-orange-600 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }
              `}
              style={{
                transform: index === 0 && clicked ? `scale(${1 - clickFlash * 0.05})` : 'none',
                boxShadow:
                  index === 0 && clicked
                    ? `0 0 ${30 + clickFlash * 20}px rgba(245, 158, 11, ${0.4 + clickFlash * 0.3})`
                    : index === 0
                    ? '0 0 20px rgba(245, 158, 11, 0.3)'
                    : 'none',
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Cursor */}
      {cursorPosition > 0 && !clicked && (
        <Cursor
          x={interpolate(cursorPosition, [0, 1], [300, 100])}
          y={interpolate(cursorPosition, [0, 1], [300, 280])}
        />
      )}

      {/* Click Effect */}
      {clicked && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: 100,
            top: 280,
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: '2px solid rgba(245, 158, 11, 0.5)',
            transform: `scale(${1 + clickFlash * 2})`,
            opacity: 1 - clickFlash,
          }}
        />
      )}
    </div>
  );
};

interface CursorProps {
  x: number;
  y: number;
}

const Cursor: React.FC<CursorProps> = ({ x, y }) => {
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
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
};

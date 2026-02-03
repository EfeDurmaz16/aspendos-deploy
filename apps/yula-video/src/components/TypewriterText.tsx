import React from 'react';

interface TypewriterTextProps {
  text: string;
  startFrame: number;
  currentFrame: number;
  speed?: number; // characters per frame
  className?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame,
  currentFrame,
  speed = 1.5,
  className = '',
}) => {
  const frame = currentFrame - startFrame;
  if (frame < 0) return null;

  const charsToShow = Math.min(Math.floor(frame * speed), text.length);
  const displayText = text.slice(0, charsToShow);
  const showCursor = charsToShow < text.length;

  return (
    <span className={className}>
      {displayText}
      {showCursor && (
        <span className="inline-block w-0.5 h-[1em] bg-yula-amber ml-0.5 animate-pulse" />
      )}
    </span>
  );
};

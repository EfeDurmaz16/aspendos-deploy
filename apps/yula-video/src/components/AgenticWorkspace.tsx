import React from 'react';
import { interpolate, spring, useVideoConfig } from 'remotion';
import { TypewriterText } from './TypewriterText';

interface AgenticWorkspaceProps {
  frame: number;
  notionConnected: boolean;
  figmaConnected: boolean;
  designProgress: number;
  inputText: string;
}

export const AgenticWorkspace: React.FC<AgenticWorkspaceProps> = ({
  frame,
  notionConnected,
  figmaConnected,
  designProgress,
  inputText,
}) => {
  const { fps } = useVideoConfig();

  return (
    <div className="relative w-[1100px] h-[650px] glass-strong rounded-2xl overflow-hidden">
      {/* Window Chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/30">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-sm text-white/50 font-medium">Yula Workspace</span>
        </div>
        <div className="flex gap-2">
          <IntegrationBadge
            name="Notion"
            icon="N"
            color="#000000"
            connected={notionConnected}
            frame={frame}
          />
          <IntegrationBadge
            name="Figma"
            icon="F"
            color="#A259FF"
            connected={figmaConnected}
            frame={frame}
          />
        </div>
      </div>

      {/* Split View */}
      <div className="flex h-[calc(100%-48px)]">
        {/* Left: Chat Panel */}
        <div className="w-1/2 border-r border-white/10 p-6 flex flex-col">
          <div className="flex-1 space-y-4">
            {/* User Input */}
            <div className="flex justify-end">
              <div className="glass rounded-2xl px-6 py-4 max-w-md">
                <TypewriterText
                  text={inputText}
                  startFrame={0}
                  currentFrame={frame}
                  speed={2}
                  className="text-white/90"
                />
              </div>
            </div>

            {/* Yula Response with Actions */}
            {frame >= 60 && (
              <div className="flex justify-start">
                <div className="glass-strong rounded-2xl px-6 py-4 max-w-lg border-l-2 border-yula-amber">
                  <div className="space-y-3">
                    {/* Action Steps */}
                    <ActionStep
                      icon="search"
                      text="Reading brand guidelines from Notion..."
                      complete={notionConnected}
                      frame={frame - 60}
                    />
                    {notionConnected && (
                      <ActionStep
                        icon="palette"
                        text="Generating UI with Figma integration..."
                        complete={figmaConnected}
                        frame={frame - 90}
                      />
                    )}
                    {figmaConnected && (
                      <ActionStep
                        icon="check"
                        text="Login flow designed. Preview ready."
                        complete={designProgress > 0.5}
                        frame={frame - 120}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="mt-4">
            <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-white/30">Ask Yula anything...</span>
            </div>
          </div>
        </div>

        {/* Right: Live Preview Canvas */}
        <div className="w-1/2 bg-black/20 p-6">
          <div className="h-full rounded-xl border border-white/10 overflow-hidden">
            {/* Canvas Header */}
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/50">Live Preview</span>
              <div className="flex gap-2">
                <span className="text-xs text-yula-amber">{Math.round(designProgress * 100)}%</span>
              </div>
            </div>

            {/* Canvas Content */}
            <div className="p-8 h-[calc(100%-40px)] flex items-center justify-center">
              <LoginFlowPreview progress={designProgress} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface IntegrationBadgeProps {
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  frame: number;
}

const IntegrationBadge: React.FC<IntegrationBadgeProps> = ({
  name,
  icon,
  color,
  connected,
  frame,
}) => {
  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
        transition-all duration-300
        ${connected ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40'}
      `}
    >
      <span
        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
        style={{ background: connected ? color : 'rgba(255,255,255,0.1)' }}
      >
        {icon}
      </span>
      <span>{name}</span>
      {connected && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
};

interface ActionStepProps {
  icon: 'search' | 'palette' | 'check';
  text: string;
  complete: boolean;
  frame: number;
}

const ActionStep: React.FC<ActionStepProps> = ({ icon, text, complete, frame }) => {
  const icons = {
    search: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
    palette: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    ),
    check: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    ),
  };

  if (frame < 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          w-6 h-6 rounded-full flex items-center justify-center
          ${complete ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'}
        `}
      >
        {complete ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
      </div>
      <span className={complete ? 'text-white/70' : 'text-white/50'}>{text}</span>
    </div>
  );
};

interface LoginFlowPreviewProps {
  progress: number;
}

const LoginFlowPreview: React.FC<LoginFlowPreviewProps> = ({ progress }) => {
  const skeletonOpacity = Math.max(0, 1 - progress * 2);
  const contentOpacity = Math.min(1, progress * 2);

  return (
    <div className="w-80 relative">
      {/* Skeleton State */}
      <div
        className="absolute inset-0 space-y-4"
        style={{ opacity: skeletonOpacity }}
      >
        <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
        <div className="h-12 w-full bg-white/10 rounded animate-pulse" />
        <div className="h-12 w-full bg-white/10 rounded animate-pulse" />
        <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
      </div>

      {/* Real Content */}
      <div
        className="space-y-4"
        style={{ opacity: contentOpacity }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yula-amber to-orange-600" />
          <span className="text-lg font-semibold text-white">Acme Corp</span>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Email</label>
            <div className="h-10 px-3 rounded-lg bg-white/10 border border-white/20 flex items-center">
              <span className="text-white/70 text-sm">user@example.com</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Password</label>
            <div className="h-10 px-3 rounded-lg bg-white/10 border border-white/20 flex items-center">
              <span className="text-white/70 text-sm">••••••••</span>
            </div>
          </div>
          <button className="w-full h-10 rounded-lg bg-gradient-to-r from-yula-amber to-orange-600 text-white font-medium">
            Sign In
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">or continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social Buttons */}
        <div className="flex gap-2">
          <div className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <span className="text-white/50 text-sm">Google</span>
          </div>
          <div className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <span className="text-white/50 text-sm">GitHub</span>
          </div>
        </div>
      </div>
    </div>
  );
};

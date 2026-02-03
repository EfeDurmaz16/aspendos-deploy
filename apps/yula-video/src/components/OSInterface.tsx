import React from 'react';

interface OSInterfaceProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  showSidebar?: boolean;
}

export const OSInterface: React.FC<OSInterfaceProps> = ({
  children,
  width = 1000,
  height = 650,
  showSidebar = true
}) => {
  return (
    <div
      className="relative rounded-2xl overflow-hidden glass-strong shadow-2xl"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Window Chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/30">
        {/* Traffic lights */}
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        {/* Window title */}
        <div className="flex-1 text-center">
          <span className="text-sm text-white/50 font-medium">Yula</span>
        </div>
        {/* Spacer for symmetry */}
        <div className="w-14" />
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="absolute left-0 top-12 bottom-0 w-14 border-r border-white/10 bg-black/20 flex flex-col items-center py-3 gap-3">
          <SidebarIcon icon="home" active />
          <SidebarIcon icon="chat" />
          <SidebarIcon icon="memory" />
          <SidebarIcon icon="integrations" />
          <div className="flex-1" />
          <SidebarIcon icon="settings" />
        </div>
      )}

      {/* Main Content */}
      <div className={`absolute top-12 right-0 bottom-0 overflow-hidden ${showSidebar ? 'left-14' : 'left-0'}`}>
        {children}
      </div>

      {/* Yula Spark (Always visible in corner) */}
      <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-yula-amber to-orange-600 flex items-center justify-center shadow-lg glow-amber">
        <svg
          className="w-5 h-5 text-white"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </div>
    </div>
  );
};

interface SidebarIconProps {
  icon: 'home' | 'chat' | 'memory' | 'integrations' | 'settings';
  active?: boolean;
}

const SidebarIcon: React.FC<SidebarIconProps> = ({ icon, active }) => {
  const icons = {
    home: (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
    chat: (
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
    memory: (
      <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    ),
    integrations: (
      <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    ),
    settings: (
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    ),
  };

  return (
    <div
      className={`
        w-10 h-10 rounded-xl flex items-center justify-center transition-all
        ${active ? 'bg-white/10 text-yula-amber' : 'text-white/40 hover:text-white/70'}
      `}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        {icons[icon]}
      </svg>
    </div>
  );
};

export default {
  // Page
  title: 'Settings',
  subtitle: 'Customize your YULA experience',

  // Sections
  sections: {
    account: 'Account',
    appearance: 'Appearance',
    notifications: 'Notifications',
    privacy: 'Privacy & Data',
    integrations: 'Integrations',
    advanced: 'Advanced',
  },

  // Account
  account: {
    title: 'Account',
    email: 'Email',
    name: 'Display name',
    avatar: 'Profile picture',
    changeAvatar: 'Change picture',
    removeAvatar: 'Remove picture',
    changePassword: 'Change password',
    deleteAccount: 'Delete account',
    deleteAccountWarning: 'This action cannot be undone. All your data will be permanently deleted.',
  },

  // Appearance
  appearance: {
    title: 'Appearance',
    theme: 'Theme',
    themeOptions: {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    language: 'Language',
    fontSize: 'Font size',
    fontSizeOptions: {
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
    },
    reducedMotion: 'Reduce motion',
    reducedMotionDescription: 'Minimize animations throughout the app',
  },

  // Notifications
  notifications: {
    title: 'Notifications',
    push: 'Push notifications',
    pushDescription: 'Receive notifications on your device',
    email: 'Email notifications',
    emailDescription: 'Receive important updates via email',
    sounds: 'Sound effects',
    soundsDescription: 'Play sounds for messages and alerts',
    pacNotifications: 'Proactive callbacks',
    pacNotificationsDescription: 'Allow YULA to send proactive notifications',
  },

  // Privacy
  privacy: {
    title: 'Privacy & Data',
    memoryEnabled: 'Enable memory',
    memoryEnabledDescription: 'Allow YULA to remember information from conversations',
    analyticsEnabled: 'Usage analytics',
    analyticsEnabledDescription: 'Help improve YULA by sharing anonymous usage data',
    exportData: 'Export your data',
    exportDataDescription: 'Download all your conversations and memories',
    clearMemory: 'Clear memory',
    clearMemoryDescription: 'Delete all stored memories',
    clearMemoryWarning: 'This will permanently delete all your memories. This action cannot be undone.',
  },

  // Integrations
  integrations: {
    title: 'Integrations',
    connected: 'Connected',
    notConnected: 'Not connected',
    connect: 'Connect',
    disconnect: 'Disconnect',
    calendar: 'Calendar',
    calendarDescription: 'Sync with your calendar for better scheduling',
  },

  // Advanced
  advanced: {
    title: 'Advanced',
    engineMode: 'Engine mode',
    engineModeOptions: {
      speed: 'Speed',
      speedDescription: 'Faster responses, good for most tasks',
      deep: 'Deep',
      deepDescription: 'More thorough analysis, better for complex tasks',
    },
    preferredModels: 'Preferred models',
    preferredModelsDescription: 'Select which AI models to use',
    developerMode: 'Developer mode',
    developerModeDescription: 'Show additional debugging information',
    apiKeys: 'API keys',
    apiKeysDescription: 'Manage your API keys for external access',
  },

  // Actions
  actions: {
    save: 'Save changes',
    saved: 'Changes saved',
    reset: 'Reset to defaults',
    resetConfirm: 'Are you sure you want to reset all settings to defaults?',
  },
};

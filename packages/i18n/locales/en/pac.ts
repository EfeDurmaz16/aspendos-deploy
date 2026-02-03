export default {
  // Page
  title: 'Proactive Callbacks',
  subtitle: 'AI that reaches out when you need it',

  // Types
  types: {
    reminder: 'Reminder',
    suggestion: 'Suggestion',
    followUp: 'Follow-up',
    insight: 'Insight',
  },

  // Status
  status: {
    pending: 'Pending',
    approved: 'Approved',
    snoozed: 'Snoozed',
    dismissed: 'Dismissed',
    delivered: 'Delivered',
  },

  // Priority
  priority: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  },

  // Actions
  actions: {
    approve: 'Approve',
    snooze: 'Snooze',
    dismiss: 'Dismiss',
    reply: 'Reply',
    viewContext: 'View context',
  },

  // Snooze options
  snooze: {
    title: 'Snooze for',
    fifteenMinutes: '15 minutes',
    oneHour: '1 hour',
    threeHours: '3 hours',
    tomorrow: 'Tomorrow',
    nextWeek: 'Next week',
    custom: 'Custom...',
  },

  // Notifications
  notifications: {
    title: 'YULA Notification',
    newCallback: 'New proactive callback',
    tapToView: 'Tap to view',
  },

  // Empty states
  empty: {
    title: 'No pending callbacks',
    subtitle: 'YULA will reach out when it detects commitments in your conversations',
  },

  // Settings
  settings: {
    title: 'PAC Settings',
    enabled: 'Enable proactive callbacks',
    enabledDescription: 'Allow YULA to send you proactive notifications',
    explicitOnly: 'Explicit commitments only',
    explicitOnlyDescription: 'Only notify for clear commitments like "remind me"',
    implicitDetection: 'Implicit detection',
    implicitDetectionDescription: 'Also detect implied commitments in conversations',
    channels: {
      title: 'Notification channels',
      push: 'Push notifications',
      email: 'Email notifications',
      inApp: 'In-app notifications',
    },
    quietHours: {
      title: 'Quiet hours',
      description: 'No notifications during these hours',
      start: 'Start time',
      end: 'End time',
    },
  },

  // Demo
  demo: {
    notification1: {
      title: 'Remember your meeting prep?',
      message: 'You mentioned preparing for the Q4 review. Want me to help draft talking points?',
    },
    notification2: {
      title: "Mom's birthday is tomorrow!",
      message: "You mentioned wanting to order flowers. Should I help you find local florists?",
    },
    notification3: {
      title: 'Follow up on your project',
      message: 'You were debugging the auth issue. Did you manage to fix the token refresh?',
    },
  },
};

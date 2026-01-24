export default {
  // Page
  title: 'Billing',
  subtitle: 'Manage your subscription and usage',

  // Plans
  plans: {
    starter: {
      name: 'Starter',
      description: 'Free forever',
      price: '$0',
      period: 'month',
    },
    pro: {
      name: 'Pro',
      description: 'For power users',
      price: '$19',
      period: 'month',
      popular: 'Most popular',
    },
    ultra: {
      name: 'Ultra',
      description: 'Unlimited everything',
      price: '$49',
      period: 'month',
    },
  },

  // Features
  features: {
    chatsPerMonth: '{count} chats/month',
    unlimitedChats: 'Unlimited chats',
    memoryStorage: '{size} memory storage',
    unlimitedMemory: 'Unlimited memory',
    voiceMinutes: '{count} voice minutes/day',
    unlimitedVoice: 'Unlimited voice',
    councilMode: 'Council mode',
    pacCallbacks: 'Proactive callbacks',
    prioritySupport: 'Priority support',
    apiAccess: 'API access',
    customModels: 'Custom model selection',
    advancedAnalytics: 'Advanced analytics',
    teamFeatures: 'Team features',
  },

  // Current plan
  currentPlan: {
    title: 'Current plan',
    activeSince: 'Active since {date}',
    renewsOn: 'Renews on {date}',
    canceledOn: 'Canceled on {date}',
    expiresOn: 'Expires on {date}',
  },

  // Usage
  usage: {
    title: 'Usage this period',
    chats: 'Chats',
    chatsUsed: '{used} of {total} chats used',
    memory: 'Memory',
    memoryUsed: '{used} of {total} used',
    voice: 'Voice',
    voiceUsed: '{used} of {total} minutes used',
    tokens: 'Tokens',
    tokensUsed: '{used}K of {total}K tokens used',
    resetDate: 'Resets on {date}',
  },

  // Actions
  actions: {
    upgrade: 'Upgrade',
    downgrade: 'Downgrade',
    cancel: 'Cancel subscription',
    reactivate: 'Reactivate subscription',
    manageBilling: 'Manage billing',
    viewInvoices: 'View invoices',
    updatePayment: 'Update payment method',
  },

  // Upgrade
  upgrade: {
    title: 'Upgrade your plan',
    subtitle: 'Unlock more features and higher limits',
    currentPlan: 'Current plan',
    selectPlan: 'Select plan',
    confirm: 'Confirm upgrade',
    processing: 'Processing...',
    success: 'Upgrade successful!',
    successMessage: 'Welcome to {plan}! Your new features are now active.',
  },

  // Cancel
  cancel: {
    title: 'Cancel subscription',
    subtitle: 'We\'re sorry to see you go',
    warning: 'You will lose access to {plan} features at the end of your billing period.',
    keepPlan: 'Keep my plan',
    confirmCancel: 'Cancel subscription',
    reason: 'Help us improve',
    reasonPlaceholder: 'Why are you canceling?',
  },

  // Payment
  payment: {
    title: 'Payment method',
    cardEnding: 'Card ending in {last4}',
    expires: 'Expires {date}',
    addCard: 'Add payment method',
    updateCard: 'Update card',
    removeCard: 'Remove card',
  },

  // Invoices
  invoices: {
    title: 'Invoices',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    download: 'Download',
    paid: 'Paid',
    pending: 'Pending',
    failed: 'Failed',
    noInvoices: 'No invoices yet',
  },
};

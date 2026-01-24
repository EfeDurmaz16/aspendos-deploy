export default {
  // Page
  title: 'AI Council',
  subtitle: 'Get multiple perspectives on any question',

  // Personas
  personas: {
    logical: {
      name: 'Logic',
      description: 'Analytical and data-driven',
      trait: 'Analytical',
      model: 'Claude',
    },
    creative: {
      name: 'Creative',
      description: 'Innovative and out-of-the-box',
      trait: 'Innovative',
      model: 'GPT-4',
    },
    prudent: {
      name: 'Prudent',
      description: 'Cautious and risk-aware',
      trait: 'Cautious',
      model: 'Gemini',
    },
    swift: {
      name: 'Swift',
      description: 'Fast and efficient',
      trait: 'Fast',
      model: 'Groq',
    },
  },

  // Status
  status: {
    pending: 'Waiting...',
    thinking: 'Thinking...',
    streaming: 'Responding...',
    complete: 'Complete',
    failed: 'Failed',
  },

  // Actions
  actions: {
    askCouncil: 'Ask the Council',
    selectResponse: 'Use this response',
    compareAll: 'Compare all',
    synthesis: 'Synthesize',
    retry: 'Retry',
    retryAll: 'Retry all',
  },

  // Synthesis
  synthesis: {
    title: 'Synthesis',
    description: 'Combined insights from all perspectives',
    generating: 'Generating synthesis...',
    basedOn: 'Based on {count} perspectives',
  },

  // Selection
  selection: {
    title: 'Select a response',
    selectedResponse: 'Selected response',
    continueWith: 'Continue with this response',
    viewOthers: 'View other responses',
  },

  // Stats
  stats: {
    latency: 'Response time',
    tokens: 'Tokens used',
    model: 'Model',
    perspectives: '{count} perspectives',
  },

  // Empty state
  empty: {
    title: 'Ask the AI Council',
    subtitle: 'Get multiple perspectives from different AI models',
    examples: [
      'Should I accept this job offer?',
      'How should I approach this technical problem?',
      'What are the pros and cons of remote work?',
      'Help me make a decision about...',
    ],
  },

  // Comparison view
  comparison: {
    title: 'Compare Responses',
    similarities: 'Similarities',
    differences: 'Key differences',
    recommendation: 'Recommended choice',
  },
};

export default {
  // General
  general: {
    somethingWentWrong: 'Something went wrong',
    tryAgain: 'Please try again',
    contactSupport: 'Contact support',
    goBack: 'Go back',
    goHome: 'Go home',
  },

  // HTTP errors
  http: {
    400: 'Bad request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
    408: 'Request timeout',
    429: 'Too many requests',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
    504: 'Gateway timeout',
  },

  // Network errors
  network: {
    offline: 'You appear to be offline',
    offlineDescription: 'Please check your internet connection and try again',
    timeout: 'Request timed out',
    timeoutDescription: 'The server took too long to respond. Please try again.',
    connectionFailed: 'Connection failed',
    connectionFailedDescription: 'Unable to connect to the server. Please try again later.',
  },

  // Auth errors
  auth: {
    sessionExpired: 'Session expired',
    sessionExpiredDescription: 'Please sign in again to continue',
    unauthorized: 'Unauthorized',
    unauthorizedDescription: 'You don\'t have permission to access this resource',
    invalidToken: 'Invalid or expired token',
    accountLocked: 'Account locked',
    accountLockedDescription: 'Your account has been locked. Please contact support.',
  },

  // Rate limiting
  rateLimit: {
    title: 'Slow down',
    description: 'You\'ve made too many requests. Please wait a moment.',
    retryIn: 'Retry in {seconds} seconds',
  },

  // AI errors
  ai: {
    modelUnavailable: 'AI model unavailable',
    modelUnavailableDescription: 'The requested AI model is currently unavailable. Trying fallback...',
    generationFailed: 'Response generation failed',
    generationFailedDescription: 'Unable to generate a response. Please try again.',
    contextTooLong: 'Context too long',
    contextTooLongDescription: 'The conversation is too long. Please start a new conversation.',
    contentFiltered: 'Content filtered',
    contentFilteredDescription: 'The response was filtered due to content policy.',
  },

  // Form errors
  form: {
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    invalidUrl: 'Please enter a valid URL',
    tooShort: 'Must be at least {min} characters',
    tooLong: 'Must be no more than {max} characters',
    invalidFormat: 'Invalid format',
    passwordMismatch: 'Passwords do not match',
  },

  // File errors
  file: {
    tooLarge: 'File is too large',
    tooLargeDescription: 'Maximum file size is {maxSize}MB',
    invalidType: 'Invalid file type',
    invalidTypeDescription: 'Supported formats: {formats}',
    uploadFailed: 'Upload failed',
    uploadFailedDescription: 'Unable to upload file. Please try again.',
  },

  // Feature errors
  feature: {
    notAvailable: 'Feature not available',
    notAvailableDescription: 'This feature is not available on your current plan',
    upgradeRequired: 'Upgrade required',
    upgradeRequiredDescription: 'Please upgrade to {plan} to access this feature',
    comingSoon: 'Coming soon',
    comingSoonDescription: 'This feature is coming soon',
  },

  // 404 Page
  notFound: {
    title: 'Page not found',
    description: 'The page you\'re looking for doesn\'t exist or has been moved.',
  },

  // 500 Page
  serverError: {
    title: 'Server error',
    description: 'We\'re experiencing technical difficulties. Please try again later.',
  },

  // Maintenance
  maintenance: {
    title: 'Under maintenance',
    description: 'We\'re performing scheduled maintenance. We\'ll be back shortly.',
    eta: 'Estimated time: {time}',
  },
};

export default {
  // Page
  title: 'Import History',
  subtitle: 'Bring your conversations from other AI assistants',

  // Sources
  sources: {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    other: 'Other',
  },

  // Upload
  upload: {
    title: 'Upload your export file',
    description: 'Drag and drop your export file here, or click to browse',
    browse: 'Browse files',
    supportedFormats: 'Supported formats: JSON, ZIP',
    maxSize: 'Max file size: 100MB',
    uploading: 'Uploading...',
    processing: 'Processing...',
  },

  // Instructions
  instructions: {
    chatgpt: {
      title: 'How to export from ChatGPT',
      steps: [
        'Go to ChatGPT Settings',
        'Click on "Data Controls"',
        'Click "Export data"',
        'Wait for the email with your download link',
        'Download and upload the ZIP file here',
      ],
    },
    claude: {
      title: 'How to export from Claude',
      steps: [
        'Go to Claude Settings',
        'Navigate to "Your Data"',
        'Click "Export conversations"',
        'Download the exported file',
        'Upload the file here',
      ],
    },
  },

  // Preview
  preview: {
    title: 'Preview import',
    subtitle: 'Review and select which conversations to import',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    selected: '{count} selected',
    conversations: '{count} conversation',
    conversations_plural: '{count} conversations',
    messages: '{count} message',
    messages_plural: '{count} messages',
  },

  // Import progress
  progress: {
    importing: 'Importing...',
    imported: 'Imported {current} of {total}',
    complete: 'Import complete!',
    failed: 'Import failed',
  },

  // Results
  results: {
    success: 'Successfully imported!',
    conversationsImported: '{count} conversation imported',
    conversationsImported_plural: '{count} conversations imported',
    messagesImported: '{count} message imported',
    messagesImported_plural: '{count} messages imported',
    viewConversations: 'View conversations',
    importMore: 'Import more',
  },

  // Errors
  errors: {
    invalidFile: 'Invalid file format',
    fileTooLarge: 'File is too large',
    parsingFailed: 'Failed to parse file',
    importFailed: 'Import failed',
    noConversations: 'No conversations found in file',
  },
};

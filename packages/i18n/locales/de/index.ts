// German translations
// TODO: Translate from English base

import en from '../en';

// Override with German translations as they become available
export default {
  ...en,
  common: {
    ...en.common,
    appName: 'YULA',
    tagline: 'Ihr Universeller Lernassistent',
    loading: 'Wird geladen...',
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    close: 'Schließen',
    back: 'Zurück',
    next: 'Weiter',
    finish: 'Fertig',
    skip: 'Überspringen',
    confirm: 'Bestätigen',
    submit: 'Absenden',
    search: 'Suchen',
    searchPlaceholder: 'Suchen...',
    noResults: 'Keine Ergebnisse gefunden',
    retry: 'Erneut versuchen',
    learnMore: 'Mehr erfahren',
    getStarted: 'Loslegen',
    nav: {
      home: 'Startseite',
      chat: 'Chat',
      memory: 'Speicher',
      settings: 'Einstellungen',
      billing: 'Abrechnung',
      help: 'Hilfe',
      logout: 'Abmelden',
    },
  },
  onboarding: {
    ...en.onboarding,
    welcome: {
      ...en.onboarding.welcome,
      title: 'Willkommen bei YULA',
      subtitle: 'Ihr Universeller Lernassistent',
      startTour: 'Tour Starten',
      skipTour: 'Überspringen und selbst erkunden',
    },
  },
};

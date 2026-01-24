// French translations
// TODO: Translate from English base

import en from '../en';

// Override with French translations as they become available
export default {
  ...en,
  common: {
    ...en.common,
    appName: 'YULA',
    tagline: 'Votre Assistant d\'Apprentissage Universel',
    loading: 'Chargement...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    finish: 'Terminer',
    skip: 'Passer',
    confirm: 'Confirmer',
    submit: 'Soumettre',
    search: 'Rechercher',
    searchPlaceholder: 'Rechercher...',
    noResults: 'Aucun résultat trouvé',
    retry: 'Réessayer',
    learnMore: 'En savoir plus',
    getStarted: 'Commencer',
    nav: {
      home: 'Accueil',
      chat: 'Chat',
      memory: 'Mémoire',
      settings: 'Paramètres',
      billing: 'Facturation',
      help: 'Aide',
      logout: 'Déconnexion',
    },
  },
  onboarding: {
    ...en.onboarding,
    welcome: {
      ...en.onboarding.welcome,
      title: 'Bienvenue sur YULA',
      subtitle: 'Votre Assistant d\'Apprentissage Universel',
      startTour: 'Commencer la Visite',
      skipTour: 'Passer et explorer par moi-même',
    },
  },
};

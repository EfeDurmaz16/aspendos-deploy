// Spanish translations
// TODO: Translate from English base

import en from '../en';

// Override with Spanish translations as they become available
export default {
  ...en,
  common: {
    ...en.common,
    appName: 'YULA',
    tagline: 'Tu Asistente de Aprendizaje Universal',
    loading: 'Cargando...',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    finish: 'Finalizar',
    skip: 'Omitir',
    confirm: 'Confirmar',
    submit: 'Enviar',
    search: 'Buscar',
    searchPlaceholder: 'Buscar...',
    noResults: 'No se encontraron resultados',
    retry: 'Reintentar',
    learnMore: 'Más información',
    getStarted: 'Comenzar',
    nav: {
      home: 'Inicio',
      chat: 'Chat',
      memory: 'Memoria',
      settings: 'Configuración',
      billing: 'Facturación',
      help: 'Ayuda',
      logout: 'Cerrar sesión',
    },
  },
  onboarding: {
    ...en.onboarding,
    welcome: {
      ...en.onboarding.welcome,
      title: 'Bienvenido a YULA',
      subtitle: 'Tu Asistente de Aprendizaje Universal',
      startTour: 'Iniciar el Tour',
      skipTour: 'Omitir y explorar por mi cuenta',
    },
  },
};

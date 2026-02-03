// @aspendos/i18n - Internationalization package
// Re-export config and types

export {
  locales,
  defaultLocale,
  localeNames,
  localeFlags,
  namespaces,
  isValidLocale,
  getLocaleFromHeader,
  type Locale,
  type Namespace,
} from './config';

// Import all locale messages
import en from './locales/en';
import tr from './locales/tr';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';

export const messages = {
  en,
  tr,
  es,
  fr,
  de,
} as const;

export type Messages = typeof messages.en;

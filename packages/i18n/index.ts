// @aspendos/i18n - Internationalization package
// Re-export config and types

export {
    defaultLocale,
    getLocaleFromHeader,
    isValidLocale,
    type Locale,
    localeFlags,
    localeNames,
    locales,
    type Namespace,
    namespaces,
} from './config';

import de from './locales/de';
// Import all locale messages
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import tr from './locales/tr';

export const messages = {
    en,
    tr,
    es,
    fr,
    de,
} as const;

export type Messages = typeof messages.en;

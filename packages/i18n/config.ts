// i18n Configuration
// Supported locales and their metadata

export const locales = ['en', 'tr', 'es', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
    en: 'English',
    tr: 'Türkçe',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
};

export const localeFlags: Record<Locale, string> = {
    en: '🇺🇸',
    tr: '🇹🇷',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
};

// Namespaces used in the app
export const namespaces = [
    'common',
    'auth',
    'onboarding',
    'chat',
    'import',
    'pac',
    'council',
    'settings',
    'billing',
    'errors',
] as const;

export type Namespace = (typeof namespaces)[number];

// Helper to check if a locale is valid
export function isValidLocale(locale: string): locale is Locale {
    return locales.includes(locale as Locale);
}

// Get locale from Accept-Language header
export function getLocaleFromHeader(acceptLanguage: string | null): Locale {
    if (!acceptLanguage) return defaultLocale;

    const languages = acceptLanguage
        .split(',')
        .map((lang) => {
            const [code, q = '1'] = lang.trim().split(';q=');
            return { code: code.split('-')[0].toLowerCase(), quality: parseFloat(q) };
        })
        .sort((a, b) => b.quality - a.quality);

    for (const { code } of languages) {
        if (isValidLocale(code)) return code;
    }

    return defaultLocale;
}

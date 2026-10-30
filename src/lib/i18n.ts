import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCore from '@/locales/en/core.json';
import enNiche from '@/locales/en/niche.json';
import ptCore from '@/locales/pt-BR/core.json';
import ptNiche from '@/locales/pt-BR/niche.json';
import { niche } from '@/niche/config';

export const LANGUAGES = ['pt-BR', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

// Two namespaces: `core` (generic UI, the default) and `niche` (brand, attributes, tags…).
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { core: ptCore, niche: ptNiche },
      en: { core: enCore, niche: enNiche },
    },
    ns: ['core', 'niche'],
    defaultNS: 'core',
    fallbackLng: 'pt-BR',
    supportedLngs: [...LANGUAGES],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: `${niche.app}.locale`,
    },
  });

const syncDocument = () => {
  document.documentElement.lang = i18n.language;
  document.title = i18n.t('niche:brand.name');
};
i18n.on('languageChanged', syncDocument);
i18n.on('initialized', syncDocument);
if (i18n.isInitialized) syncDocument();

export const currentLanguage = (): Language => (i18n.language?.startsWith('en') ? 'en' : 'pt-BR');

export default i18n;

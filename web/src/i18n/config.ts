import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import trCommon from './locales/tr/common.json';
import enCommon from './locales/en/common.json';

const savedLanguage = typeof window !== 'undefined' ? localStorage.getItem('language') || 'tr' : 'tr';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: enCommon
            },
            tr: {
                translation: trCommon
            }
        },
        lng: savedLanguage,
        fallbackLng: 'tr',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: {
                    "welcome": "Welcome to Sublex",
                    "media_list": "Media List",
                    "words": "Words"
                }
            },
            tr: {
                translation: {
                    "welcome": "Sublex'e Hoşgeldiniz",
                    "media_list": "Medya Listesi",
                    "words": "Kelimeler"
                }
            }
        },
        lng: "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

import { useTranslation as useI18nTranslation } from 'react-i18next';

export type Namespace = 'common' | 'discover' | 'vocabulary' | 'lists' | 'profile' | 'study' | 'progress' | 'mediaRequest' | 'feedback' | 'explore';

export function useTranslation(ns: Namespace = 'common') {
  return useI18nTranslation(ns);
}

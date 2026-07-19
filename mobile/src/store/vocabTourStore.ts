import { useTourFlag } from '@/src/store/onboardingStore';

/**
 * Kelime havuzu turu — kalıcılık artık ortak onboardingStore'da ('vocab' ID'si).
 * @deprecated Yeni kod doğrudan `useTourFlag('vocab')` kullanabilir; bu
 * sarmalayıcı sadece mevcut ekran API'sini korumak için tutuluyor.
 */
export const useVocabTourStore = () => useTourFlag('vocab');

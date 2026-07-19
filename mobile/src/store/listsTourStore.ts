import { useTourFlag } from '@/src/store/onboardingStore';

/**
 * Listeler sekmesi turu — kalıcılık artık ortak onboardingStore'da ('lists' ID'si).
 * @deprecated Yeni kod doğrudan `useTourFlag('lists')` kullanabilir; bu
 * sarmalayıcı sadece mevcut ekran API'sini korumak için tutuluyor.
 */
export const useListsTourStore = () => useTourFlag('lists');

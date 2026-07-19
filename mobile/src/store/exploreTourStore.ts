import { useTourFlag } from '@/src/store/onboardingStore';

/**
 * Explore turu — kalıcılık artık ortak onboardingStore'da ('explore' ID'si).
 * @deprecated Yeni kod doğrudan `useTourFlag('explore')` kullanabilir; bu
 * sarmalayıcı sadece mevcut ekran API'sini (show/initializeTour/finishTour)
 * korumak için tutuluyor.
 */
export const useExploreTourStore = () => useTourFlag('explore');

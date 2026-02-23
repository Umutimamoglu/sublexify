import { useWindowDimensions } from 'react-native';
import { Breakpoints } from '@/src/theme/tokens';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isTablet  = width >= Breakpoints.tablet;
  const isPhone   = width < Breakpoints.tablet;
  const isLandscape = width > height;

  // phone değeri veya tablet değeri döner
  function select<T>(phone: T, tablet: T): T {
    return isTablet ? tablet : phone;
  }

  return { width, height, isTablet, isPhone, isLandscape, select };
}

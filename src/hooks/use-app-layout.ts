import { Platform, useWindowDimensions } from 'react-native';

export function useAppLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, desktop: Platform.OS === 'web' && width >= 1100 };
}

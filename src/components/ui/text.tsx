import { Text, TextProps } from 'react-native';
import { typography } from '@/theme';

export function T({
  variant = 'body',
  style,
  ...props
}: TextProps & { variant?: keyof typeof typography }) {
  return <Text {...props} style={[typography[variant], style]} />;
}

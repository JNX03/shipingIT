import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { colors } from '@/theme';

export type IconName =
  | 'learn'
  | 'project'
  | 'mentor'
  | 'compete'
  | 'profile'
  | 'spark'
  | 'momentum'
  | 'discover'
  | 'define'
  | 'scope'
  | 'prototype'
  | 'validate'
  | 'business'
  | 'build'
  | 'ship'
  | 'check'
  | 'lock'
  | 'close'
  | 'back'
  | 'next'
  | 'book'
  | 'idea'
  | 'evidence'
  | 'interview'
  | 'target'
  | 'reward'
  | 'settings'
  | 'external'
  | 'plus'
  | 'edit'
  | 'offline'
  | 'heart'
  | 'sound'
  | 'download';

// Original rounded geometry: the same 32-unit grid and 2.4-unit stroke throughout.
export function Icon({
  name,
  size = 28,
  color = colors.primary,
  filled = false,
}: {
  name: IconName | string;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  const common = {
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  const drawing = (() => {
    switch (name) {
      case 'learn':
      case 'book':
        return (
          <>
            <Path d="M16 9Q10 4 3 7v19q7-3 13 1 6-4 13-1V7q-7-3-13 2Z" />
            <Path d="M16 9v18M7 12l5 1M21 13l4-1" />
          </>
        );
      case 'project':
        return (
          <>
            <Rect x="5" y="7" width="22" height="22" rx="5" />
            <Path d="M11 7V4h10v3M10 14h12M10 20h7" />
          </>
        );
      case 'mentor':
        return (
          <>
            <Path d="M5 12 3 3l9 5M20 8l9-5-2 11" />
            <Path d="M27 15c0 7-4 12-11 12S5 23 5 16 9 7 16 7s11 2 11 8Z" />
            <Path d="M11 15v2M21 15v2M13 21q3 3 6 0" />
          </>
        );
      case 'compete':
      case 'reward':
        return (
          <>
            <Path d="M9 5h14v8c0 6-4 9-7 9s-7-3-7-9ZM9 9H4v3q0 6 6 6M23 9h5v3q0 6-6 6M16 22v5M10 28h12" />
            <Path d="m16 9 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
          </>
        );
      case 'profile':
      case 'interview':
      case 'user':
        return (
          <>
            <Circle cx="16" cy="10" r="6" />
            <Path d="M5 28v-3q0-9 11-9t11 9v3" />
          </>
        );
      case 'spark':
      case 'idea':
      case 'insight':
        return (
          <>
            <Path d="m17 2-4 10-9 4 9 4 4 10 4-10 8-4-8-4Z" fill={filled ? color : 'none'} />
            <Path d="M5 3v5M2.5 5.5h5" />
          </>
        );
      case 'momentum':
      case 'streak':
        return (
          <>
            <Path d="m18 3-8 12h7l-3 14 11-17h-8Z" fill={filled ? color : 'none'} />
            <Path d="M5 13H2M6 21H3M9 6H6" />
          </>
        );
      case 'discover':
        return (
          <>
            <Circle cx="14" cy="13" r="9" />
            <Path d="m21 20 8 8M10 13h8M14 9v8" />
          </>
        );
      case 'define':
      case 'target':
        return (
          <>
            <Circle cx="16" cy="16" r="12" />
            <Circle cx="16" cy="16" r="7" />
            <Circle cx="16" cy="16" r="2" fill={color} />
          </>
        );
      case 'scope':
        return (
          <>
            <Path d="M5 5h22L19 16v10l-6 3V16Z" />
            <Path d="M8 11h16" />
          </>
        );
      case 'prototype':
      case 'edit':
        return (
          <>
            <Path d="m7 22-2 7 7-2L28 11 21 4ZM18 7l7 7M8 21l5 5" />
            <Path d="M4 10V4h8M22 28h6v-7" />
          </>
        );
      case 'validate':
      case 'test':
        return (
          <>
            <Path d="M11 3h10M13 3v9L5 25q-2 4 3 4h16q5 0 3-4l-8-13V3M9 20h14" />
            <Path d="m13 24 2 2 5-5" />
          </>
        );
      case 'business':
        return (
          <>
            <Rect x="3" y="9" width="26" height="20" rx="5" />
            <Path d="M10 9V4h12v5M3 17q13 6 26 0M14 19h4v4h-4Z" />
          </>
        );
      case 'build':
        return (
          <>
            <Path d="m10 9-8 7 8 7M22 9l8 7-8 7M19 4l-6 24" />
          </>
        );
      case 'ship':
      case 'pitch':
        return (
          <>
            <Path d="M12 21c-4-9 7-17 16-17 0 9-8 20-17 16ZM11 13H5l-3 9 9-2M20 21v6l-9 3 2-9M7 25l-4 4" />
            <Circle cx="21" cy="11" r="3" />
          </>
        );
      case 'check':
      case 'perfect':
        return <Path d="m6 16 7 7L27 8" />;
      case 'lock':
        return (
          <>
            <Rect x="6" y="13" width="20" height="16" rx="4" />
            <Path d="M10 13V9a6 6 0 0 1 12 0v4M16 19v4" />
          </>
        );
      case 'close':
        return <Path d="m8 8 16 16M24 8 8 24" />;
      case 'back':
        return <Path d="m20 6-10 10 10 10" />;
      case 'next':
        return <Path d="m12 6 10 10-10 10" />;
      case 'plus':
        return <Path d="M16 5v22M5 16h22" />;
      case 'external':
        return (
          <>
            <Path d="M18 4h10v10M28 4 15 17M12 6H5v22h22v-8" />
          </>
        );
      case 'evidence':
        return (
          <>
            <Rect x="6" y="3" width="21" height="26" rx="4" />
            <Path d="m10 13 3 3 8-7M11 22h11" />
          </>
        );
      case 'settings':
        return (
          <>
            <Circle cx="16" cy="16" r="5" />
            <Path d="m13 3-1 5-4 2-5-1-1 5 4 3 1 4-2 4 4 4 4-3h5l4 3 4-4-2-4 1-4 4-3-1-5-5 1-4-2-1-5Z" />
          </>
        );
      case 'offline':
        return (
          <>
            <Path d="M4 12q12-12 24 0M9 17q7-7 14 0M13 22q3-3 6 0M16 27h.01M3 3l26 26" />
          </>
        );
      case 'heart':
        return <Path d="M16 28S3 20 3 11c0-8 10-10 13-2 3-8 13-6 13 2 0 9-13 17-13 17Z" />;
      case 'sound':
        return (
          <>
            <Path d="M4 12h6l8-7v22l-8-7H4ZM23 10q7 6 0 12M26 5q12 11 0 22" />
          </>
        );
      case 'download':
        return (
          <>
            <Path d="M16 3v18m-7-7 7 7 7-7M4 22v6h24v-6" />
          </>
        );
      default:
        return (
          <>
            <Circle cx="16" cy="16" r="11" />
            <Path d="m11 16 4 4 7-9" />
          </>
        );
    }
  })();
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G {...common}>{drawing}</G>
    </Svg>
  );
}

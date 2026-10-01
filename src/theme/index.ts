import { TextStyle } from 'react-native';

// DekPort blue anchors the deliberately light, playful learning environment.
export const colors = {
  primary: '#3B82F6',
  primaryPressed: '#2563EB',
  primaryDeep: '#1D4ED8',
  primarySurface: '#DDF4FF',
  secondary: '#16B8A6',
  secondaryPressed: '#0D9488',
  accent: '#FFB936',
  success: '#367B16',
  successSurface: '#D7FFB8',
  danger: '#B92D2D',
  dangerSurface: '#FFDFE0',
  warning: '#A86204',
  xp: '#BB7A08',
  streak: '#ED871B',
  premium: '#8260D7',
  premiumSurface: '#F2EDFF',
  text: '#4B4B4B',
  textSecondary: '#6B6B6B',
  muted: '#AFAFAF',
  surface: '#FFFFFF',
  background: '#FFFFFF',
  surfaceMuted: '#F7F7F7',
  border: '#E5E5E5',
  disabled: '#D4D4D4',
  path: '#E5E5E5',
  dark: '#16335D',
  peach: '#FFF2DE',
  sky: '#DDEEFF',
  transparent: 'transparent',
} as const;
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  page: 20,
  xl: 24,
  xxl: 32,
  huge: 40,
  giant: 48,
} as const;
export const radius = {
  sm: 10,
  control: 16,
  card: 16,
  large: 20,
  pill: 999,
} as const;
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_800ExtraBold',
  heavy: 'Nunito_900Black',
} as const;
export const typography = {
  hero: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 39,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 25,
    lineHeight: 32,
    color: colors.text,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 29,
    color: colors.text,
  },
  subheading: {
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 26,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 25,
    color: colors.text,
  },
  small: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  button: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.surface,
  },
} satisfies Record<string, TextStyle>;
export const motion = { fast: 120, base: 220, celebration: 650 } as const;
export const layout = {
  maxWidth: 600,
  desktopWidth: 1220,
  nodeSize: 76,
  buttonHeight: 52,
  tabHeight: 72,
} as const;

// The mobile game path has its own small set of physical, raised surfaces.
// Keep these additive so lesson/editor controls retain their established tokens.
export const pathTheme = {
  chapter: '#19ACE8',
  chapterEdge: '#148CBD',
  chapterLabel: '#D8F4FF',
  practice: '#9365CE',
  practiceEdge: '#774AB2',
  completed: '#FFCB3D',
  completedEdge: '#DAA523',
  locked: '#E7E7E7',
  lockedEdge: '#C9C9C9',
  selectedBorder: '#84DAFB',
  selectedFill: '#DDF5FF',
  node: { width: 72, height: 68, depth: 7, ring: 98, ringWidth: 6, row: 112 },
  tab: { well: 48, art: 35, height: 60 },
  contentWidth: 420,
} as const;

import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme';
import { Icon } from './icon';

export const gameIconNames = [
  'learn',
  'project',
  'mentor',
  'compete',
  'profile',
  'star',
  'checkpoint',
  'reward',
  'spark',
  'momentum',
  'discover',
  'define',
  'scope',
  'prototype',
  'validate',
  'business',
  'build',
  'ship',
  'idea',
  'evidence',
  'interview',
  'lock',
  'check',
  'boss',
  'clue',
  'reason',
] as const;

type GlyphName = (typeof gameIconNames)[number];
export type GameIconName =
  | GlyphName
  | 'lesson'
  | 'quiz'
  | 'guidebook'
  | 'book'
  | 'xp'
  | 'streak'
  | 'target'
  | 'experiment'
  | 'test'
  | 'insight'
  | 'pitch'
  | 'user'
  | 'perfect'
  | 'treasure'
  | 'achievement'
  | 'completed';
export type GameIconVariant = 'color' | 'muted' | 'white' | 'ink';

const aliases: Record<string, GlyphName> = {
  lesson: 'star',
  quiz: 'star',
  guidebook: 'learn',
  book: 'learn',
  xp: 'spark',
  streak: 'momentum',
  target: 'define',
  experiment: 'validate',
  test: 'validate',
  insight: 'idea',
  pitch: 'ship',
  user: 'profile',
  perfect: 'check',
  treasure: 'reward',
  achievement: 'compete',
  completed: 'check',
};

interface Paint {
  blue: string;
  blueBase: string;
  sky: string;
  gold: string;
  goldBase: string;
  teal: string;
  tealBase: string;
  mint: string;
  paper: string;
  ink: string;
  skin: string;
  soft: string;
  gray: string;
  grayBase: string;
}

const colorPaint: Paint = {
  blue: colors.primary,
  blueBase: colors.primaryPressed,
  sky: colors.sky,
  gold: colors.accent,
  goldBase: colors.streak,
  teal: colors.secondary,
  tealBase: colors.secondaryPressed,
  mint: colors.successSurface,
  paper: colors.surface,
  ink: colors.text,
  skin: colors.peach,
  soft: colors.dangerSurface,
  gray: colors.disabled,
  grayBase: colors.muted,
};
const mutedPaint: Paint = {
  blue: colors.disabled,
  blueBase: colors.muted,
  sky: colors.surfaceMuted,
  gold: colors.disabled,
  goldBase: colors.muted,
  teal: colors.disabled,
  tealBase: colors.muted,
  mint: colors.surfaceMuted,
  paper: colors.surface,
  ink: colors.textSecondary,
  skin: colors.surfaceMuted,
  soft: colors.border,
  gray: colors.disabled,
  grayBase: colors.muted,
};

// Original 32-unit silhouettes. The monochrome paths keep negative spaces
// without assuming the color of the lesson node beneath them.
const silhouettes: Record<GlyphName, string> = {
  learn: 'M3 7Q9 4 16 8Q23 4 29 7V27Q23 24 16 28Q9 24 3 27ZM15 10h2v14h-2Z',
  project: 'M5 4h13l4 5h5q3 0 3 3v14q0 3-3 3H5q-3 0-3-3V11q0-3 3-3ZM7 5v6h12V8l-3-3Z',
  mentor:
    'M4 15V5q0-2 2-1l6 5h8l6-5q2-1 2 1v10q2 14-12 14T4 15ZM10 16v4h3v-4ZM20 16v4h3v-4ZM13 23q3 3 6 0v-2q-3 3-6 0Z',
  compete:
    'M8 4h16v3h6v5q0 8-8 8-2 3-4 3v3h7v4H7v-4h7v-3q-2 0-4-3-8 0-8-8V7h6ZM5 10v2q0 4 4 5-1-3-1-7ZM24 10q0 4-1 7 4-1 4-5v-2Z',
  profile: 'M16 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16ZM4 29v-2q0-8 12-8t12 8v2Z',
  star: 'M14.4 3.8Q16 .8 17.6 3.8l2.8 5.9 6.5 1q3.1.5.9 2.8l-4.7 4.6 1.1 6.5q.6 3.4-2.2 1.9L16 22.4l-6 3.1q-2.8 1.5-2.2-1.9l1.1-6.5-4.7-4.6q-2.2-2.3.9-2.8l6.5-1Z',
  checkpoint: 'M6 2h4v25h18v4H3v-4h3ZM12 3q5-3 9 0t9 0v15q-5 3-9 0t-9 0Z',
  reward:
    'M3 12q0-8 8-8h10q8 0 8 8v14q0 3-3 3H6q-3 0-3-3ZM5 13v2h8v-2ZM19 13v2h8v-2ZM14 15v7h4v-7Z',
  spark:
    'M14.5 3q1.5-4 3 0l2.6 7.6 7.9 3q4 1.5 0 3l-7.9 3-2.6 7.9q-1.5 4-3 0l-2.7-7.9-7.8-3q-4-1.5 0-3l7.8-3Z',
  momentum:
    'M18 2q2-1 1.6 1.5L18 12h7q2 0 .8 1.8L15 29q-1.7 2.3-1.4-.5L15 20H8q-2 0-.6-1.9ZM3 8h6v3H3ZM1 14h4v3H1ZM3 24h6v3H3Z',
  discover:
    'M13 2a10 10 0 1 0 6.5 17.6l8.2 9q1.5 1.5 3-.1 1.4-1.5-.1-3l-8.9-8.2A10 10 0 0 0 13 2ZM13 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z',
  define:
    'M16 3a13 13 0 1 0 0 26 13 13 0 0 0 0-26ZM16 7a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM16 11a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  scope: 'M4 5h24v5l-8 9v8l-8 4V19l-8-9ZM7 1h6v3H7ZM19 1h6v3h-6Z',
  prototype: 'M9 2h14q4 0 4 4v23H5V6q0-4 4-4ZM9 7v15h14V7ZM14 25v2h4v-2Z',
  validate: 'M10 2h12v4h-2v6l9 14q2 4-3 4H6q-5 0-3-4l9-14V6h-2ZM14 7v6l-4 7h12l-4-7V7Z',
  business:
    'M11 3h10q3 0 3 3v3h4q3 0 3 3v15q0 3-3 3H4q-3 0-3-3V12q0-3 3-3h4V6q0-3 3-3ZM12 7v2h8V7ZM3 17v3h11v3h4v-3h11v-3H18v-2h-4v2Z',
  build:
    'M4 18h9q2 0 2 2v8q0 2-2 2H4q-2 0-2-2v-8q0-2 2-2ZM19 18h9q2 0 2 2v8q0 2-2 2h-9q-2 0-2-2v-8q0-2 2-2ZM11 5h10q2 0 2 2v7q0 2-2 2H11q-2 0-2-2V7q0-2 2-2ZM13 1h6v3h-6ZM6 14h5v3H6ZM21 14h5v3h-5Z',
  ship: 'M3 14 29 3 21 29l-7-8-7 6 2-11ZM11 16l3 3L25 7Z',
  idea: 'M16 2a11 11 0 0 0-7 19v4h14v-4A11 11 0 0 0 16 2ZM11 28h10v3H11Z',
  evidence:
    'M10 3h12v3h3q4 0 4 4v17q0 4-4 4H7q-4 0-4-4V10q0-4 4-4h3ZM10 14l-2 2 5 5 10-10-2-2-8 8Z',
  interview:
    'M3 3h17q3 0 3 3v10q0 3-3 3H9l-6 5v-5q-3 0-3-3V6q0-3 3-3ZM25 10h4q3 0 3 3v10q0 3-3 3v5l-6-5H13q-3 0-3-3v-2h12q3 0 3-3Z',
  lock: 'M9 13V9a7 7 0 1 1 14 0v4h2q4 0 4 4v10q0 4-4 4H7q-4 0-4-4V17q0-4 4-4ZM13 13h6V9a3 3 0 0 0-6 0ZM14 20v5h4v-5Z',
  check:
    'M5.8 15.1q1.5-1.5 3 0l4.1 4.1L23.4 8.7q1.6-1.6 3.2 0t0 3.2L14.5 24q-1.6 1.6-3.2 0l-5.5-5.6q-1.6-1.6 0-3.3Z',
  boss: 'M16 1 29 6v11q0 10-13 15Q3 27 3 17V6ZM16 8l2 5 5 .6-4 3.4 1 5-4-2.7-4 2.7 1-5-4-3.4 5-.6Z',
  clue: 'M7 3h18q3 0 3 3v22H4V6q0-3 3-3ZM8 8v3h16V8ZM8 15v3h10v-3ZM8 22v3h6v-3Z',
  reason: 'M4 6h10v5a4 4 0 1 1 0 8v7H4q-2 0-2-2V8q0-2 2-2ZM18 6h10q2 0 2 2v16q0 2-2 2H18v-7a4 4 0 1 0 0-8Z',
};

function resolveGlyph(name: string): GlyphName | undefined {
  if (Object.hasOwn(silhouettes, name)) return name as GlyphName;
  return aliases[name];
}

function Glyph({ name, p }: { name: GlyphName; p: Paint }) {
  switch (name) {
    case 'learn':
      return (
        <>
          <Path d="M3 9Q9 6 16 10Q23 6 29 9v18q-6-2-13 2-7-4-13-2Z" fill={p.blueBase} />
          <Path d="M3 7Q9 4 16 8Q23 4 29 7v18q-6-2-13 2-7-4-13-2Z" fill={p.blue} />
          <Path d="M6 8q4-1 9 2v13q-5-3-9-2ZM26 8q-4-1-9 2v13q5-3 9-2Z" fill={p.paper} />
          <Path
            d="M8 12q3 0 5 1m-5 3q3 0 5 1m6-4q2-1 5-1m-5 5q2-1 5-1"
            fill="none"
            stroke={p.sky}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );
    case 'project':
      return (
        <>
          <Rect x={5} y={3} width={19} height={23} rx={3} fill={p.blueBase} />
          <Rect x={7} y={3} width={15} height={21} rx={2} fill={p.paper} />
          <Path d="M10 7h9M10 11h6" stroke={p.sky} strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M2 13q0-3 3-3h7l3 3h12q3 0 3 3v11q0 3-3 3H5q-3 0-3-3Z" fill={p.goldBase} />
          <Path d="M2 11q0-3 3-3h6l4 4h12q3 0 3 3v10q0 3-3 3H5q-3 0-3-3Z" fill={p.gold} />
          <Rect x={6} y={17} width={14} height={3} rx={1.5} fill={p.paper} />
          <Rect x={6} y={22} width={9} height={2} rx={1} fill={p.goldBase} />
        </>
      );
    case 'mentor':
      return (
        <>
          <Path d="M4 15V5q0-2 2-1l6 5h8l6-5q2-1 2 1v10q2 14-12 14T4 15Z" fill={p.ink} />
          <Path d="m6 6 5 4-5 3Zm20 0-5 4 5 3Z" fill={p.soft} />
          <Path d="M7 15q0-7 9-7t9 7v5q0 7-9 7t-9-7Z" fill={p.skin} />
          <Path d="M6 14q1-8 10-8 7 0 10 8l-7-2-1-4-2 6-6-1-3 3Z" fill={p.ink} />
          <Rect x={10} y={17} width={3} height={4} rx={1.5} fill={p.ink} />
          <Rect x={19} y={17} width={3} height={4} rx={1.5} fill={p.ink} />
          <Path
            d="M13 23q3 3 6 0"
            stroke={p.ink}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
          <Path d="m23 10 2 1 2-1v4h-4Z" fill={p.blue} />
        </>
      );
    case 'compete':
      return (
        <>
          <Path
            d="M9 9H4v4q0 6 7 6m12-10h5v4q0 6-7 6"
            fill="none"
            stroke={p.goldBase}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Rect x={14} y={20} width={4} height={7} rx={1} fill={p.goldBase} />
          <Rect x={7} y={26} width={18} height={5} rx={2} fill={p.blueBase} />
          <Rect x={7} y={24} width={18} height={5} rx={2} fill={p.blue} />
          <Path d="M8 6h16v8q0 10-8 10T8 14Z" fill={p.goldBase} />
          <Path d="M8 4h16v8q0 10-8 10T8 12Z" fill={p.gold} />
          <Path d="m16 8 1.4 3.5 3.6 1.2-3.6 1.4L16 18l-1.4-3.9-3.6-1.4 3.6-1.2Z" fill={p.paper} />
        </>
      );
    case 'profile':
      return (
        <>
          <Path d="M3 29q0-10 13-10t13 10v2H3Z" fill={p.blueBase} />
          <Path d="M4 27q0-9 12-9t12 9v2H4Z" fill={p.blue} />
          <Circle cx={16} cy={10} r={8} fill={p.skin} />
          <Path d="M8 10q-1-8 8-8t8 8q-7 0-10-4-1 4-6 4Z" fill={p.ink} />
          <Path d="m12 21 4 5 4-5" fill={p.paper} />
        </>
      );
    case 'star':
      return (
        <>
          <G transform="translate(0 2)">
            <Path d={silhouettes.star} fill={p.goldBase} />
          </G>
          <Path d={silhouettes.star} fill={p.gold} />
          <Path d="m16 6 1.7 5.5 5.7.9-4.8 2.5-2.6 6V6Z" fill={p.paper} opacity={0.36} />
        </>
      );
    case 'checkpoint':
      return (
        <>
          <Ellipse cx={16} cy={29} rx={13} ry={3} fill={p.tealBase} />
          <Rect x={5} y={2} width={4} height={26} rx={2} fill={p.blueBase} />
          <Path d="M9 5q5-3 10 0t10 0v14q-5 3-10 0t-10 0Z" fill={p.tealBase} />
          <Path d="M9 3q5-3 10 0t10 0v14q-5 3-10 0t-10 0Z" fill={p.teal} />
          <Path
            d="m13 10 3 3 7-6"
            fill="none"
            stroke={p.paper}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case 'reward':
      return (
        <>
          <Rect x={3} y={13} width={26} height={17} rx={4} fill={p.goldBase} />
          <Rect x={3} y={11} width={26} height={17} rx={4} fill={p.gold} />
          <Path d="M3 13v-2q0-8 8-8h10q8 0 8 8v2Z" fill={p.goldBase} />
          <Path d="M3 11q0-8 8-8h10q8 0 8 8Z" fill={p.gold} />
          <Path d="M8 5v22m16-22v22" stroke={p.blue} strokeWidth={4} />
          <Path d="M4 13h24" stroke={p.goldBase} strokeWidth={2} />
          <Rect x={12} y={12} width={8} height={10} rx={2} fill={p.paper} />
          <Rect x={15} y={15} width={2} height={4} rx={1} fill={p.blueBase} />
        </>
      );
    case 'spark':
      return (
        <>
          <G transform="translate(0 2)">
            <Path d={silhouettes.spark} fill={p.goldBase} />
          </G>
          <Path d={silhouettes.spark} fill={p.gold} />
          <Path d="m16 5 1.8 8 7.2 2-7.2 2-1.8 9V5Z" fill={p.paper} opacity={0.44} />
        </>
      );
    case 'momentum':
      return (
        <>
          <Path d="M3 8h6M1 15h4M3 25h6" stroke={p.gold} strokeWidth={3} strokeLinecap="round" />
          <G transform="translate(0 2)">
            <Path
              d="M18 2q2-1 1.6 1.5L18 12h7q2 0 .8 1.8L15 29q-1.7 2.3-1.4-.5L15 20H8q-2 0-.6-1.9Z"
              fill={p.goldBase}
            />
          </G>
          <Path
            d="M18 2q2-1 1.6 1.5L18 12h7q2 0 .8 1.8L15 29q-1.7 2.3-1.4-.5L15 20H8q-2 0-.6-1.9Z"
            fill={p.gold}
          />
        </>
      );
    case 'discover':
      return (
        <>
          <Path d="m19 20 9 9" stroke={p.blueBase} strokeWidth={6} strokeLinecap="round" />
          <Path d="m19 18 9 9" stroke={p.blue} strokeWidth={6} strokeLinecap="round" />
          <Circle cx={13} cy={14} r={10} fill={p.blueBase} />
          <Circle cx={13} cy={12} r={10} fill={p.blue} />
          <Circle cx={13} cy={12} r={6.5} fill={p.sky} />
          <Path
            d="M9 10q1-2 4-2"
            stroke={p.paper}
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
        </>
      );
    case 'define':
      return (
        <>
          <Circle cx={15} cy={18} r={12} fill={p.goldBase} />
          <Circle cx={15} cy={16} r={12} fill={p.gold} />
          <Circle cx={15} cy={16} r={8} fill={p.paper} />
          <Circle cx={15} cy={16} r={4} fill={p.goldBase} />
          <Path
            d="m16 15 11-11m-5 0h5v5"
            stroke={p.blue}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );
    case 'scope':
      return (
        <>
          <Rect x={7} y={1} width={6} height={5} rx={1.5} fill={p.gold} />
          <Rect x={19} y={1} width={6} height={5} rx={1.5} fill={p.sky} />
          <Path d="M4 10h24v2l-8 9v7l-8 3V21l-8-9Z" fill={p.tealBase} />
          <Path d="M4 7h24v3l-8 9v7l-8 3V19l-8-9Z" fill={p.teal} />
          <Rect x={7} y={9} width={18} height={2} rx={1} fill={p.paper} opacity={0.55} />
        </>
      );
    case 'prototype':
      return (
        <>
          <Rect x={5} y={3} width={22} height={28} rx={5} fill={p.blueBase} />
          <Rect x={5} y={1} width={22} height={28} rx={5} fill={p.blue} />
          <Rect x={8} y={5} width={16} height={20} rx={2} fill={p.paper} />
          <Rect x={10} y={8} width={12} height={5} rx={1.5} fill={p.sky} />
          <Rect x={10} y={15} width={7} height={3} rx={1} fill={p.sky} />
          <Circle cx={20} cy={20} r={2.5} fill={p.gold} />
        </>
      );
    case 'validate':
      return (
        <>
          <Path d="M12 5h8v8l9 13q2 4-3 4H6q-5 0-3-4l9-13Z" fill={p.tealBase} />
          <Path d="M12 3h8v9l9 13q2 3-3 3H6q-5 0-3-3l9-13Z" fill={p.teal} />
          <Path d="M13 7h6v7l4 6H9l4-6Z" fill={p.mint} />
          <Rect x={9} y={2} width={14} height={4} rx={2} fill={p.tealBase} />
          <Circle cx={13} cy={23} r={2} fill={p.paper} />
          <Circle cx={20} cy={22} r={1.5} fill={p.gold} />
        </>
      );
    case 'business':
      return (
        <>
          <Path d="M10 11V7q0-3 3-3h6q3 0 3 3v4" stroke={p.tealBase} strokeWidth={4} fill="none" />
          <Rect x={2} y={10} width={28} height={20} rx={4} fill={p.tealBase} />
          <Rect x={2} y={8} width={28} height={19} rx={4} fill={p.teal} />
          <Path d="M3 16q13 5 26 0" fill="none" stroke={p.tealBase} strokeWidth={2.5} />
          <Rect x={12} y={14} width={8} height={7} rx={2} fill={p.gold} />
        </>
      );
    case 'build':
      return (
        <>
          <Rect x={2} y={20} width={13} height={11} rx={2} fill={p.blueBase} />
          <Rect x={2} y={18} width={13} height={11} rx={2} fill={p.blue} />
          <Rect x={6} y={15} width={5} height={4} rx={1.5} fill={p.blue} />
          <Rect x={17} y={20} width={13} height={11} rx={2} fill={p.tealBase} />
          <Rect x={17} y={18} width={13} height={11} rx={2} fill={p.teal} />
          <Rect x={21} y={15} width={5} height={4} rx={1.5} fill={p.teal} />
          <Rect x={9} y={6} width={14} height={11} rx={2} fill={p.goldBase} />
          <Rect x={9} y={4} width={14} height={11} rx={2} fill={p.gold} />
          <Rect x={13} y={1} width={6} height={4} rx={1.5} fill={p.gold} />
        </>
      );
    case 'ship':
      return (
        <>
          <Path d="m3 16 26-11-8 26-7-8-7 6 2-11Z" fill={p.blueBase} />
          <Path d="m3 14 26-11-8 26-7-8-7 6 2-11Z" fill={p.blue} />
          <Path d="m9 16 20-13-15 18-7 6Z" fill={p.sky} />
          <Path d="m14 21 15-18-17 15Z" fill={p.paper} />
        </>
      );
    case 'idea':
      return (
        <>
          <Rect x={11} y={25} width={10} height={6} rx={2} fill={p.blueBase} />
          <Path d="M16 3a11 11 0 0 0-7 19v4h14v-4A11 11 0 0 0 16 3Z" fill={p.goldBase} />
          <Path d="M16 1a11 11 0 0 0-7 19v4h14v-4A11 11 0 0 0 16 1Z" fill={p.gold} />
          <Path
            d="m12 12 4 4 4-4m-4 4v8"
            stroke={p.paper}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );
    case 'evidence':
      return (
        <>
          <Rect x={4} y={6} width={24} height={25} rx={4} fill={p.blueBase} />
          <Rect x={4} y={4} width={24} height={25} rx={4} fill={p.blue} />
          <Rect x={7} y={7} width={18} height={19} rx={2} fill={p.paper} />
          <Rect x={10} y={2} width={12} height={6} rx={2} fill={p.blueBase} />
          <Path
            d="m10 16 3 3 8-8"
            stroke={p.teal}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Rect x={10} y={22} width={11} height={2} rx={1} fill={p.sky} />
        </>
      );
    case 'interview':
      return (
        <>
          <Path d="M12 11h17q3 0 3 3v10q0 3-3 3v4l-6-4H12q-3 0-3-3V14q0-3 3-3Z" fill={p.goldBase} />
          <Path d="M12 9h17q3 0 3 3v10q0 3-3 3v4l-6-4H12q-3 0-3-3V12q0-3 3-3Z" fill={p.gold} />
          <Path d="M3 4h18q3 0 3 3v10q0 3-3 3H9l-6 5v-5q-3 0-3-3V7q0-3 3-3Z" fill={p.blueBase} />
          <Path d="M3 2h18q3 0 3 3v10q0 3-3 3H9l-6 5v-5q-3 0-3-3V5q0-3 3-3Z" fill={p.blue} />
          <Circle cx={7} cy={10} r={1.6} fill={p.paper} />
          <Circle cx={12} cy={10} r={1.6} fill={p.paper} />
          <Circle cx={17} cy={10} r={1.6} fill={p.paper} />
        </>
      );
    case 'lock':
      return (
        <>
          <Path
            d="M10 16V9a6 6 0 0 1 12 0v7"
            stroke={p.grayBase}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          <Rect x={4} y={14} width={24} height={17} rx={4} fill={p.grayBase} />
          <Rect x={4} y={12} width={24} height={17} rx={4} fill={p.gray} />
          <Rect x={14} y={18} width={4} height={6} rx={2} fill={p.paper} />
        </>
      );
    case 'check':
      return (
        <>
          <G transform="translate(0 2)">
            <Path d={silhouettes.check} fill={p.tealBase} />
          </G>
          <Path d={silhouettes.check} fill={p.teal} />
        </>
      );
    case 'clue':
      return (
        <>
          <Path d="M7 5h18q3 0 3 3v22H4V8q0-3 3-3Z" fill={p.goldBase} />
          <Path d="M7 3h18q3 0 3 3v21H4V6q0-3 3-3Z" fill={p.gold} />
          <Path d="M8 8h15M8 13h9" stroke={p.paper} strokeWidth={2.5} strokeLinecap="round" />
          <Path d="m17 23 4-6 5 1-2 6Z" fill={p.blueBase} />
          <Path d="m17 21 4-6 5 1-2 6Z" fill={p.blue} />
          <Circle cx={22} cy={18} r={1.4} fill={p.paper} />
          <Path d="m4 27 7-4v4Z" fill={p.paper} opacity={0.5} />
        </>
      );
    case 'reason':
      return (
        <>
          <Path d="M4 8h10v5a4 4 0 1 1 0 8v7H4q-2 0-2-2V10q0-2 2-2Z" fill={p.blueBase} />
          <Path d="M4 6h10v5a4 4 0 1 1 0 8v7H4q-2 0-2-2V8q0-2 2-2Z" fill={p.blue} />
          <Path d="M18 8h10q2 0 2 2v16q0 2-2 2H18v-7a4 4 0 1 0 0-8Z" fill={p.tealBase} />
          <Path d="M18 6h10q2 0 2 2v16q0 2-2 2H18v-7a4 4 0 1 0 0-8Z" fill={p.teal} />
          <Path d="M6 9h5M22 9h5" stroke={p.paper} strokeWidth={2} strokeLinecap="round" opacity={0.65} />
          <Circle cx={26} cy={22} r={2} fill={p.gold} />
        </>
      );
    case 'boss':
      return (
        <>
          <Path d="M16 3 29 8v10q0 9-13 14Q3 27 3 18V8Z" fill={p.blueBase} />
          <Path d="M16 1 29 6v10q0 9-13 14Q3 25 3 16V6Z" fill={p.blue} />
          <Path d="m16 7 2 5 5 .6-4 3.4 1 5-4-2.7-4 2.7 1-5-4-3.4 5-.6Z" fill={p.gold} />
        </>
      );
  }
}

export interface GameIconProps {
  name: GameIconName | string;
  size?: number;
  variant?: GameIconVariant;
  /** Omit inside an already-labeled button or tab. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function GameIcon({ name, size = 32, variant = 'color', label, style }: GameIconProps) {
  const glyph = resolveGlyph(name);
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={[{ width: size, height: size, flexShrink: 0 }, style]}
    >
      {glyph ? (
        <Svg width={size} height={size} viewBox="0 0 32 32">
          {variant === 'white' || variant === 'ink' ? (
            <Path
              d={silhouettes[glyph]}
              fill={variant === 'white' ? colors.surface : colors.text}
              fillRule="evenodd"
            />
          ) : (
            <Glyph name={glyph} p={variant === 'muted' ? mutedPaint : colorPaint} />
          )}
        </Svg>
      ) : (
        <Icon
          name={name}
          size={size}
          color={
            variant === 'white'
              ? colors.surface
              : variant === 'ink'
                ? colors.text
                : variant === 'muted'
                  ? colors.muted
                  : colors.primary
          }
        />
      )}
    </View>
  );
}

/** Borderless support art: one useful object, no hero panel or decorative star cloud. */
export function GameSpot({
  name,
  size = 112,
  label,
  style,
}: Pick<GameIconProps, 'size' | 'label' | 'style'> & {
  name: 'project' | 'discover' | 'build' | 'ship' | 'reward' | 'idea';
}) {
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={[{ width: size, height: size * 0.84, flexShrink: 0 }, style]}
    >
      <Svg width={size} height={size * 0.84} viewBox="0 0 80 67">
        <Ellipse cx={40} cy={62} rx={23} ry={3} fill={colors.border} />
        <G transform="translate(12 2) scale(1.75)">
          <Glyph name={name} p={colorPaint} />
        </G>
      </Svg>
    </View>
  );
}

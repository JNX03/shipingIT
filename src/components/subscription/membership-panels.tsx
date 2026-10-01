import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from '@/components/ui/icon';
import { T } from '@/components/ui/text';
import { GameActor } from '@/game/components/actor';
import type { SubscriptionPackage } from '@/services/contracts';
import { subscriptionPeriodLabel } from '@/services/access-policy';
import { colors, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';

export function PremiumHero({ proActive = false }: { proActive?: boolean }) {
  return (
    <View style={{ gap: space.lg, alignItems: 'center' }}>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          width: '100%',
          // The illustration has a fixed stage; the headline below can grow with text size.
          height: 176,
          borderRadius: radius.large,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: colors.premium,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
          <Svg width="100%" height="100%" viewBox="0 0 400 176" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="subscription-premium-hero" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.premium} />
                <Stop offset="1" stopColor={colors.primaryDeep} />
              </LinearGradient>
            </Defs>
            <Rect width="400" height="176" fill="url(#subscription-premium-hero)" />
            <Circle cx="24" cy="170" r="82" fill={colors.surface} opacity={0.12} />
            <Circle cx="360" cy="16" r="98" fill={colors.surface} opacity={0.1} />
            <Circle cx="342" cy="136" r="12" fill={colors.accent} opacity={0.85} />
          </Svg>
        </View>
        <View style={{ position: 'absolute', left: space.xl, top: space.xl }}>
          <Icon name="spark" color={colors.accent} size={32} filled />
        </View>
        <View
          style={{
            position: 'absolute',
            right: space.xl,
            bottom: space.xl,
            padding: space.md,
            borderRadius: radius.control,
            borderCurve: 'continuous',
            backgroundColor: colors.surface,
            transform: [{ rotate: '8deg' }],
          }}
        >
          <Icon name="project" color={colors.premium} size={32} />
        </View>
        <GameActor character="ami" motion={proActive ? 'still' : 'idle'} size={168} />
      </View>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <T variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
          Go deeper. Build with confidence.
        </T>
        <T style={{ textAlign: 'center', color: colors.textSecondary }}>
          Explore guided worked examples and take your whole notebook with you.
        </T>
      </View>
    </View>
  );
}

export function PlanComparison({
  learningLabel,
  proLabCount = 0,
  advancedHelper = false,
  unlimitedSparkShop = false,
}: {
  learningLabel: string;
  proLabCount?: number;
  advancedHelper?: boolean;
  /** Set only when the verified Pro shop-spending contract is integrated. */
  unlimitedSparkShop?: boolean;
}) {
  const rows = [
    { title: 'Core games & lessons', detail: learningLabel, free: true },
    {
      title: 'Basic lesson hints',
      detail: 'A starting point for every core question.',
      free: true,
    },
    {
      title: 'Project notes & summary copy',
      detail: 'Keep building your own notebook.',
      free: true,
    },
    ...(proLabCount > 0
      ? [
          {
            title: `${proLabCount} bonus Pro labs`,
            detail: 'Go deeper with a focused challenge in each available unit.',
            free: false,
          },
        ]
      : []),
    ...(advancedHelper
      ? [
          {
            title: 'Advanced lesson guide',
            detail:
              'Reveal an approach, reasoning, then a worked example for the current question.',
            free: false,
          },
        ]
      : []),
    ...(unlimitedSparkShop
      ? [
          {
            title: 'Unlimited Spark shop spending',
            detail: 'An ∞ wallet for virtual shop items while Pro is active.',
            free: false,
          },
        ]
      : []),
    {
      title: 'Game blueprint export',
      detail: 'Take your in-app game prototype with you.',
      free: true,
    },
    {
      title: 'Full notebook Markdown export',
      detail: 'Every section of your own project notes.',
      free: false,
    },
    {
      title: 'Copy the complete Project Pack',
      detail: 'All your notebook sections in one copy.',
      free: false,
    },
  ];
  return (
    <View style={{ gap: space.md }}>
      <T variant="heading" accessibilityRole="header">
        Choose what fits you
      </T>
      <View
        style={{
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius.large,
          borderCurve: 'continuous',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: space.md,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <View style={{ flex: 1, paddingVertical: space.md }}>
            <T variant="caption">YOUR LEARNING</T>
          </View>
          <View style={{ width: 64, alignItems: 'center', paddingVertical: space.md }}>
            <T variant="small">Free</T>
          </View>
          <View
            style={{
              width: 64,
              alignItems: 'center',
              paddingVertical: space.md,
              backgroundColor: colors.premiumSurface,
            }}
          >
            <T variant="small" style={{ color: colors.premium }}>
              Pro
            </T>
          </View>
        </View>
        {rows.map((row) => (
          <View
            key={row.title}
            accessible
            accessibilityLabel={`${row.title}. ${row.detail} ${row.free ? 'Included in Free and Pro.' : 'Included in Pro.'}`}
            style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              paddingHorizontal: space.md,
              borderTopWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{ flex: 1, gap: space.xs, paddingVertical: space.md, paddingRight: space.sm }}
            >
              <T variant="small" style={{ color: colors.text }}>
                {row.title}
              </T>
              <T variant="caption" style={{ color: colors.textSecondary }}>
                {row.detail}
              </T>
            </View>
            <View style={{ width: 64, alignItems: 'center', justifyContent: 'center' }}>
              {row.free ? (
                <Icon name="check" color={colors.success} size={24} />
              ) : (
                <T variant="small" accessible={false}>
                  —
                </T>
              )}
            </View>
            <View
              style={{
                width: 64,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.premiumSurface,
              }}
            >
              <Icon name="check" color={colors.premium} size={24} />
            </View>
          </View>
        ))}
      </View>
      <T variant="small" style={{ textAlign: 'center' }}>
        All core lessons and games stay free. Active Pro unlocks the extras above.
      </T>
    </View>
  );
}

export function MembershipPlanOption({
  plan,
  selected,
  disabled,
  onSelect,
}: {
  plan: SubscriptionPackage;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const period = subscriptionPeriodLabel(plan.period);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${plan.title}. ${plan.priceString}${period ? ` every ${period}` : ''}.`}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      disabled={disabled}
      onPress={() => {
        feedback('selection');
        onSelect();
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.lg,
        borderWidth: 2,
        borderBottomWidth: pressed ? 2 : 4,
        borderColor: selected ? colors.premium : colors.border,
        borderRadius: radius.control,
        borderCurve: 'continuous',
        backgroundColor: selected ? colors.premiumSurface : colors.surface,
        opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: selected ? colors.premium : colors.muted,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.premium : colors.surface,
        }}
      >
        {selected ? <Icon name="check" color={colors.surface} size={18} /> : null}
      </View>
      <View style={{ flex: 1, gap: space.xs }}>
        <T variant="subheading">{plan.title}</T>
        <T variant="small" selectable>
          {plan.priceString}
          {period ? ` / ${period}` : ''}
        </T>
      </View>
    </Pressable>
  );
}

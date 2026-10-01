import { Tabs, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, View } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigationArt } from '@/game/navigation-art';
import { gamePropArt } from '@/game/art';
import { feedback } from '@/utils/feedback';
import { T } from '@/components/ui/text';
import { useAppStore } from '@/store/app-store';
import { useAppLayout } from '@/hooks/use-app-layout';
import { colors, fonts, radius, space } from '@/theme';
import { useMotionReduced } from '@/hooks/use-reduced-motion';

const tabs: { name: string; title: string; art: ImageSource | number }[] = [
  { name: 'index', title: 'Home', art: navigationArt.home },
  { name: 'project', title: 'My app', art: navigationArt.phone },
  { name: 'shop', title: 'Shop', art: gamePropArt.reward },
  { name: 'compete', title: 'Practice', art: navigationArt.toolbox },
  { name: 'profile', title: 'Me', art: navigationArt.me },
];
export default function TabLayout() {
  const { desktop } = useAppLayout();
  const insets = useSafeAreaInsets();
  const complete = useAppStore((s) => s.onboardingComplete);
  const reduced = useMotionReduced();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const shown = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hidden = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  if (!complete) return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // SDK57's built-in FadeSpec lasts150ms; keyboard/reduced-motion changes remain immediate.
        animation: reduced || keyboardVisible ? 'none' : 'fade',
        tabBarPosition: desktop ? 'left' : 'bottom',
        tabBarHideOnKeyboard: true,
      }}
      tabBar={({ state, navigation }) =>
        !desktop && keyboardVisible ? null : (
          <View
            style={{
              width: desktop ? 218 : undefined,
              backgroundColor: colors.surface,
              borderRightWidth: desktop ? 2 : 0,
              borderTopWidth: desktop ? 0 : 1,
              borderColor: colors.border,
              paddingHorizontal: desktop ? space.lg : space.sm,
              paddingTop: desktop ? space.xxl : space.xs,
              paddingBottom: desktop ? space.xl : Math.max(insets.bottom, 10),
              flexDirection: desktop ? 'column' : 'row',
              gap: desktop ? space.sm : 0,
            }}
          >
            {desktop ? (
              <View
                style={{ paddingHorizontal: space.md, paddingBottom: space.xxl, gap: space.xs }}
              >
                <T
                  variant="title"
                  style={{ fontFamily: fonts.heavy, color: colors.primaryPressed, fontSize: 28 }}
                >
                  ShipingIT
                </T>
                <T variant="caption" style={{ letterSpacing: 2, color: colors.textSecondary }}>
                  BY DEKPORT
                </T>
              </View>
            ) : null}
            {tabs.map((item) => {
              const route = state.routes.find((entry) => entry.name === item.name);
              if (!route) return null;
              const selected = route.key === state.routes[state.index]?.key;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityLabel={item.title}
                  accessibilityState={{ selected }}
                  aria-selected={selected}
                  testID={`main-nav-${item.name}`}
                  onPress={() => {
                    feedback('light');
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!selected && !event.defaultPrevented) navigation.navigate(route.name);
                  }}
                  style={({ pressed }) => ({
                    flex: desktop ? undefined : 1,
                    minWidth: 44,
                    minHeight: desktop ? 64 : 60,
                    flexDirection: desktop ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: desktop ? 'flex-start' : 'center',
                    gap: desktop ? space.lg : 2,
                    paddingHorizontal: desktop ? space.md : 2,
                    borderWidth: desktop ? 2 : 0,
                    borderColor: selected ? colors.sky : colors.transparent,
                    borderRadius: radius.control,
                    backgroundColor:
                      selected && desktop
                        ? colors.primarySurface
                        : pressed
                          ? colors.surfaceMuted
                          : colors.surface,
                  })}
                >
                  <View
                    style={{
                      width: desktop ? 48 : 38,
                      height: desktop ? 42 : 34,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        selected && !desktop ? colors.primarySurface : colors.transparent,
                      borderRadius: 12,
                      borderWidth: selected && !desktop ? 2 : 0,
                      borderColor: colors.sky,
                      overflow: 'hidden',
                      opacity: selected ? 1 : 0.85,
                    }}
                  >
                    <Image
                      source={item.art}
                      contentFit="contain"
                      style={{
                        width: desktop ? (item.name === 'profile' ? 40 : 35) : 29,
                        height: desktop ? (item.name === 'profile' ? 40 : 35) : 29,
                      }}
                      alt=""
                    />
                  </View>
                  <T
                    variant="caption"
                    numberOfLines={1}
                    maxFontSizeMultiplier={desktop ? undefined : 1.3}
                    adjustsFontSizeToFit={!desktop}
                    minimumFontScale={0.85}
                    style={{
                      fontSize: desktop ? 15 : 11,
                      lineHeight: desktop ? 20 : 14,
                      width: desktop ? undefined : '100%',
                      textAlign: desktop ? 'left' : 'center',
                      fontFamily: fonts.bold,
                      letterSpacing: desktop ? 0.7 : 0,
                      color: selected ? colors.primaryPressed : colors.textSecondary,
                    }}
                  >
                    {item.title}
                  </T>
                </Pressable>
              );
            })}
          </View>
        )
      }
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
      <Tabs.Screen name="mentor" options={{ title: 'Ami', href: null }} />
    </Tabs>
  );
}

import { ReactNode } from 'react';
import { ScrollView, View, StyleProp, ViewStyle, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { colors, space } from '@/theme';
import { IconButton } from './button';
import { T } from './text';
export function Screen({
  children,
  footer,
  scroll = true,
  style,
  header,
  contentWidth = 600,
  footerStyle,
  footerContentStyle,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  header?: ReactNode;
  contentWidth?: number;
  footerStyle?: StyleProp<ViewStyle>;
  footerContentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}
    >
      {header ? (
        <View
          style={{
            width: '100%',
            maxWidth: 960,
            alignSelf: 'center',
            paddingHorizontal: space.page,
            paddingTop: space.sm,
            paddingBottom: space.sm,
          }}
        >
          {header}
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            style={[
              {
                padding: space.page,
                paddingTop: space.md,
                paddingBottom: space.xxl,
                gap: space.xl,
                flexGrow: 1,
                width: '100%',
                maxWidth: contentWidth,
                alignSelf: 'center',
              },
              style,
            ]}
          >
            {children}
          </View>
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: space.md }, style]}>{children}</View>
      )}
      {footer ? (
        <View
          style={[
            {
              paddingHorizontal: space.page,
              paddingTop: space.md,
              paddingBottom: Math.max(insets.bottom, space.lg),
              gap: space.md,
              borderTopWidth: 2,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
            footerStyle,
          ]}
        >
          <View
            style={[
              { width: '100%', maxWidth: 960, alignSelf: 'center', gap: space.md },
              footerContentStyle,
            ]}
          >
            {footer}
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
export function PageHeader({
  title,
  subtitle,
  back = false,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  return (
    <View style={{ gap: space.xs, paddingBottom: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52 }}>
        {back ? (
          <IconButton
            name="back"
            label="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          />
        ) : (
          <View style={{ width: 48 }} />
        )}
        <T variant="heading" accessibilityRole="header" style={{ flex: 1, textAlign: 'center' }}>
          {title}
        </T>
        {action ?? <View style={{ width: 48 }} />}
      </View>
      {subtitle ? (
        <T variant="small" style={{ textAlign: 'center' }}>
          {subtitle}
        </T>
      ) : null}
    </View>
  );
}

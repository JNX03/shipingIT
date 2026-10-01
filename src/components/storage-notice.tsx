import { View, Pressable } from 'react-native';
import { useAppStore } from '@/store/app-store';
import { T } from '@/components/ui/text';
import { colors, space } from '@/theme';
export function StorageNotice() {
  const error = useAppStore((s) => s.storageError);
  const retry = useAppStore((s) => s.retryPersistence);
  if (!error) return null;
  return (
    <View
      accessibilityLiveRegion="assertive"
      style={{
        backgroundColor: colors.dangerSurface,
        padding: space.md,
        gap: space.sm,
      }}
    >
      <T variant="small" style={{ color: colors.danger }}>
        {error}
      </T>
      <Pressable accessibilityRole="button" onPress={() => void retry()}>
        <T variant="small" style={{ color: colors.primaryPressed }}>
          Retry saving
        </T>
      </Pressable>
    </View>
  );
}

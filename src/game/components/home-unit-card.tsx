import { Pressable, View } from 'react-native';
import { GameIcon } from '@/components/ui/game-icon';
import { T } from '@/components/ui/text';
import { colors, space } from '@/theme';
import { pathUnitTheme } from '../path-units';
import type { MixedPathUnit } from '../mixed-path';

/** The visible unit owns this fixed header; the book opens that unit's actual guide. */
export function HomeUnitCard({ unit, onGuide }: { unit: MixedPathUnit; onGuide(): void }) {
  const theme = pathUnitTheme(unit.id);
  return (
    <View
      style={{
        paddingHorizontal: space.page,
        paddingBottom: space.md,
        backgroundColor: colors.surface,
      }}
      testID="current-unit-context"
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.tint,
          borderRadius: 22,
          borderBottomWidth: 6,
          borderColor: theme.edge,
          overflow: 'hidden',
        }}
      >
        <View
          style={{ flex: 1, paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm }}
        >
          <T variant="small" style={{ color: colors.surface, fontWeight: '800' }}>
            SECTION 1 · UNIT {unit.id}
          </T>
          <T variant="heading" accessibilityRole="header" style={{ color: colors.surface }}>
            {unit.title}
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open Unit ${unit.id} guide: ${unit.title}`}
          testID="home-unit-guide"
          onPress={onGuide}
          style={{
            width: 64,
            minHeight: 90,
            borderLeftWidth: 3,
            borderColor: theme.edge,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GameIcon name="learn" size={34} variant="white" />
        </Pressable>
      </View>
    </View>
  );
}

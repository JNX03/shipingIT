import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Mission } from '@/domain/types';
import { GameIcon } from '@/components/ui/game-icon';
import { T } from '@/components/ui/text';
import { colors, radius, space } from '@/theme';

export function UnitBanner({
  mission,
  locked,
  complete,
}: {
  mission: Mission;
  locked: boolean;
  complete: boolean;
}) {
  return (
    <View
      style={{ backgroundColor: colors.surface, paddingTop: space.md, paddingBottom: space.md }}
    >
      <View
        style={{
          padding: space.lg,
          backgroundColor: locked ? colors.surfaceMuted : colors.primaryPressed,
          borderRadius: radius.control,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          borderWidth: locked ? 2 : 0,
          borderColor: colors.border,
        }}
      >
        <View style={{ flex: 1, gap: space.xs }}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <GameIcon name={mission.icon} size={26} variant={locked ? 'muted' : 'white'} />
            <T
              variant="caption"
              style={{
                color: locked ? colors.textSecondary : colors.surface,
                letterSpacing: 0.5,
                flex: 1,
              }}
            >
              MISSION {mission.id} · {mission.title.toUpperCase()}
              {complete ? ' · COMPLETE' : ''}
            </T>
          </View>
          <T variant="subheading" style={{ color: locked ? colors.textSecondary : colors.surface }}>
            {mission.subtitle}
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Read ${mission.title} guidebook`}
          onPress={() => router.push({ pathname: '/guide/[id]', params: { id: mission.id } })}
          style={({ pressed }) => ({
            width: 48,
            height: 50,
            borderWidth: 2,
            borderBottomWidth: pressed ? 2 : 4,
            borderColor: locked ? colors.border : 'rgba(0,0,0,0.15)',
            backgroundColor: locked ? colors.surface : 'rgba(255,255,255,0.08)',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <GameIcon name="guidebook" size={28} variant={locked ? 'ink' : 'white'} />
        </Pressable>
      </View>
    </View>
  );
}

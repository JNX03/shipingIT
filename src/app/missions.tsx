import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, PageHeader } from '@/components/ui/screen';
import { GameIcon } from '@/components/ui/game-icon';
import { Icon } from '@/components/ui/icon';
import { T } from '@/components/ui/text';
import { missions } from '@/data/curriculum';
import { getMissionProgress } from '@/domain/progression';
import { useAppStore } from '@/store/app-store';
import { colors, space, radius } from '@/theme';
export default function Missions() {
  const completed = useAppStore((s) => s.completedLessonIds);
  return (
    <Screen header={<PageHeader title="Missions" back />}>
      <View
        style={{
          borderWidth: 2,
          borderColor: colors.border,
          borderRadius: radius.control,
          overflow: 'hidden',
        }}
      >
        {missions.map((mission, index) => {
          const progress = getMissionProgress(mission.id, completed);
          return (
            <Pressable
              key={mission.id}
              accessibilityRole="button"
              accessibilityLabel={`${mission.title} guidebook, ${progress.completed} of ${progress.total} lessons completed`}
              onPress={() => router.push({ pathname: '/guide/[id]', params: { id: mission.id } })}
              style={({ pressed }) => ({
                padding: space.lg,
                gap: space.lg,
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: index ? 2 : 0,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
              })}
            >
              <GameIcon
                name={mission.icon}
                size={44}
                variant={progress.unlocked ? 'color' : 'muted'}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <T variant="subheading">{mission.title}</T>
                <T variant="small">
                  {progress.unlocked
                    ? `${progress.completed}/${progress.total} lessons`
                    : `Mission ${mission.id}`}
                </T>
              </View>
              <Icon
                name={progress.complete ? 'check' : 'next'}
                color={progress.complete ? colors.success : colors.muted}
                size={24}
              />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

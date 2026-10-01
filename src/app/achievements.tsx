import { StyleSheet, View } from 'react-native';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { ProfileBadge } from '@/components/profile/profile-primitives';
import { Character } from '@/components/ui/character';
import { useAppStore } from '@/store/app-store';
import { achievementDefinitions } from '@/data/achievements';
import { colors, space } from '@/theme';

export default function Achievements() {
  const earnedIds = useAppStore((state) => state.achievements);
  const earned = achievementDefinitions.filter((item) => earnedIds.includes(item.id));
  const next = achievementDefinitions.filter((item) => !earnedIds.includes(item.id));
  const groups = [
    { title: 'Earned', items: earned, unlocked: true },
    { title: 'Next up', items: next, unlocked: false },
  ];

  return (
    <Screen contentWidth={560} header={<PageHeader title="Achievements" back />}>
      <T variant="small">
        {earned.length} of {achievementDefinitions.length} earned
      </T>
      {earned.length === 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Character emotion="encouraging" size={80} />
          <T style={{ flex: 1 }}>Complete lessons to earn your first badge.</T>
        </View>
      ) : null}
      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <View key={group.title} style={styles.group}>
            <T variant="caption" style={styles.groupTitle}>
              {group.title.toUpperCase()}
            </T>
            <View style={styles.rows}>
              {group.items.map((achievement) => (
                <View
                  key={achievement.id}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${achievement.title}. ${group.unlocked ? 'Earned. ' + achievement.description : 'Locked. ' + achievement.requirement}`}
                >
                  <ProfileBadge achievement={achievement} unlocked={group.unlocked} size={64} />
                  <View style={styles.copy}>
                    <T variant="subheading">{achievement.title}</T>
                    <T variant="small">
                      {group.unlocked ? achievement.description : achievement.requirement}
                    </T>
                    {group.unlocked ? (
                      <T variant="caption" style={styles.earned}>
                        EARNED
                      </T>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  groupTitle: { color: colors.textSecondary, letterSpacing: 1 },
  rows: { borderTopWidth: 1, borderColor: colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  copy: { flex: 1, gap: space.xs },
  earned: { color: colors.success, letterSpacing: 0.7 },
});

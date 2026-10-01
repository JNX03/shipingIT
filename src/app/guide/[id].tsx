import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { GameIcon } from '@/components/ui/game-icon';
import { getMission, missions } from '@/data/curriculum';
import { colors, space } from '@/theme';
export function generateStaticParams() {
  return missions.map((mission) => ({ id: String(mission.id) }));
}
export default function Guide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mission = getMission(Number(id));
  if (!mission)
    return (
      <Screen>
        <PageHeader title="Mission not found" back />
      </Screen>
    );
  return (
    <Screen
      header={<PageHeader title="Guidebook" back />}
      footer={
        <Button
          title="Continue"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
        />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 16 }}>
        <GameIcon name={mission.icon} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="caption" style={{ color: colors.primaryPressed }}>
            MISSION {mission.id}
          </T>
          <T variant="title">{mission.title}</T>
        </View>
      </View>
      <T variant="heading">{mission.subtitle}</T>
      {mission.guidebook.map((item) => (
        <View
          key={item.title}
          style={{ gap: space.sm, paddingTop: 20, borderTopWidth: 2, borderColor: colors.border }}
        >
          <T variant="subheading">{item.title}</T>
          <T style={{ color: colors.textSecondary }}>{item.body}</T>
        </View>
      ))}
      <View
        style={{ padding: 20, gap: 8, backgroundColor: colors.primarySurface, borderRadius: 16 }}
      >
        <T variant="subheading">Your project task</T>
        <T>{mission.outcome}</T>
      </View>
    </Screen>
  );
}

import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, PageHeader } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { bonusLessons } from '@/data/learning-guides';
import { useSubscription } from '@/hooks/use-subscription';
import { colors, radius, space } from '@/theme';

export default function ProLabs() {
  const membership = useSubscription();
  return (
    <Screen header={<PageHeader title="Extra labs" back />}>
      <T>Go further with a different problem in each unit.</T>
      {!membership.access.allowed ? (
        <View style={{ gap: space.sm }}>
          <T variant="small">
            These optional labs are included with Pro. Your main path stays free.
          </T>
          <Button title="See Pro" uppercase={false} onPress={() => router.push('/paywall')} />
        </View>
      ) : null}
      {bonusLessons.map((lesson) => (
        <View
          key={lesson.id}
          style={{
            gap: space.sm,
            padding: space.lg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.large,
          }}
        >
          <T variant="caption">
            Unit {lesson.missionId} · {lesson.minutes} min
          </T>
          <T variant="heading">{lesson.title}</T>
          <T variant="small">{lesson.subtitle}</T>
          <Button
            title={membership.access.allowed ? 'Start lab' : 'Included with Pro'}
            variant={membership.access.allowed ? 'primary' : 'secondary'}
            uppercase={false}
            disabled={membership.loading}
            onPress={() =>
              membership.access.allowed
                ? router.push(`/lesson/${lesson.id}`)
                : router.push('/paywall')
            }
          />
        </View>
      ))}
    </Screen>
  );
}

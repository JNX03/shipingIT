import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { T } from '@/components/ui/text';
import { GameIcon } from '@/components/ui/game-icon';
import { Icon } from '@/components/ui/icon';
import { GameActor } from '@/game/components/actor';
import { colors, pathTheme, radius, space } from '@/theme';
import { practiceCatalog, practiceSkills } from '@/game/practice/catalog';
import { practiceFeedback } from '@/game/practice/feedback';
import { useOptionalPractice } from '@/game/practice/runtime';
import type { ChallengeKind } from '@/game/challenges/model';
import { PracticeAccess } from './access';
import { PracticeSaveStatus } from './save-status';

function PracticeHub() {
  const state = useOptionalPractice();
  const [skill, setSkill] = useState<ChallengeKind | null>(null);
  const selected = practiceSkills.find((entry) => entry.kind === skill);
  const recommended = practiceCatalog.find((challenge) => challenge.id === 'explore-last-time')!;
  const ready = state.hydrated && !state.protected;
  const open = (id: string) => router.push({ pathname: '/practice/sandbox/[id]', params: { id } });
  return (
    <Screen style={{ padding: 0, paddingTop: 0, paddingBottom: space.xxl, gap: 0 }}>
      <Stack.Screen options={{ title: selected ? selected.label + ' practice' : 'Practice' }} />
      {selected ? (
        <>
          <View style={{ padding: space.page, gap: space.md, backgroundColor: pathTheme.chapter }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to all practice skills"
              onPress={() => setSkill(null)}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space.sm }}
            >
              <Icon name="back" color={colors.surface} size={24} />
              <T variant="small" style={{ color: colors.surface }}>
                All skills
              </T>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: space.xs }}>
                <T variant="title" accessibilityRole="header" style={{ color: colors.surface }}>
                  {selected.label}
                </T>
                <T variant="small" style={{ color: colors.surface }}>
                  {selected.detail}
                </T>
              </View>
              <GameIcon name={selected.icon} size={58} variant="white" />
            </View>
          </View>
          <View style={{ padding: space.page, gap: space.lg }}>
            <PracticeSaveStatus state={state} />
            <T variant="small">{selected.goal}</T>
            {practiceCatalog
              .filter((challenge) => challenge.kind === selected.kind)
              .map((challenge) => {
                const session = state.sessions[challenge.id];
                const passed = session?.checked && practiceFeedback(challenge, session.draft).valid;
                return (
                  <View
                    key={challenge.id}
                    style={{
                      gap: space.sm,
                      padding: space.lg,
                      borderRadius: radius.card,
                      borderCurve: 'continuous',
                      borderWidth: 2,
                      borderBottomWidth: 5,
                      borderColor: colors.border,
                    }}
                  >
                    <T variant="subheading">
                      {challenge.id === 'explore-last-time'
                        ? 'Interview with Mali'
                        : challenge.title}
                    </T>
                    <T variant="small">{challenge.instructions}</T>
                    {session ? (
                      <T variant="caption">
                        Attempt {session.attempt} ·{' '}
                        {passed
                          ? 'Check passed'
                          : session.hasEdits
                            ? 'Saved draft'
                            : 'Ready to try'}
                      </T>
                    ) : null}
                    <Button
                      title={session?.hasEdits ? 'Continue practice' : 'Start practice'}
                      compact
                      uppercase={false}
                      disabled={!ready}
                      onPress={() => open(challenge.id)}
                    />
                  </View>
                );
              })}
          </View>
        </>
      ) : (
        <>
          <View
            style={{
              backgroundColor: pathTheme.chapter,
              padding: space.page,
              paddingTop: space.lg,
              paddingBottom: space.xl,
            }}
          >
            <View style={{ flexDirection: 'row', minHeight: 120, alignItems: 'center' }}>
              <View style={{ flex: 1, gap: space.xs }}>
                <T
                  variant="title"
                  accessibilityRole="header"
                  style={{ color: colors.surface, fontSize: 30, lineHeight: 38 }}
                >
                  Practice
                </T>
              </View>
              <GameActor
                character="ami"
                motion="still"
                active={false}
                size={128}
                style={{ transform: [{ rotate: '-3deg' }] }}
              />
            </View>
            <View
              style={{
                padding: space.xl,
                gap: space.lg,
                backgroundColor: colors.surface,
                borderRadius: 24,
                borderCurve: 'continuous',
              }}
            >
              <T variant="body" style={{ fontSize: 20, lineHeight: 28 }}>
                Interview with Mali
              </T>
              <Button
                title={
                  !state.hydrated
                    ? 'Opening practice…'
                    : state.sessions[recommended.id]?.hasEdits
                      ? 'Continue interview'
                      : 'Start interview'
                }
                uppercase={false}
                disabled={!ready}
                onPress={() => open(recommended.id)}
              />
            </View>
          </View>
          <View style={{ paddingHorizontal: space.page, paddingVertical: space.xl, gap: space.lg }}>
            <PracticeSaveStatus state={state} />
            <T variant="caption" accessibilityRole="header" style={{ color: colors.textSecondary }}>
              SKILLS
            </T>
            {practiceSkills.map((entry) => (
              <Pressable
                key={entry.kind}
                accessibilityRole="button"
                accessibilityLabel={
                  entry.label + ' practice. ' + entry.detail + ' Four free exercises.'
                }
                accessibilityHint="Shows exercises and a goal for this skill"
                onPress={() => setSkill(entry.kind)}
                style={({ pressed }) => ({
                  minHeight: 84,
                  paddingHorizontal: space.xl,
                  paddingVertical: space.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.lg,
                  borderRadius: radius.large,
                  borderCurve: 'continuous',
                  borderWidth: 2,
                  borderBottomWidth: 4,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.primarySurface : colors.surface,
                })}
              >
                <View style={{ flex: 1, gap: space.xs }}>
                  <T variant="body" style={{ fontSize: 21, lineHeight: 28 }}>
                    {entry.label}
                  </T>
                </View>
                <GameIcon name={entry.icon} size={52} />
              </Pressable>
            ))}
            <View style={{ gap: space.md, paddingTop: space.lg }}>
              <T variant="caption" accessibilityRole="header">
                MINIGAMES
              </T>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Play Offline Rescue. Three simulated recovery scenarios. Inspect cache age and recover from failed retries."
                onPress={() =>
                  router.push({ pathname: '/practice/mini/[id]', params: { id: 'offline-rescue' } })
                }
                style={({ pressed }) => ({
                  minHeight: 76,
                  padding: space.lg,
                  gap: space.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderBottomWidth: 4,
                  borderColor: colors.border,
                  borderRadius: radius.control,
                  borderCurve: 'continuous',
                  backgroundColor: pressed ? colors.primarySurface : colors.surface,
                })}
              >
                <View style={{ flex: 1, gap: space.xs }}>
                  <T variant="body">Offline Rescue</T>
                  <T variant="small">3 scenarios · Save, retry, recover</T>
                </View>
                <GameIcon name="validate" size={40} />
              </Pressable>
            </View>
            <T variant="small" style={{ textAlign: 'center' }}>
              24 free exercises · Repeat anytime · No Sparks
            </T>
          </View>
        </>
      )}
    </Screen>
  );
}

export function PracticeHubScreen() {
  return (
    <PracticeAccess>
      <PracticeHub />
    </PracticeAccess>
  );
}

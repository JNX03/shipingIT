import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { GameIcon } from '@/components/ui/game-icon';
import { PracticeAccess } from '@/screens/practice/access';
import { colors, radius, space } from '@/theme';
import {
  applyOfflineAction,
  createOfflineRescue,
  offlineGoalMet,
  offlineReportLabel,
  offlineScenarios,
  type OfflineAction,
} from './offline-rescue-model';

export function MiniGameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (id !== 'offline-rescue')
    return (
      <Screen
        footer={<Button title="Back to practice" onPress={() => router.replace('/practice')} />}
      >
        <T variant="title">Minigame not found</T>
      </Screen>
    );
  return <PracticeAccess><OfflineRescueGame /></PracticeAccess>;
}

/** Session-local simulation: no storage, requests, permissions, notebook writes or rewards. */
export function OfflineRescueGame() {
  const [state, setState] = useState(() => createOfflineRescue());
  const scenario = offlineScenarios.find((item) => item.id === state.scenarioId)!;
  const act = (action: OfflineAction) => setState((current) => applyOfflineAction(current, action));
  const met = offlineGoalMet(state);
  return (
    <Screen
      header={
        <Button
          title="Back to practice"
          compact
          variant="quiet"
          onPress={() => router.replace('/practice')}
        />
      }
      footer={
        <Button title="Restart this scenario" variant="secondary" onPress={() => act('reset')} />
      }
    >
      <Stack.Screen options={{ title: 'Offline Rescue' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <GameIcon name="build" size={58} />
        <View style={{ flex: 1, gap: space.xs }}>
          <T variant="title">Offline Rescue</T>
          <T variant="small">Keep useful data. Tell the truth about freshness.</T>
        </View>
      </View>
      <T variant="caption">SIMULATED PRACTICE · SESSION ONLY · NO SPARKS</T>
      <T variant="small">
        These controls change a fictional connection and authored route reports. Your device
        connection stays unchanged. Changing scenario resets this run.
      </T>
      <View style={{ gap: space.xs }}>
        {offlineScenarios.map((item) => (
          <Button
            key={item.id}
            title={item.title}
            compact
            uppercase={false}
            variant={item.id === state.scenarioId ? 'primary' : 'secondary'}
            selected={item.id === state.scenarioId}
            onPress={() => setState(createOfflineRescue(item.id))}
          />
        ))}
      </View>
      <View
        style={{
          gap: space.sm,
          padding: space.md,
          borderRadius: radius.control,
          backgroundColor: colors.primarySurface,
        }}
      >
        <T variant="subheading">Your goal</T>
        <T>{scenario.goal}</T>
      </View>
      <View
        style={{
          gap: space.md,
          padding: space.lg,
          borderWidth: 3,
          borderColor: colors.border,
          borderRadius: radius.card,
        }}
      >
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <GameIcon name={state.connected ? 'momentum' : 'lock'} size={36} />
          <T variant="subheading">Simulated connection: {state.connected ? 'on' : 'off'}</T>
        </View>
        <T variant="caption" accessibilityLiveRegion="polite">
          {offlineReportLabel(state)}
        </T>
        {state.view !== 'empty' && state.cache ? (
          <>
            <View
              style={{
                padding: space.md,
                gap: space.sm,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radius.control,
              }}
            >
              {state.cache.route.split(' → ').map((stop, index) => (
                <View
                  key={stop}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
                >
                  <GameIcon name={index === 2 ? 'learn' : 'discover'} size={32} />
                  <T style={{ flex: 1 }}>
                    {index + 1}. {stop}
                  </T>
                </View>
              ))}
            </View>
            {state.cache.age >= 30 ? (
              <T variant="small" style={{ color: colors.danger }}>
                Old report. The route may have changed; a saved route is not a promise about current
                conditions.
              </T>
            ) : null}
          </>
        ) : (
          <T>
            {state.cache
              ? 'A saved route exists. Open it to inspect its age.'
              : 'There is no saved route. Restore the simulated connection, then load a report.'}
          </T>
        )}
        <T variant="caption">Connected request attempts: {state.attempts}</T>
      </View>
      <View style={{ gap: space.sm }}>
        <Button
          title={state.request === 'idle' ? 'Load route' : 'Retry route request'}
          uppercase={false}
          onPress={() => act('load')}
        />
        <Button
          title="Open saved route"
          variant="secondary"
          uppercase={false}
          onPress={() => act('show-cache')}
        />
        <Button
          title={state.connected ? 'Cut simulated connection' : 'Restore simulated connection'}
          variant="secondary"
          uppercase={false}
          onPress={() => act('toggle-connection')}
        />
        <Button
          title="Let 5 simulated minutes pass"
          variant="quiet"
          uppercase={false}
          onPress={() => act('wait')}
        />
      </View>
      <View
        accessibilityLiveRegion="polite"
        style={{
          gap: space.sm,
          padding: space.md,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.control,
        }}
      >
        <T variant="caption">EXPECTED</T>
        <T variant="small">{state.feedback.expected}</T>
        <T variant="caption">ACTUAL</T>
        <T variant="small">{state.feedback.actual}</T>
      </View>
      {met ? (
        <View
          style={{
            gap: space.sm,
            padding: space.md,
            borderWidth: 2,
            borderColor: colors.success,
            borderRadius: radius.control,
          }}
        >
          <T variant="subheading" style={{ color: colors.success }}>
            Goal met in this simulation
          </T>
          <T variant="small">
            {state.scenarioId === 'saved-route'
              ? 'You exposed the offline failure and opened a saved route with its age intact.'
              : state.scenarioId === 'empty-cache'
                ? 'You showed the missing data honestly and obtained a report only after reconnecting and retrying.'
                : 'You inspected old data, retained it through a failed retry, and replaced it only after a successful response.'}
          </T>
          <T variant="small">
            Try another scenario, or cut the connection and see whether the new cache survives. This
            result does not validate a real app.
          </T>
        </View>
      ) : null}
    </Screen>
  );
}

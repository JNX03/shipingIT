import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { useAppStore } from '@/store/app-store';
import { getLevel, getStreak } from '@/domain/progression';
import { useLocalDay } from '@/components/profile/use-local-day';
import { colors, pathTheme, space } from '@/theme';
import { challengeById } from '../challenges/catalog';
import { feedback } from '@/utils/feedback';
import { useAdventure } from '../store';
import { gameStageArt } from '../art';
import { GameLoading } from '../components/loading';
import { PathNode } from '../components/path-node';
import { PathPopover } from '../components/path-popover';
import type { PathAnchor } from '../components/path-popover-layout';
import { PathStats } from '../components/path-stats';
import { MixedUnitBanner } from '../components/mixed-unit-banner';
import { combinedActivityDates, practiceActivityDates } from '../activity';
import { useChallenges, challengeXP } from '../challenge-store';
import { profileQuestStore, totalProfileXP } from '../profile-quests-runtime';
import { mixedPathUnits, type MixedPathNode } from '../mixed-path';
import { mixedCurrentNode, mixedNodeState, mixedPathOffset } from '../mixed-path-state';
import { pathActorVisible, pathUnitTheme, visiblePathUnit } from '../path-units';
import { useLessonAccess } from '@/hooks/use-lesson-access';
import { PathFriend } from '../components/path-friend';
import { HomeUnitCard } from '../components/home-unit-card';
import {
  HomeComingSoonCloud,
  HomeMapBackdrop,
  HomeUnitLandmark,
} from '../components/home-map-decoration';

export function AdventureHome() {
  const game = useAdventure();
  const old = useAppStore();
  const lessonAccess = useLessonAccess();
  const challenges = useChallenges();
  const quests = profileQuestStore();
  const hydrateChallenges = challenges.hydrate;
  const now = useLocalDay();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const rowPositions = useRef<Record<string, number>>({});
  const rowHeights = useRef<Record<string, number>>({});
  const unitPositions = useRef<Record<number, number>>({});
  const pathTop = useRef(0);
  const revealOnLayout = useRef(true);
  const [pathWidth, setPathWidth] = useState(
    Math.min(width - space.page * 2, pathTheme.contentWidth),
  );
  const [selected, setSelected] = useState<{ node: MixedPathNode; anchor: PathAnchor } | null>(
    null,
  );
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visibleUnitId, setVisibleUnitId] = useState(1);
  const visibleUnitRef = useRef(1);
  const viewport = useRef({ top: 0, height: 0 });
  const visibleActorSignature = useRef('');
  const [visibleActors, setVisibleActors] = useState<ReadonlySet<string>>(new Set());
  const sideCharacterSize = Math.min(82, Math.max(40, (pathWidth - 112) / 2));
  const progress = {
    adventure: game,
    completedLessonIds: old.completedLessonIds,
    passedLessonIds: lessonAccess.passedLessonIds,
    skippedLessonIds: lessonAccess.skippedLessonIds,
    lessonCompletions: old.lessonCompletions,
    practices: challenges.completed,
    practicesReady: challenges.hydrated,
  };
  const current = mixedCurrentNode(progress);
  const currentKey = current ? String(current.key) : '';
  const currentUnitId = Number(
    mixedPathUnits.find((unit) => unit.nodes.some((node) => node.key === currentKey))?.id ?? 1,
  );
  const showUnit = useCallback((id: number) => {
    if (visibleUnitRef.current === id) return;
    visibleUnitRef.current = id;
    setVisibleUnitId(id);
  }, []);
  const updateActorVisibility = useCallback(() => {
    const keys = [currentKey, ...mixedPathUnits.map((unit) => unit.nodes[3]!.key)].filter(Boolean);
    const visible = [...new Set(keys)].filter((key) =>
      pathActorVisible(
        rowPositions.current[key],
        rowHeights.current[key] ?? 124,
        viewport.current.top - pathTop.current,
        viewport.current.height,
      ),
    );
    const signature = visible.join('|');
    if (visibleActorSignature.current === signature) return;
    visibleActorSignature.current = signature;
    setVisibleActors(new Set(visible));
  }, [currentKey]);
  useEffect(() => {
    updateActorVisibility();
  }, [updateActorVisibility]);
  const hasProgress =
    game.started ||
    game.earned.length > 0 ||
    old.completedLessonIds.length > 0 ||
    Object.keys(challenges.completed).length > 0;
  const ready = game.hydrated && old.hydrated && challenges.hydrated && lessonAccess.ready;

  useEffect(() => {
    void hydrateChallenges();
  }, [hydrateChallenges]);
  const revealCurrent = useCallback(
    (animated = false) => {
      const row = currentKey ? rowPositions.current[currentKey] : undefined;
      if (row === undefined) return;
      const unitTop = unitPositions.current[currentUnitId];
      if (unitTop === undefined) return;
      const top = row - unitTop < 240 ? unitTop : row - space.lg;
      showUnit(currentUnitId);
      scroll.current?.scrollTo({ y: Math.max(0, pathTop.current + top), animated });
      revealOnLayout.current = false;
    },
    [currentKey, currentUnitId, showUnit],
  );
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setSelected(null);
      if (ready && hasProgress) {
        revealOnLayout.current = true;
        revealCurrent();
      } else {
        revealOnLayout.current = false;
        showUnit(1);
        scroll.current?.scrollTo({ y: 0, animated: false });
      }
      return () => {
        setFocused(false);
      };
    }, [hasProgress, ready, revealCurrent, setFocused, setSelected, showUnit]),
  );

  if (!ready)
    return lessonAccess.error ? (
      <View style={[styles.notice, { paddingTop: insets.top + space.xl }]}>
        <T variant="heading">Your saved path needs another read</T>
        <T>{lessonAccess.error}</T>
        <Button title="Retry loading" onPress={() => void lessonAccess.refresh()} />
      </View>
    ) : (
      <GameLoading />
    );

  const sparks = totalProfileXP(old, game, quests, challengeXP(challenges));
  const activityDates = combinedActivityDates(
    old.activityDates,
    game.activityDates,
    practiceActivityDates(challenges.completed, now),
  );
  const visibleUnit =
    mixedPathUnits.find((unit) => unit.id === visibleUnitId) ?? mixedPathUnits[0]!;
  const openNode = (node: MixedPathNode) => {
    if (!mixedNodeState(node, progress).unlocked) return;
    setSelected(null);
    if (node.ref.kind === 'adventure') {
      game.begin();
      router.push({ pathname: '/adventure/[id]', params: { id: node.ref.stageId } });
    } else if (node.ref.kind === 'challenge') {
      router.push({ pathname: '/practice/[id]', params: { id: node.ref.challengeId } });
    } else {
      router.push({ pathname: '/lesson/[id]', params: { id: node.ref.lessonId } });
    }
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, backgroundColor: pathUnitTheme(visibleUnitId).ground },
      ]}
    >
      <PathStats
        level={getLevel(sparks)}
        streak={getStreak(activityDates, now)}
        sparks={sparks}
        stages={game.completed.length}
        activityDates={activityDates}
        now={now}
      />
      <HomeUnitCard
        unit={visibleUnit}
        onGuide={() => {
          feedback('light');
          router.push({ pathname: '/guide/[id]', params: { id: String(visibleUnit.id) } });
        }}
      />
      {challenges.saveError ? (
        <View style={styles.notice} accessibilityLiveRegion="assertive">
          <T variant="small">{challenges.saveError}</T>
          <Button
            title="Retry saving practice"
            variant="secondary"
            loading={saving}
            onPress={async () => {
              setSaving(true);
              try {
                await challenges.retry();
              } finally {
                setSaving(false);
              }
            }}
          />
        </View>
      ) : null}
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: pathUnitTheme(8).ground }}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: pathUnitTheme(8).ground }]}
        onLayout={(event) => {
          viewport.current.height = event.nativeEvent.layout.height;
          updateActorVisibility();
        }}
        scrollEventThrottle={32}
        onScroll={(event) => {
          const next = visiblePathUnit(
            unitPositions.current,
            event.nativeEvent.contentOffset.y - pathTop.current,
            currentUnitId,
          );
          showUnit(next);
          viewport.current = {
            top: event.nativeEvent.contentOffset.y,
            height: event.nativeEvent.layoutMeasurement.height,
          };
          updateActorVisibility();
        }}
        onScrollBeginDrag={() => setSelected(null)}
        onContentSizeChange={() => {
          if (revealOnLayout.current) revealCurrent();
        }}
      >
        <View
          style={styles.path}
          onLayout={(event) => {
            pathTop.current = event.nativeEvent.layout.y;
            setPathWidth(
              Math.min(event.nativeEvent.layout.width - space.page * 2, pathTheme.contentWidth),
            );
            if (revealOnLayout.current) revealCurrent();
          }}
        >
          {mixedPathUnits.map((unit) => {
            const theme = pathUnitTheme(unit.id);
            const unitCompleted = unit.nodes.filter(
              (node) => mixedNodeState(node, progress).done,
            ).length;
            return (
              <Fragment key={unit.id}>
                <View
                  style={{ backgroundColor: theme.ground, paddingHorizontal: space.page }}
                  onLayout={(event) => {
                    unitPositions.current[unit.id] = event.nativeEvent.layout.y;
                    if (revealOnLayout.current) revealCurrent();
                  }}
                >
                  <MixedUnitBanner
                    unit={unit}
                    completed={unitCompleted}
                    action={
                      unit.id === currentUnitId && current
                        ? {
                            label: mixedNodeState(current, progress).earned
                              ? 'Rebuild'
                              : 'Continue',
                            onPress: () => openNode(current),
                          }
                        : undefined
                    }
                    onNotebook={
                      unit.id === currentUnitId ? () => router.push('/notebook') : undefined
                    }
                  />
                </View>
                {unit.nodes.map((node, index) => {
                  const state = mixedNodeState(node, progress);
                  const active = node.key === currentKey;
                  const open = selected?.node.key === node.key;
                  const nodeOffset = mixedPathOffset(index, pathWidth, fontScale);
                  const conversation =
                    node.ref.kind === 'challenge' &&
                    challengeById(node.ref.challengeId)?.kind === 'interview';
                  return (
                    <View
                      key={node.key}
                      testID={`mixed-path-${node.key}`}
                      onLayout={(event) => {
                        rowPositions.current[node.key] = event.nativeEvent.layout.y;
                        rowHeights.current[node.key] = event.nativeEvent.layout.height;
                        updateActorVisibility();
                        if (revealOnLayout.current) revealCurrent();
                      }}
                      style={[
                        styles.step,
                        { backgroundColor: theme.ground },
                        index === 0 && { paddingTop: space.xl },
                      ]}
                    >
                      <HomeMapBackdrop tint={theme.tint} index={index} unitId={unit.id} />
                      <View style={styles.nodeContent}>
                        <PathNode
                          title={node.title}
                          nextLabel={
                            active
                              ? `${state.earned ? 'Try again' : 'Next'}: ${node.title}`
                              : undefined
                          }
                          art={gameStageArt[node.artStage]}
                          symbol={
                            node.ref.kind === 'lesson' ? 'lesson' : conversation ? 'story' : 'game'
                          }
                          done={state.done}
                          unlocked={state.unlocked}
                          active={active}
                          selected={open}
                          offset={nodeOffset}
                          chapterProgress={unitCompleted / unit.nodes.length}
                          tint={theme.tint}
                          edge={theme.edge}
                          onPress={(anchor) => {
                            feedback('light');
                            setSelected(open ? null : { node, anchor });
                          }}
                        >
                          {active ? (
                            <PathFriend
                              character="ami"
                              unitId={unit.id}
                              size={Math.min(76, sideCharacterSize)}
                              idle
                              side={nodeOffset > 0 ? 'left' : 'right'}
                              active={focused && visibleActors.has(node.key)}
                            />
                          ) : null}
                          {index === 3 ? (
                            <PathFriend
                              character={theme.character}
                              unitId={unit.id}
                              size={sideCharacterSize}
                              side={active || unit.id % 2 === 0 ? 'left' : 'right'}
                              active={focused && visibleActors.has(node.key)}
                            />
                          ) : null}
                          {!active && (index === 1 || index === 5) ? (
                            <View
                              pointerEvents="none"
                              style={{
                                position: 'absolute',
                                top: 26,
                                [index === 1 ? 'right' : 'left']: 0,
                              }}
                            >
                              <HomeUnitLandmark
                                unitId={unit.id}
                                index={index}
                                size={Math.min(64, sideCharacterSize)}
                              />
                            </View>
                          ) : null}
                        </PathNode>
                      </View>
                    </View>
                  );
                })}
              </Fragment>
            );
          })}
          <HomeComingSoonCloud />
        </View>
      </ScrollView>
      {selected
        ? (() => {
            const state = mixedNodeState(selected.node, progress);
            return (
              <PathPopover
                key={selected.node.key}
                title={selected.node.title}
                detail={`${selected.node.ref.kind === 'lesson' ? 'Lesson' : selected.node.caption} · ${state.detail}`}
                action={state.action}
                unlocked={state.unlocked}
                anchor={selected.anchor}
                tint={
                  pathUnitTheme(
                    mixedPathUnits.find((unit) =>
                      unit.nodes.some((node) => node.key === selected.node.key),
                    )?.id ?? 1,
                  ).tint
                }
                onDismiss={() => setSelected(null)}
                onPress={() => openNode(selected.node)}
              />
            );
          })()
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { alignItems: 'center', flexGrow: 1 },
  path: { width: '100%' },
  notice: {
    width: '100%',
    maxWidth: pathTheme.contentWidth + space.page * 2,
    alignSelf: 'center',
    gap: space.sm,
    paddingHorizontal: space.page,
    paddingVertical: space.md,
  },
  step: { paddingTop: space.sm, paddingBottom: space.sm, paddingHorizontal: space.page },
  nodeContent: { width: '100%', maxWidth: pathTheme.contentWidth, alignSelf: 'center' },
});

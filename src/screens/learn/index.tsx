import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Character } from '@/components/ui/character';
import { GameIcon } from '@/components/ui/game-icon';
import { LessonNode } from '@/components/learning/lesson-node';
import { LessonPopover } from '@/components/learning/lesson-popover';
import { UnitBanner } from '@/components/learning/unit-banner';
import { QuestSummary } from '@/components/learning/quest-summary';
import { StatusStrip } from '@/components/learning/status-strip';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { missions, getLesson } from '@/data/curriculum';
import { getLessonState } from '@/domain/progression';
import {
  lessonPathNodeAreaHeight,
  lessonPopoverScrollTarget,
  lessonStoryScrollTarget,
} from '@/domain/lesson-path-layout';
import { useAppLayout } from '@/hooks/use-app-layout';
import { useMotionReduced } from '@/hooks/use-reduced-motion';
import { colors, radius, space } from '@/theme';
import { StoryIntro } from '@/components/learning/story-intro';
import {
  getStoryForContent,
  storyChapters,
  storyLessonIds,
  type StoryContentRef,
} from '@/data/storybook';

type Selected = { missionId: number; id: string; row: number; checkpoint?: boolean };
const offsets = [0, -48, -64, -18, 44];
export function LearnScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const completed = useAppStore((s) => s.completedLessonIds),
    completions = useAppStore((s) => s.lessonCompletions);
  const project = useAppStore((s) => s.project);
  const reduced = useMotionReduced();
  const { desktop, width } = useAppLayout();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<number, number>>({});
  const bannerHeights = useRef<Record<number, number>>({});
  const pathHeights = useRef<Record<number, number>>({});
  const viewportHeight = useRef(600);
  const popoverHeights = useRef<Record<string, number>>({});
  const pendingReveal = useRef<{ item: Selected; target: 'popover' | 'story' } | null>(null);
  const revealFrame = useRef<number | null>(null);
  const readingStory = useRef(false);
  const initialScroll = useRef(false);
  const [stageWidth, setStageWidth] = useState(Math.min(width - 32, 520));
  const [selected, setSelected] = useState<Selected | null>(null);
  const [activePopoverHeight, setActivePopoverHeight] = useState(210);
  const activeMission =
    missions.find((m) => m.lessonIds.some((id) => !completed.includes(id))) ??
    missions[missions.length - 1];
  useEffect(() => {
    scroll.current?.scrollTo({ y: positions.current[activeMission.id] ?? 0, animated: false });
  }, [activeMission.id]);
  useEffect(
    () => () => {
      pendingReveal.current = null;
      if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
    },
    [],
  );
  const revealPopover = (item: Selected, height: number, animated = !reduced) => {
    const bannerHeight = bannerHeights.current[item.missionId] ?? 106;
    scroll.current?.scrollTo({
      y: lessonPopoverScrollTarget({
        sectionTop: positions.current[item.missionId] ?? 0,
        bannerHeight,
        row: item.row,
        popoverHeight: height,
        viewportHeight: viewportHeight.current,
        stickyBanner: !embedded,
      }),
      animated,
    });
  };
  const revealStory = (item: Selected, animated = !reduced) => {
    scroll.current?.scrollTo({
      y: lessonStoryScrollTarget(
        positions.current[item.missionId] ?? 0,
        lessonPathNodeAreaHeight(item.row, popoverHeights.current[item.id] ?? 210),
        bannerHeights.current[item.missionId] ?? 106,
      ),
      animated,
    });
  };
  const pick = (item: Selected, target: 'popover' | 'story' = 'popover') => {
    const closing = target === 'popover' && selected?.id === item.id;
    readingStory.current = !closing && target === 'story';
    pendingReveal.current = closing || selected?.id === item.id ? null : { item, target };
    setActivePopoverHeight(popoverHeights.current[item.id] ?? 210);
    setSelected(closing ? null : item);
    if (!closing) {
      if (target === 'story') revealStory(item);
      else revealPopover(item, popoverHeights.current[item.id] ?? 210);
    }
  };
  const onPopoverLayout = (event: LayoutChangeEvent) => {
    if (!selected) return;
    const height = event.nativeEvent.layout.height;
    popoverHeights.current[selected.id] = height;
    setActivePopoverHeight(height);
    const requested = pendingReveal.current;
    if (requested?.item.id === selected.id) {
      if (revealFrame.current !== null) cancelAnimationFrame(revealFrame.current);
      // Consume the explicit request after layout even if total content height stays unchanged.
      revealFrame.current = requestAnimationFrame(() => {
        revealFrame.current = null;
        if (pendingReveal.current !== requested) return;
        pendingReveal.current = null;
        if (requested.target === 'story') revealStory(requested.item, false);
        else revealPopover(requested.item, height, false);
      });
    }
  };
  const recordSectionHeight = (id: number, kind: 'banner' | 'path', height: number) => {
    (kind === 'banner' ? bannerHeights : pathHeights).current[id] = height;
    let offset = 0;
    for (const unit of missions) {
      positions.current[unit.id] = offset;
      offset += (bannerHeights.current[unit.id] ?? 106) + (pathHeights.current[unit.id] ?? 570);
    }
    if (
      Object.keys(bannerHeights.current).length === missions.length &&
      Object.keys(pathHeights.current).length === missions.length &&
      !initialScroll.current
    ) {
      initialScroll.current = true;
      scroll.current?.scrollTo({ y: positions.current[activeMission.id], animated: false });
    }
  };
  const goCurrent = () =>
    scroll.current?.scrollTo({ y: positions.current[activeMission.id] ?? 0, animated: !reduced });
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        paddingTop: embedded || desktop ? 0 : insets.top,
      }}
    >
      {!desktop && !embedded ? (
        <View
          style={{ paddingHorizontal: space.lg, borderBottomWidth: 2, borderColor: colors.border }}
        >
          <StatusStrip />
        </View>
      ) : null}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 24,
          paddingHorizontal: desktop ? 24 : 16,
        }}
      >
        <View
          style={{ flex: 1, maxWidth: 560 }}
          onLayout={(e) => {
            setStageWidth(e.nativeEvent.layout.width);
            viewportHeight.current = e.nativeEvent.layout.height;
            if (selected && !readingStory.current)
              revealPopover(selected, popoverHeights.current[selected.id] ?? 210, false);
          }}
        >
          <ScrollView
            ref={scroll}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={embedded ? [] : missions.map((_, i) => i * 2)}
            contentContainerStyle={{ paddingBottom: 48 }}
            onScrollBeginDrag={() => {
              pendingReveal.current = null;
              if (!embedded && activePopoverHeight < viewportHeight.current - 16) setSelected(null);
            }}
            onContentSizeChange={() => {
              const requested = pendingReveal.current;
              if (!requested || requested.item.id !== selected?.id) return;
              pendingReveal.current = null;
              if (requested.target === 'story') revealStory(requested.item, false);
              else
                revealPopover(
                  requested.item,
                  popoverHeights.current[requested.item.id] ?? 210,
                  false,
                );
            }}
          >
            {missions.flatMap((mission) => {
              const missionStory = storyChapters.find(
                (chapter) => chapter.missionId === mission.id,
              );
              const locked = mission.id > activeMission.id;
              const complete = mission.lessonIds.every((id) => completed.includes(id));
              const open = selected?.missionId === mission.id;
              const selectedLesson =
                open && selected && !selected.checkpoint ? getLesson(selected.id) : undefined;
              const storyLessonId = selectedLesson
                ? storyLessonIds.find((id) => id === selectedLesson.id)
                : undefined;
              const reference: StoryContentRef | undefined = storyLessonId
                ? { kind: 'lesson', lessonId: storyLessonId }
                : undefined;
              const selectedStory = reference ? getStoryForContent(reference) : missionStory;
              const items = [
                mission.lessonIds[0],
                mission.lessonIds[1],
                `checkpoint-${mission.id}`,
                mission.lessonIds[2],
                mission.lessonIds[3],
              ];
              return [
                <View
                  key={`banner-${mission.id}`}
                  onLayout={(e) => {
                    // Sticky headers are wrapped by ScrollView, so their local y is always 0.
                    recordSectionHeight(mission.id, 'banner', e.nativeEvent.layout.height);
                  }}
                  style={{ zIndex: 5, backgroundColor: colors.surface }}
                >
                  <UnitBanner mission={mission} locked={locked} complete={complete} />
                  {embedded && missionStory ? (
                    <View
                      style={{
                        gap: space.xs,
                        paddingHorizontal: space.sm,
                        paddingBottom: space.md,
                      }}
                    >
                      <T variant="small" numberOfLines={2}>
                        {missionStory.opening}
                      </T>
                      <Button
                        title="Read this mission’s story"
                        variant="quiet"
                        compact
                        uppercase={false}
                        onPress={() =>
                          pick({ missionId: mission.id, id: mission.lessonIds[0], row: 0 }, 'story')
                        }
                      />
                    </View>
                  ) : null}
                </View>,
                <View
                  key={`path-${mission.id}`}
                  onLayout={(e) =>
                    recordSectionHeight(mission.id, 'path', e.nativeEvent.layout.height)
                  }
                  style={{ zIndex: 0 }}
                >
                  <View
                    style={{
                      height: lessonPathNodeAreaHeight(
                        open && selected ? selected.row : null,
                        activePopoverHeight,
                      ),
                      paddingTop: 34,
                      position: 'relative',
                      zIndex: 0,
                    }}
                  >
                    {items.map((id, row) => {
                      const checkpoint = id.startsWith('checkpoint-');
                      const lesson = checkpoint ? undefined : getLesson(id)!;
                      const nodeState = lesson
                        ? getLessonState(id, completed, completions)
                        : completed.includes(mission.lessonIds[1])
                          ? 'completed'
                          : 'locked';
                      const chosen = selected?.id === id;
                      return (
                        <View
                          key={id}
                          style={{
                            position: 'absolute',
                            top: 34 + row * 100,
                            left: stageWidth / 2 + offsets[row] - 48,
                            zIndex: chosen ? 8 : 1,
                          }}
                        >
                          {lesson ? (
                            <LessonNode
                              lesson={lesson}
                              state={nodeState}
                              selected={chosen}
                              onPress={() => pick({ missionId: mission.id, id, row })}
                            />
                          ) : (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Project checkpoint, ${nodeState === 'locked' ? 'locked' : 'available'}`}
                              onPress={() =>
                                pick({ missionId: mission.id, id, row, checkpoint: true })
                              }
                              style={({ pressed }) => ({
                                width: 96,
                                height: 88,
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: [{ translateY: pressed && !reduced ? 3 : 0 }],
                              })}
                            >
                              <GameIcon
                                name="reward"
                                size={62}
                                variant={nodeState === 'locked' ? 'muted' : 'color'}
                              />
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                    {!locked ? (
                      <View
                        style={{
                          pointerEvents: 'none',
                          position: 'absolute',
                          left: Math.min(stageWidth - 114, stageWidth / 2 + 58),
                          top: 130,
                          alignItems: 'center',
                        }}
                      >
                        <Character
                          emotion={complete ? 'original' : 'pointing'}
                          size={110}
                          active={mission.id === activeMission.id}
                        />
                      </View>
                    ) : null}
                    {open && selected
                      ? (() => {
                          const lesson = selected.checkpoint ? undefined : getLesson(selected.id);
                          const status = lesson
                            ? getLessonState(lesson.id, completed, completions)
                            : completed.includes(mission.lessonIds[1])
                              ? 'completed'
                              : 'locked';
                          const isLocked = status === 'locked';
                          const isDone = status === 'completed' || status === 'mastered';
                          return (
                            <View
                              key={selected.id}
                              onLayout={onPopoverLayout}
                              style={{
                                position: 'absolute',
                                top: 122 + selected.row * 100,
                                left: Math.max(0, (stageWidth - 286) / 2),
                                width: Math.min(286, stageWidth),
                                zIndex: 20,
                                gap: space.md,
                              }}
                            >
                              <LessonPopover
                                title={lesson?.title ?? 'Project checkpoint'}
                                detail={
                                  isLocked
                                    ? 'Finish the previous steps to unlock this one.'
                                    : selected.checkpoint
                                      ? 'Review the work you have added to your project.'
                                      : `${lesson?.minutes} min${isDone ? '' : ` · +${lesson?.xp} Sparks`}`
                                }
                                locked={isLocked}
                                label={
                                  selected.checkpoint
                                    ? 'View project'
                                    : isDone
                                      ? 'Practice'
                                      : 'Start lesson'
                                }
                                onStart={() => {
                                  pendingReveal.current = null;
                                  readingStory.current = false;
                                  setSelected(null);
                                  if (selected.checkpoint) router.push('/notebook');
                                  else
                                    router.push({
                                      pathname: '/lesson/[id]',
                                      params: { id: selected.id },
                                    });
                                }}
                              />
                              {embedded && selectedStory ? (
                                <Button
                                  title="Read story"
                                  variant="quiet"
                                  compact
                                  uppercase={false}
                                  onPress={() => {
                                    pendingReveal.current = null;
                                    readingStory.current = true;
                                    revealStory(selected);
                                  }}
                                />
                              ) : null}
                            </View>
                          );
                        })()
                      : null}
                  </View>
                  {embedded && open && selected && selectedStory ? (
                    <View
                      key={`inline-story-${selected.id}`}
                      style={{
                        gap: space.md,
                        paddingHorizontal: space.sm,
                        paddingBottom: space.xl,
                      }}
                    >
                      <T variant="subheading" accessibilityRole="header">
                        {selectedStory.title}
                      </T>
                      <StoryIntro story={selectedStory} reference={reference} compact />
                      <Button
                        title="Close story"
                        variant="quiet"
                        compact
                        uppercase={false}
                        onPress={() => {
                          pendingReveal.current = null;
                          readingStory.current = false;
                          setSelected(null);
                        }}
                      />
                    </View>
                  ) : null}
                  {embedded ? (
                    <View
                      style={{
                        gap: space.sm,
                        paddingHorizontal: space.sm,
                        paddingBottom: space.xl,
                      }}
                    >
                      <T variant="caption" style={{ color: colors.primaryPressed }}>
                        ALL LESSONS IN THIS MISSION
                      </T>
                      {mission.lessonIds.map((id, index) => {
                        const lesson = getLesson(id)!;
                        const state = getLessonState(id, completed, completions);
                        return (
                          <Pressable
                            key={id}
                            accessibilityRole="button"
                            accessibilityLabel={`${lesson.title}. ${state === 'locked' ? 'Read story; lesson locked.' : 'View lesson and story.'}`}
                            onPress={() =>
                              pick({
                                missionId: mission.id,
                                id,
                                row: index < 2 ? index : index + 1,
                              })
                            }
                            style={({ pressed }) => ({
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: space.md,
                              paddingVertical: space.md,
                              borderBottomWidth: 1,
                              borderColor: colors.border,
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <View style={{ flex: 1, gap: space.xs }}>
                              <T variant="small" style={{ color: colors.text }}>
                                {index + 1}. {lesson.title}
                              </T>
                              <T variant="caption">
                                {state === 'locked'
                                  ? 'Story available · lesson locked'
                                  : state === 'completed' || state === 'mastered'
                                    ? 'Completed · practice available'
                                    : `${lesson.minutes} min · lesson available`}
                              </T>
                            </View>
                            <Icon name="next" color={colors.primaryPressed} size={20} />
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>,
              ];
            })}
          </ScrollView>
          {!selected ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to current mission"
              onPress={goCurrent}
              style={({ pressed }) => ({
                position: 'absolute',
                right: 4,
                bottom: 12,
                width: 46,
                height: 46,
                borderRadius: 14,
                borderWidth: 2,
                borderBottomWidth: pressed ? 2 : 4,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <View style={{ transform: [{ rotate: '-90deg' }] }}>
                <Icon name="back" color={colors.primaryPressed} size={24} />
              </View>
            </Pressable>
          ) : null}
        </View>
        {desktop && !embedded ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ width: 280, flexGrow: 0 }}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, gap: 24 }}
          >
            <StatusStrip />
            <QuestSummary />
            <View
              style={{
                borderWidth: 2,
                borderColor: colors.border,
                borderRadius: radius.card,
                padding: space.page,
                gap: space.md,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <GameIcon name="project" size={44} />
                <T variant="subheading" style={{ flex: 1 }}>
                  {project.name || 'My project'}
                </T>
              </View>
              <T variant="small" numberOfLines={3}>
                {project.problem || 'Your lesson answers are saved here.'}
              </T>
              <Button
                title="Open project"
                variant="quiet"
                compact
                onPress={() => router.push('/notebook')}
              />
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { T } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { colors, pathTheme, radius, space } from '@/theme';
import { feedback } from '@/utils/feedback';
import { challengeCatalog } from '../challenges/catalog';
import { useChallenges, isChallengeUnlocked } from '../challenge-store';
import { gameStageArt } from '../art';
import { PathNode } from './path-node';
import { PathPopover } from './path-popover';
import type { PathAnchor } from './path-popover-layout';
import {
  getStoryChapter,
  getStoryForContent,
  storyChallengeIds,
  type StoryContentRef,
} from '@/data/storybook';
import { StoryIntro } from '@/components/learning/story-intro';
import { PathStoryCard } from './path-story-card';

const bends = [0, -42, -56, 0, 54, 30];

export function PathPractice() {
  const challenges = useChallenges();
  const [selected, setSelected] = useState<{ id: string; anchor: PathAnchor } | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const libraryStory = getStoryChapter('library-reliable-holds');
  const clubStory = getStoryChapter('club-meeting-move');
  const complete = challengeCatalog.filter((item) => Boolean(challenges.completed[item.id])).length;
  const current = challengeCatalog.find(
    (item) => !challenges.completed[item.id] && isChallengeUnlocked(item.id, challenges.completed),
  );
  return (
    <View style={{ gap: space.xxl, paddingTop: space.xl }}>
      <View
        style={{
          minHeight: 78,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          gap: space.xs,
          backgroundColor: pathTheme.practice,
          borderBottomWidth: 5,
          borderColor: pathTheme.practiceEdge,
          borderRadius: radius.control,
          borderCurve: 'continuous',
        }}
      >
        <T variant="caption" style={{ color: colors.premiumSurface }}>
          PRACTICE · {complete}/{challengeCatalog.length}
        </T>
        <T variant="subheading" style={{ color: colors.surface }}>
          Keep building.
        </T>
      </View>
      {challenges.saveError ? (
        <View style={{ gap: space.sm }}>
          <T variant="small">{challenges.saveError}</T>
          <Button
            title="Retry saving"
            variant="secondary"
            onPress={() => {
              void challenges.retry();
            }}
          />
        </View>
      ) : null}
      <View>
        {challengeCatalog.map((challenge, index) => {
          const unlocked =
            challenges.hydrated && isChallengeUnlocked(challenge.id, challenges.completed);
          const done = Boolean(challenges.completed[challenge.id]);
          const open = selected?.id === challenge.id;
          const offset = bends[index % bends.length]!;
          const previous = challengeCatalog[index - 1];
          const storyId = storyChallengeIds.find((id) => id === challenge.id);
          const reference: StoryContentRef | undefined = storyId
            ? { kind: 'challenge', challengeId: storyId }
            : undefined;
          const story = reference ? getStoryForContent(reference) : undefined;
          return (
            <View key={challenge.id} style={{ zIndex: open ? 20 : 0 }}>
              {index === 12 ? (
                <View style={{ gap: space.md, paddingTop: space.xxl, paddingBottom: space.xxl }}>
                  <T variant="caption" style={{ color: colors.premium }}>
                    CHAPTERS 2 & 3 · LIBRARY AND CLUB
                  </T>
                  {[libraryStory, clubStory].map((chapter) =>
                    chapter ? (
                      <PathStoryCard
                        key={chapter.id}
                        story={chapter}
                        open={reading === chapter.id}
                        onToggle={() => {
                          setSelected(null);
                          setReading(reading === chapter.id ? null : chapter.id);
                        }}
                      />
                    ) : null,
                  )}
                  <T variant="small">
                    These two project cases follow the same Explore-to-Ship stages. Practices unlock
                    in the order shown below.
                  </T>
                </View>
              ) : null}
              <PathNode
                title={challenge.title}
                art={gameStageArt[challenge.stage]}
                done={done}
                unlocked={unlocked}
                active={challenge.id === current?.id}
                selected={open}
                offset={offset}
                chapterProgress={complete / challengeCatalog.length}
                tint={pathTheme.practice}
                edge={pathTheme.practiceEdge}
                onPress={(anchor) => {
                  feedback('light');
                  setSelected(open ? null : { id: challenge.id, anchor });
                }}
              />
              <View style={{ alignItems: 'center', gap: space.xs, paddingBottom: space.md }}>
                <T variant="small" style={{ textAlign: 'center' }}>
                  {index + 1}. {challenge.title}
                </T>
                {story ? (
                  <Button
                    title={reading === challenge.id ? 'Close story' : 'Read story'}
                    variant="quiet"
                    compact
                    uppercase={false}
                    onPress={() => {
                      setSelected(null);
                      setReading(reading === challenge.id ? null : challenge.id);
                    }}
                  />
                ) : null}
              </View>
              {story && reading === challenge.id ? (
                <View style={{ gap: space.md, padding: space.md, paddingBottom: space.xxl }}>
                  <T variant="small">{story.opening}</T>
                  <StoryIntro story={story} reference={reference} compact />
                </View>
              ) : null}
              {open ? (
                <PathPopover
                  title={challenge.title}
                  detail={
                    unlocked
                      ? challenge.instructions
                      : challenges.hydrated
                        ? `Finish “${previous?.title ?? 'the previous practice'}” first.`
                        : 'Loading your saved practice…'
                  }
                  action={done ? 'Play again' : `Play +${challenge.reward} Sparks`}
                  unlocked={unlocked}
                  anchor={selected!.anchor}
                  tint={pathTheme.practice}
                  onDismiss={() => setSelected(null)}
                  onPress={() => {
                    setSelected(null);
                    router.push({ pathname: '/practice/[id]', params: { id: challenge.id } });
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

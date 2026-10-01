import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { StoryIntro } from '@/components/learning/story-intro';
import type { StoryChapter, StoryContentRef } from '@/data/storybook';
import { colors, radius, space } from '@/theme';

/** Read a chapter locally while actual activities retain their existing progress gates. */
export function PathStoryCard({
  story,
  open,
  onToggle,
  reference,
}: {
  story: StoryChapter;
  open: boolean;
  onToggle: () => void;
  reference?: StoryContentRef;
}) {
  return (
    <View
      style={{
        padding: space.lg,
        gap: space.md,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: radius.large,
        borderCurve: 'continuous',
        backgroundColor: colors.surface,
      }}
    >
      <T variant="subheading" accessibilityRole="header">
        {story.title}
      </T>
      <T variant="small">{story.opening}</T>
      <Button
        title={open ? 'Close chapter story' : 'Read chapter story'}
        variant="quiet"
        compact
        uppercase={false}
        onPress={onToggle}
      />
      {open ? <StoryIntro story={story} reference={reference} compact /> : null}
    </View>
  );
}

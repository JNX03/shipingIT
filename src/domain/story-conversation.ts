import type { StoryChapter, StoryContentSelection, StoryLine } from '../data/storybook';

export function storyReferenceKey(ref: StoryContentSelection): string {
  return ref.kind === 'adventure'
    ? `adventure:${ref.stageId}`
    : ref.kind === 'challenge'
      ? `challenge:${ref.challengeId}`
      : `lesson:${ref.lessonId}`;
}

export interface ActivityStoryMoment {
  key: string;
  index: number;
  title: string;
  text: string;
  dialogue?: StoryLine;
}

/** Only this real activity's authored moments. Other moments belong to their own activities. */
export function activityStoryMoments(
  story: StoryChapter,
  reference?: StoryContentSelection,
): ActivityStoryMoment[] {
  if (!reference) return [];
  const key = storyReferenceKey(reference);
  return story.beats.flatMap((beat, index) =>
    storyReferenceKey(beat.ref) === key
      ? [
          {
            key: `${story.id}:${index}`,
            index,
            title: beat.title,
            text: beat.text,
            ...(story.conversation[index] ? { dialogue: story.conversation[index] } : {}),
          },
        ]
      : [],
  );
}

/** Chapter setup/closing context belongs to the actual first/last referenced activity. */
export function activityStoryContext(story: StoryChapter, reference?: StoryContentSelection) {
  const moments = activityStoryMoments(story, reference);
  return {
    moments,
    opening: moments.length ? story.opening : null,
    stakes: moments.some((moment) => moment.index === 0) ? story.stakes : null,
    ending: moments.some((moment) => moment.index === story.beats.length - 1) ? story.ending : null,
    nextQuestion: moments.some((moment) => moment.index === story.beats.length - 1)
      ? story.nextQuestion
      : null,
  };
}

/** A face beside a bubble must leave room for readable long text at mobile widths. */
export function conversationLayout(width: number, fontScale: number) {
  const small = width < 360 || fontScale >= 1.4;
  return { avatarSize: small ? 42 : 56, gap: 8, stacked: fontScale >= 2 };
}

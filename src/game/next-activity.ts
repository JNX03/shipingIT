import { getBonusLesson } from '../data/learning-guides';
import type { MixedPathNode } from './mixed-path';
import { mixedCurrentNode, type MixedPathProgress } from './mixed-path-state';

export type ActivityHref =
  | '/(tabs)'
  | '/pro-labs'
  | { pathname: '/lesson/[id]'; params: { id: string } }
  | { pathname: '/adventure/[id]'; params: { id: string } }
  | { pathname: '/practice/[id]'; params: { id: string } };

export interface NextActivity {
  label: string;
  href: ActivityHref;
  node?: MixedPathNode;
}

/** Results use the same canonical activity as Path; a bonus lab stays outside core gates. */
export function nextMixedActivity(
  progress: MixedPathProgress,
  completedLessonId?: string,
): NextActivity {
  if (completedLessonId && getBonusLesson(completedLessonId))
    return { label: 'More Pro labs', href: '/pro-labs' };

  const node = mixedCurrentNode(progress);
  if (!node) return { label: 'Return to path', href: '/(tabs)' };
  const ref = node.ref;
  if (ref.kind === 'lesson')
    return {
      label: 'Next lesson',
      href: { pathname: '/lesson/[id]', params: { id: ref.lessonId } },
      node,
    };
  if (ref.kind === 'adventure')
    return {
      label: 'Next game',
      href: { pathname: '/adventure/[id]', params: { id: ref.stageId } },
      node,
    };
  return {
    label: 'Next practice',
    href: { pathname: '/practice/[id]', params: { id: ref.challengeId } },
    node,
  };
}

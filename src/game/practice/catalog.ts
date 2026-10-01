import { challengeCatalog } from '../challenges/catalog';
import type { Challenge, ChallengeKind } from '../challenges/model';

export const practiceSkills: {
  kind: ChallengeKind;
  title: string;
  label: string;
  icon: 'interview' | 'evidence' | 'scope' | 'prototype' | 'build' | 'validate';
  detail: string;
  goal: string;
}[] = [
  {
    kind: 'interview',
    title: 'Interview',
    label: 'Interview',
    icon: 'interview',
    detail: 'Ask, listen, and pin evidence.',
    goal: 'Uncover the experience and its impact, then put each clue on the evidence board.',
  },
  {
    kind: 'sort',
    title: 'Make sense of evidence',
    label: 'Evidence',
    icon: 'evidence',
    detail: 'Separate facts from assumptions.',
    goal: 'Read each note and place it in the category its evidence supports.',
  },
  {
    kind: 'pack',
    title: 'Scope a first version',
    label: 'Scope',
    icon: 'scope',
    detail: 'Pack a complete, affordable build.',
    goal: 'Include the essential features and their dependencies without exceeding the budget.',
  },
  {
    kind: 'layout',
    title: 'Design a usable screen',
    label: 'Design',
    icon: 'prototype',
    detail: 'Arrange, resize, and test.',
    goal: 'Put context, status, and action in the right places, then test the current screen.',
  },
  {
    kind: 'wire',
    title: 'Connect a journey',
    label: 'Connect',
    icon: 'build',
    detail: 'Make every action go somewhere.',
    goal: 'Connect each user action to the intended result and run the journey.',
  },
  {
    kind: 'repair',
    title: 'Repair a broken journey',
    label: 'Repair',
    icon: 'validate',
    detail: 'Find a failure, fix it, and rerun.',
    goal: 'Run the original journey first, repair its failures, then test the changed version.',
  },
];

/** Read-only copies: optional practice never uses the earned path's reward or prerequisites. */
export const practiceCatalog: Challenge[] = challengeCatalog.map((challenge) => ({
  ...challenge,
  reward: 0,
  prerequisite: null,
}));

export function practiceById(id: string) {
  return practiceCatalog.find((challenge) => challenge.id === id);
}

export function skillForPractice(challenge: Challenge) {
  return practiceSkills.find((skill) => skill.kind === challenge.kind)!;
}

import { createLearningGuideIndex } from './index-core';
import { unit1Content } from './unit-1';
import { unit2Content } from './unit-2';
import { unit3Content } from './unit-3';
import { unit4Content } from './unit-4';
import { unit5Content } from './unit-5';
import { unit6Content } from './unit-6';
import { unit7Content } from './unit-7';
import { unit8Content } from './unit-8';

export const learningUnits = [
  unit1Content,
  unit2Content,
  unit3Content,
  unit4Content,
  unit5Content,
  unit6Content,
  unit7Content,
  unit8Content,
];
export const learningGuideIndex = createLearningGuideIndex(learningUnits);
export const bonusLessons = learningGuideIndex.bonusLessons;
export const getTaskGuide = learningGuideIndex.guideFor;
export const getBonusLesson = (id: string) => bonusLessons.find((lesson) => lesson.id === id);

export type StartingPoint = 'find-problem' | 'have-idea' | 'have-project' | 'competitions';
export type LearningGoal =
  | 'first-project'
  | 'startup'
  | 'portfolio'
  | 'competitions'
  | 'entrepreneurship'
  | 'product-design';
export type WorldId =
  | 'school'
  | 'community'
  | 'environment'
  | 'education'
  | 'accessibility'
  | 'productivity'
  | 'healthcare'
  | 'small-business';
export type NodeType =
  'lesson' | 'quiz' | 'project' | 'mentor' | 'experiment' | 'reward' | 'checkpoint' | 'boss';
export type LessonState = 'locked' | 'available' | 'current' | 'completed' | 'mastered';

export interface Project {
  name: string;
  description: string;
  problem: string;
  targetUser: string;
  painPoints: string;
  observations: string;
  interviews: string;
  evidence: string;
  assumptions: string;
  insights: string;
  valueProposition: string;
  features: string;
  mvp: string;
  userJourney: string;
  prototype: string;
  validationPlan: string;
  validationResults: string;
  validationDecision: string;
  competitors: string;
  businessModel: string;
  technicalPlan: string;
  buildStatus: string;
  pitch: string;
  launchStrategy: string;
  marketing: string;
  feedback: string;
  updates: string;
  nextSteps: string;
  firstUser: string;
  shippedUrl: string;
}
export type ProjectField = keyof Project;
export interface ProjectInputField {
  key: ProjectField;
  label: string;
  placeholder: string;
  minLength: number;
  help?: string;
}
export interface ExerciseBase {
  id: string;
  prompt: string;
  explanation: string;
  hint: string;
  context?: string;
}
export interface ExerciseOption {
  id: string;
  text: string;
}
export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  options: ExerciseOption[];
  correctAnswerIds: string[];
}
export interface MultiExercise extends ExerciseBase {
  type: 'multi';
  options: ExerciseOption[];
  correctAnswerIds: string[];
}
export interface SortExercise extends ExerciseBase {
  type: 'sort';
  items: ExerciseOption[];
  correctOrder: string[];
}
export interface CategorizeExercise extends ExerciseBase {
  type: 'categorize';
  items: ExerciseOption[];
  categories: { id: string; label: string }[];
  correctCategories: Record<string, string>;
}
export interface ProjectExercise extends ExerciseBase {
  type: 'project';
  fields: ProjectInputField[];
}
export type Exercise =
  ChoiceExercise | MultiExercise | SortExercise | CategorizeExercise | ProjectExercise;
export interface Lesson {
  id: string;
  missionId: number;
  title: string;
  subtitle: string;
  xp: number;
  minutes: number;
  nodeType: NodeType;
  exercises: Exercise[];
}
export interface Mission {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  icon: string;
  lessonIds: string[];
  outcome: string;
  guidebook: { title: string; body: string }[];
}
export interface Profile {
  name: string;
  startingPoint: StartingPoint;
  goal: LearningGoal;
  dailyGoal: 1 | 2 | 3;
  world: WorldId;
}
export interface Settings {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
}
export interface LessonCompletion {
  completedAt: string;
  perfect: boolean;
}
export interface PersistedAppState {
  schemaVersion: 1;
  onboardingComplete: boolean;
  profile: Profile;
  settings: Settings;
  project: Project;
  completedLessonIds: string[];
  xp: number;
  activityDates: string[];
  achievements: string[];
  lessonCompletions: Record<string, LessonCompletion>;
  activityLog: Record<string, string[]>;
}
export interface CompletionResult {
  success: boolean;
  alreadyCompleted: boolean;
  xpEarned: number;
  newAchievements: string[];
  missionCompleted: number | null;
  reason?: string;
}
export interface Achievement {
  id: string;
  title: string;
  description: string;
  requirement: string;
  icon: string;
  color: string;
}
export type ExerciseAnswer = string[] | Record<string, string> | Partial<Project>;
export interface AnswerResult {
  correct: boolean;
  explanation: string;
  errors: string[];
}

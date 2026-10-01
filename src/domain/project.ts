import type { Project, ProjectField } from './types';

export const projectFieldLabels: Record<ProjectField, string> = {
  name: 'Project name',
  description: 'One-line description',
  problem: 'Problem statement',
  targetUser: 'Target user',
  painPoints: 'Pain points',
  observations: 'Observations',
  interviews: 'Interview notes',
  evidence: 'Evidence',
  assumptions: 'Assumptions',
  insights: 'Insights',
  valueProposition: 'Value proposition',
  features: 'Feature scope',
  mvp: 'Minimum viable product',
  userJourney: 'User journey',
  prototype: 'Prototype',
  validationPlan: 'Validation plan',
  validationResults: 'Validation results',
  validationDecision: 'Decision after testing',
  competitors: 'Alternatives and competitors',
  businessModel: 'Business model',
  technicalPlan: 'Technical plan',
  buildStatus: 'Build status',
  pitch: 'Pitch',
  launchStrategy: 'Launch strategy',
  marketing: 'Marketing plan',
  feedback: 'Feedback',
  updates: 'Updates',
  nextSteps: 'Next steps',
  firstUser: 'First real user',
  shippedUrl: 'Live project link',
};
export const projectFields = Object.keys(projectFieldLabels) as ProjectField[];
export function createEmptyProject(): Project {
  return Object.fromEntries(projectFields.map((key) => [key, ''])) as unknown as Project;
}
export interface ProjectStage {
  id: string;
  title: string;
  missionId: number;
  fields: ProjectField[];
}
export const projectStages: ProjectStage[] = [
  {
    id: 'problem',
    title: 'Problem',
    missionId: 1,
    fields: ['observations', 'problem', 'painPoints'],
  },
  { id: 'user', title: 'User', missionId: 2, fields: ['targetUser', 'interviews', 'evidence'] },
  { id: 'insight', title: 'Insight', missionId: 2, fields: ['assumptions', 'insights'] },
  {
    id: 'solution',
    title: 'Solution',
    missionId: 3,
    fields: ['name', 'description', 'valueProposition'],
  },
  { id: 'mvp', title: 'MVP', missionId: 3, fields: ['mvp', 'features', 'userJourney'] },
  { id: 'prototype', title: 'Prototype', missionId: 4, fields: ['prototype'] },
  {
    id: 'validation',
    title: 'Validation',
    missionId: 5,
    fields: ['validationPlan', 'validationResults', 'validationDecision', 'feedback'],
  },
  { id: 'business', title: 'Business', missionId: 6, fields: ['competitors', 'businessModel'] },
  { id: 'build', title: 'Build', missionId: 7, fields: ['technicalPlan', 'buildStatus'] },
  {
    id: 'launch',
    title: 'Launch',
    missionId: 8,
    fields: [
      'pitch',
      'launchStrategy',
      'marketing',
      'firstUser',
      'shippedUrl',
      'updates',
      'nextSteps',
    ],
  },
];
/** Workspace completeness measures written artifacts, never proof that an idea is validated. */
export function getProjectProgress(project: Project) {
  const stages = projectStages.map((stage) => {
    const completedFields = stage.fields.filter((key) => project[key].trim().length > 0).length;
    return {
      ...stage,
      completedFields,
      totalFields: stage.fields.length,
      complete: completedFields === stage.fields.length,
      progress: completedFields / stage.fields.length,
    };
  });
  const totalFields = stages.reduce((sum, stage) => sum + stage.totalFields, 0);
  const completedFields = stages.reduce((sum, stage) => sum + stage.completedFields, 0);
  return {
    stages,
    completedFields,
    totalFields,
    percent: Math.round((100 * completedFields) / totalFields),
    currentStage: stages.find((stage) => !stage.complete) ?? stages[stages.length - 1]!,
    completedStages: stages.filter((stage) => stage.complete).length,
  };
}
export function makeProjectPack(project: Project, learnerName = ''): string {
  const lines = [
    `# ${project.name.trim() || 'My innovation project'}`,
    '',
    ...(learnerName.trim() ? [`Prepared by ${learnerName.trim()}`, ''] : []),
    'A working project canvas. Written plans and learner-reported evidence are not independently verified.',
    '',
  ];
  for (const field of projectFields.filter((key) => key !== 'name')) {
    lines.push(
      `## ${projectFieldLabels[field]}`,
      '',
      project[field].trim() || 'Not recorded yet.',
      '',
    );
  }
  return lines.join('\n');
}

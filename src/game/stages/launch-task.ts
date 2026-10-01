import type { GameDraft, NpcId } from '../types';
import {
  checkConnections,
  checkPersonaWalkthrough,
  flowEdgeKey,
  staffFlowEdges,
} from '../logic/build';

export type PrototypeAction = 'choose' | 'refresh' | 'staff-update';
export interface LaunchTaskAttempt {
  signature: string;
  taskId: NpcId;
  completed: number;
}

export const launchTaskGuides = {
  mali: {
    title: 'Choose a stall',
    instruction: 'Compare the waits. Tap one stall.',
    expected: 'Clear, separate queue choices.',
    actions: ['choose'],
    affectedPart: 'queue choices',
  },
  ken: {
    title: 'Refresh, then choose',
    instruction: 'Refresh. Check the update time. Choose a stall.',
    expected: 'Update time before queue choices.',
    actions: ['refresh', 'choose'],
    affectedPart: 'update time',
  },
  noa: {
    title: 'Publish a queue update',
    instruction: 'Tap Publish update. Watch the waits change.',
    expected: 'Staff update reaches the board.',
    actions: ['staff-update'],
    affectedPart: 'staff update control below the phone',
  },
} satisfies Record<
  NpcId,
  {
    title: string;
    instruction: string;
    expected: string;
    actions: PrototypeAction[];
    affectedPart: string;
  }
>;

export function launchPrototypeSignature(draft: GameDraft): string {
  return JSON.stringify([draft.design, draft.connect]);
}

/** Only real preview callbacks advance an attempt, and only for this task/version. */
export function recordLaunchTaskAction(
  previous: LaunchTaskAttempt | null,
  draft: GameDraft,
  taskId: NpcId,
  action: PrototypeAction,
): LaunchTaskAttempt {
  const signature = launchPrototypeSignature(draft);
  const completed =
    previous?.signature === signature && previous.taskId === taskId ? previous.completed : 0;
  const sequence: PrototypeAction[] = launchTaskGuides[taskId].actions;
  return {
    signature,
    taskId,
    completed: completed + (sequence[completed] === action ? 1 : 0),
  };
}

export function launchTaskAttemptComplete(
  attempt: LaunchTaskAttempt | null,
  draft: GameDraft,
  taskId: NpcId,
): boolean {
  return (
    attempt?.signature === launchPrototypeSignature(draft) &&
    attempt.taskId === taskId &&
    attempt.completed === launchTaskGuides[taskId].actions.length
  );
}

export function launchTaskResult(taskId: NpcId, draft: GameDraft) {
  const result = checkPersonaWalkthrough(taskId, draft);
  let actual: string;
  if (taskId === 'mali') {
    actual =
      draft.design.spacing < 12
        ? `Rows are crowded (spacing ${draft.design.spacing}).`
        : 'Queue rows have a clear gap.';
  } else if (taskId === 'ken') {
    const update = draft.design.blocks.find((block) => block.kind === 'updated');
    const queue = draft.design.blocks.find((block) => block.kind === 'queue');
    actual =
      update && queue
        ? update.y < queue.y
          ? 'Update time is above the choices.'
          : 'Update time is below the choices.'
        : 'Update time or queue choices are missing.';
  } else {
    const edges = new Set(draft.connect.links.map((link) => flowEdgeKey(link.from, link.to)));
    const missing = staffFlowEdges.filter((edge) => !edges.has(edge));
    const names: Record<string, string> = {
      'report>save': 'Staff reports → Save update',
      'save>queues': 'Save update → Queue data',
    };
    actual = missing.length
      ? `Missing: ${names[missing[0]!]}.`
      : 'Staff update reaches queue data.';
  }
  return {
    valid: result.valid,
    expected: launchTaskGuides[taskId].expected,
    actual,
    message: result.message,
  };
}

export function launchActionResult(action: PrototypeAction, draft: GameDraft, stall?: string) {
  if (action === 'choose')
    return { worked: true, expected: 'Choose one stall.', actual: `${stall ?? 'Stall'} selected.` };
  const connected = checkConnections(draft).valid;
  const edges = new Set(draft.connect.links.map((link) => flowEdgeKey(link.from, link.to)));
  const worked =
    connected && (action === 'refresh' || staffFlowEdges.every((edge) => edges.has(edge)));
  return {
    worked,
    expected:
      action === 'refresh' ? 'New waits and update time.' : 'Staff update changes the board.',
    actual: worked
      ? 'Waits and update time changed.'
      : action === 'refresh'
        ? 'Refresh stopped before queue data.'
        : 'Staff report did not reach queue data.',
  };
}

/** Each learner action gives evidence immediately; it never advances a task by itself. */
export function tryLaunchTaskAction(
  previous: LaunchTaskAttempt | null,
  draft: GameDraft,
  taskId: NpcId,
  action: PrototypeAction,
  stall?: string,
) {
  const actionResult = launchActionResult(action, draft, stall);
  const attempt = actionResult.worked
    ? recordLaunchTaskAction(previous, draft, taskId, action)
    : previous;
  const relevant = (launchTaskGuides[taskId].actions as PrototypeAction[]).includes(action);
  const result = launchTaskResult(taskId, draft);
  const phase =
    relevant && (!result.valid || !actionResult.worked)
      ? 'issue'
      : relevant && launchTaskAttemptComplete(attempt, draft, taskId)
        ? 'passed'
        : 'idle';
  return { attempt, phase, actionResult, taskResult: result } as const;
}

/** A broken staff path emits no success callback; it can be inspected but never passed. */
export function canCheckLaunchTask(
  attempt: LaunchTaskAttempt | null,
  draft: GameDraft,
  taskId: NpcId,
): boolean {
  return (
    launchTaskAttemptComplete(attempt, draft, taskId) ||
    (taskId === 'noa' && !checkPersonaWalkthrough(taskId, draft).valid)
  );
}

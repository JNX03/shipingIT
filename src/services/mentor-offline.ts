import type { MentorRequest, MentorResponse } from './contracts';

/** Authored coaching rules. This is deliberately not represented as model-generated AI. */
export function offlineMentor(request: MentorRequest, reason?: string): MentorResponse {
  const project = request.project;
  const focus = request.focus;
  const prompt = request.prompt.toLowerCase();
  const base = {
    mode: 'offline' as const,
    reason: reason || 'Offline coaching uses a built-in guide. Your project stays on this device.',
  };
  if (focus === 'pitch' || (!focus && /pitch|present|story/.test(prompt))) {
    return {
      ...base,
      message: project.problem
        ? 'Start with the moment your user struggles, then show what changed when they tried your solution.'
        : 'A convincing pitch begins with a specific problem. Find that before polishing the slides.',
      challenge: 'Can you tell the problem, evidence, and smallest solution in 30 seconds?',
      evidencePrompt:
        'Use one observation or quote that you actually collected. Label anything you have not tested as an assumption.',
      nextAction:
        'Write four sentences: who struggles, what happens, what you built, and what you learned.',
    };
  }
  if (
    focus === 'scope' ||
    (!focus &&
      (/mvp|scope|feature/.test(prompt) ||
        (/build/.test(prompt) && Boolean(project.problem?.trim()))))
  ) {
    return {
      ...base,
      message: project.mvp
        ? 'Your MVP is a test of one promise. It does not need every feature of the final product.'
        : 'Choose one user, one painful moment, and one outcome your first version must deliver.',
      challenge:
        'If you could ship only one feature this week, which would test the biggest uncertainty?',
      evidencePrompt:
        'Name the observation that makes this feature essential. A feature request alone is not proof of need.',
      nextAction:
        'Put one feature in Must Have, one in Later, and write how you will know the first one helped.',
    };
  }
  if (focus === 'validation' || (!focus && /test|validat|experiment|feedback/.test(prompt))) {
    return {
      ...base,
      message:
        'A useful test could prove you wrong. Decide what result would change your direction before you run it.',
      challenge:
        'What can you observe people doing, instead of asking whether they like your idea?',
      evidencePrompt:
        'Record who you tested with, the task, what happened, and the result. Do not invent users or outcomes.',
      nextAction:
        'Ask one person to try the core task without help. Record where they hesitate and one change to test next.',
    };
  }
  if (focus === 'evidence' || (!focus && /evidence|interview|assum|research/.test(prompt))) {
    return {
      ...base,
      message: project.evidence?.trim()
        ? 'You have recorded evidence. Now separate what the person actually said or did from your interpretation.'
        : 'A believable idea starts with an observed pattern. You do not need a large survey to begin.',
      challenge: 'What is the strongest reason your assumption might be wrong?',
      evidencePrompt:
        'Ask: “Tell me about the last time this happened.” Capture their words without leading them toward your solution.',
      nextAction:
        'Interview one relevant person with consent. Save an anonymous quote, an observation, and an assumption to revisit.',
    };
  }
  const solutionFirst = /\b(app|platform|ai|website|bot|build|create)\b/i.test(
    project.problem || request.prompt,
  );
  if (!project.problem?.trim() || solutionFirst) {
    return {
      ...base,
      message: solutionFirst
        ? 'That sounds like a solution direction. Let’s look for the specific struggle underneath it.'
        : 'You do not need an idea yet. Notice a small moment that feels harder than it should.',
      challenge:
        'Who is having a difficult time, what are they trying to do, and what gets in the way?',
      evidencePrompt:
        'Describe the last time you saw this happen. Keep the observation separate from your explanation.',
      nextAction:
        'Write: “[User] struggles to [goal] when [situation], because [barrier].” Then ask one user if this matches their experience.',
    };
  }
  return {
    ...base,
    message: project.targetUser?.trim()
      ? 'You have a problem and a target user. The next step is to test whether that struggle matters enough to act on.'
      : 'Your problem is a useful starting point. Make the target user narrow enough that you can find and talk to someone.',
    challenge: 'How do people handle this today, and what does that workaround cost them?',
    evidencePrompt:
      'Look for frequency, time lost, or an abandoned task. Compliments and hypothetical interest are weaker signals.',
    nextAction:
      'Record one current workaround and one real example. Use it to revise your problem statement.',
  };
}

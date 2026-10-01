# StudyBuddy template integration

This directory owns a second playable project template. It does not import or modify the LunchLens adventure store, curriculum, route files, notebook, authentication, provider settings, or package manifest.

```tsx
import {
  StudyBuddyTemplate,
  createStudyBuddyDraft,
  normalizeStudyDraft,
} from '@/game/templates/study';

<StudyBuddyTemplate
  key={projectId}
  initialDraft={normalizeStudyDraft(savedStudyDraft ?? createStudyBuddyDraft())}
  onDraftChange={(draft) => saveSeparateStudyProject(projectId, draft)}
  onExit={() => leaveStudyProject()}
/>
```

`initialDraft` is a mount-time seed. Key the screen by project identity when switching projects. `onDraftChange` receives a normalized, versioned, serializable draft after each explicit builder edit; the host owns persistence and its save/error UI. The template never writes the shared adventure state. `StudyBuddyPrototype({ draft })` is an inline preview for My App; put it inside the existing keyboard-safe scrollable screen. `StudyBuddyBuilder({ draft, onChange, onTry? })` is available for hosts that supply their own screen shell.

Builder choices change real behavior: exercise changes the question/answer/hints; goal changes coaching prompts; untouched hints change when switching styles; custom hints are preserved; the knowledge-feedback switch controls the expected/actual comparison panel. Local learner context is shown in practice and excluded from mentor serialization. Editing the question or expected answer marks the exercise custom. Selecting an authored exercise replaces its question, answer, and hints.

The default chat uses authored prompts, without artificial typing delays or network requests. Ask gives general study guidance and explicitly states its limits. Reply performs a disclosed answer-format match, not an assessment of understanding. Hint advances through three authored hints. Learners can report helped/gave-too-much/unclear, inspect an expected/actual comparison, and explicitly reveal the expected answer. The answer-marker guard blocks direct answer leaks; it cannot prove semantic hint quality.

## Optional live mentor seam

`createStudyMentorAdapter(review)` accepts an injected review function structurally compatible with the frontend `mentorProvider.review` after its question/history/hint contract lands. It never imports `src/server`. The adapter sends only the visible practice question, selected goal/style, current explicit input/action, and at most six completed question/answer turns. It always sets `attachProject: false` and `project: {}`. It never sends local learner context, authored hints, expected answers, or notebook notes. Oversized combined prompts are rejected before calling the review function.

The host may pass `remoteService={adapter}` and `remoteReady={true}` only after actual service readiness is independently verified. Endpoint presence alone is insufficient. The prototype then displays an optional, initially off consent switch that describes the payload. Each session requires the learner to enable it. Changing local/live modes resets chat history and cancels pending work. The draft never stores consent. Offline mentor responses are labeled authored fallback; errors preserve the typed text for retry. Guide messages display their actual source.

No live request or provider/key creation was performed during this implementation. The default host integration must omit remote props until backend configuration, frontend serialization, authentication, and a real response have been verified.

## Validation

Focused tests:

```sh
npx tsx --test src/game/templates/study/model.test.ts src/game/templates/study/session.test.ts
```

Add `src/game/templates/study/*.test.ts` to the host's test command when integrating. The tests cover all authored exercise/style combinations, direct answer leak guards, configuration restoration, actual chat/hint/reply state, explicit learner feedback, concurrency, failure/retry, reset/disposal/timeout cancellation, bounded history, and the question-only mentor payload. Run the repository's lint, typecheck, and centralized export/build checks after integration. Native visual/keyboard QA remains a host integration check; no extra Metro server or device interaction was started here.

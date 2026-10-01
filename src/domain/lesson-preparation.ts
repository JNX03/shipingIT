export const LESSON_ENTRY_MINIMUM_MS = 600;
export const LESSON_ENTRY_TIMEOUT_MS = 12_000;

export type LessonPreparationState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; reason: 'timeout' | 'asset-error' | 'data-timeout' | 'data-error' };

type Schedule = (callback: () => void, delay: number) => () => void;

/** Bounds one real asset load; cancellation invalidates callbacks, not shared downloads. */
export function createLessonPreparationController(options: {
  load: () => Promise<unknown>;
  dataReady?: boolean;
  recoverData?: () => Promise<void>;
  onChange: (state: LessonPreparationState) => void;
  minimumMs?: number;
  timeoutMs?: number;
  schedule?: Schedule;
}) {
  const schedule: Schedule = options.schedule ?? ((callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  });
  let generation = 0;
  let active = false;
  let timers: (() => void)[] = [];

  function clearTimers() {
    const pending = timers;
    timers = [];
    for (const clear of pending) clear();
  }

  function cancel() {
    generation += 1;
    active = false;
    clearTimers();
  }

  function start() {
    cancel();
    const attempt = generation;
    active = true;
    const awaitingData = options.dataReady === false;
    let assetsReady = false;
    let minimumElapsed = false;
    const current = () => active && generation === attempt;
    const finish = (state: LessonPreparationState) => {
      if (!current()) return;
      active = false;
      clearTimers();
      options.onChange(state);
    };
    const ready = () => {
      if (assetsReady && minimumElapsed) finish({ status: 'ready' });
    };
    options.onChange({ status: 'loading' });
    if (!current()) return;
    timers.push(schedule(() => {
      if (!current()) return;
      minimumElapsed = true;
      ready();
    }, options.minimumMs ?? LESSON_ENTRY_MINIMUM_MS));
    timers.push(schedule(() => finish({
      status: 'error', reason: awaitingData ? 'data-timeout' : 'timeout',
    }),
      options.timeoutMs ?? LESSON_ENTRY_TIMEOUT_MS));
    if (awaitingData) {
      try {
        // Recovery may load real data, but only the caller's ready flag opens the gate.
        void options.recoverData?.().catch(() => finish({ status: 'error', reason: 'data-error' }));
      } catch {
        finish({ status: 'error', reason: 'data-error' });
      }
      return;
    }
    try {
      void options.load().then(() => {
        if (!current()) return;
        assetsReady = true;
        ready();
      }, () => finish({ status: 'error', reason: 'asset-error' }));
    } catch {
      finish({ status: 'error', reason: 'asset-error' });
    }
  }

  return { start, cancel };
}

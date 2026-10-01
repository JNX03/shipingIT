export type LessonExitState = {
  saving: boolean;
  failure: string;
  retryVisible: boolean;
  presentationKey: number;
};

export function createInitialLessonExitState(): LessonExitState {
  return { saving: false, failure: '', retryVisible: false, presentationKey: 0 };
}

/** One save may outlive its native sheet, but only the focused lifetime may show its result. */
export function createLessonExitFlow(callbacks: {
  onChange: (state: LessonExitState) => void;
  onKeep: () => void;
  onLeave: () => Promise<void>;
}) {
  let state = createInitialLessonExitState();
  let active = false;
  let lifetime = 0;
  let pending: object | null = null;

  const publish = (next: LessonExitState) => {
    state = next;
    if (active) callbacks.onChange(state);
  };
  const close = () => {
    // Retire the instance so its delayed native dismissal cannot close a later presentation.
    publish({
      ...state,
      failure: '',
      retryVisible: false,
      presentationKey: state.presentationKey + 1,
    });
    callbacks.onKeep();
  };

  return {
    updateCallbacks(next: Pick<typeof callbacks, 'onKeep' | 'onLeave'>) {
      callbacks = { ...callbacks, ...next };
    },
    activate() {
      active = true;
      publish({ ...state, saving: pending !== null });
    },
    dispose() {
      active = false;
      lifetime++;
      state = {
        ...state,
        failure: '',
        retryVisible: false,
        presentationKey: state.presentationKey + 1,
      };
    },
    keep() {
      // Button/escape requests can be blocked before dismissal actually happens.
      if (!active || pending) return;
      close();
    },
    nativeDismiss(presentationKey: number) {
      if (!active || presentationKey !== state.presentationKey) return;
      // A native swipe has already closed the sheet. Reconcile the parent even during a save.
      close();
    },
    async leave() {
      if (!active || pending) return;
      const attempt = {};
      const startedLifetime = lifetime;
      pending = attempt;
      publish({ ...state, saving: true, failure: '' });
      try {
        await callbacks.onLeave();
        if (active && lifetime === startedLifetime) close();
      } catch (reason) {
        if (active && lifetime === startedLifetime) {
          publish({
            ...state,
            failure:
              reason instanceof Error
                ? reason.message
                : 'Your save did not finish. Please try again.',
            // Always replace the native instance: its dismissal callback may arrive after this rejection.
            retryVisible: true,
            presentationKey: state.presentationKey + 1,
          });
        }
      } finally {
        if (pending === attempt) {
          pending = null;
          publish({ ...state, saving: false });
        }
      }
    },
  };
}

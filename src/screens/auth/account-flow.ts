export type AccountMode = 'signin' | 'signup';
export type AccountStep =
  'methods' | 'email' | 'password' | 'reset' | 'reset-result' | 'verification';
export type AccountOperation = 'signin' | 'signup' | 'reset' | 'google' | 'apple' | 'signout';
export type AccountFlow = { mode: AccountMode; step: AccountStep; email: string; password: string };
export type AccountFlowAction =
  | { type: 'mode'; mode: AccountMode }
  | { type: 'email-method' }
  | { type: 'email'; value: string }
  | { type: 'password'; value: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'reset' }
  | { type: 'signin-after-message' }
  | {
      type: 'result';
      operation: AccountOperation;
      success: boolean;
      pendingVerification?: boolean;
    };

export function accountIntentMode(intent: unknown): AccountMode {
  return intent === 'signup' ? 'signup' : 'signin';
}

export function initialAccountFlow(mode: AccountMode = 'signin'): AccountFlow {
  return { mode, step: 'methods', email: '', password: '' };
}

export function validAccountEmail(email: string): boolean {
  return email.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Advancing email is a local step. Only the final valid form offers an account operation. */
export function accountPrimaryIntent(flow: AccountFlow, pending = false) {
  if (pending || !validAccountEmail(flow.email)) return 'none' as const;
  if (flow.step === 'email') return 'advance' as const;
  if (flow.step === 'reset') return 'reset' as const;
  if (flow.step !== 'password') return 'none' as const;
  if (flow.mode === 'signup')
    return flow.password.length >= 12 ? ('signup' as const) : ('none' as const);
  return flow.password.length ? ('signin' as const) : ('none' as const);
}

export function accountFlowReducer(state: AccountFlow, action: AccountFlowAction): AccountFlow {
  switch (action.type) {
    case 'mode':
      return { ...state, mode: action.mode, step: 'methods', password: '' };
    case 'email-method':
      return { ...state, step: 'email' };
    case 'email':
      return { ...state, email: action.value };
    case 'password':
      return { ...state, password: action.value };
    case 'next':
      return accountPrimaryIntent(state) === 'advance' ? { ...state, step: 'password' } : state;
    case 'back':
      if (state.step === 'password') return { ...state, step: 'email' };
      if (state.step === 'email') return { ...state, step: 'methods' };
      if (state.step === 'reset')
        return { ...state, step: validAccountEmail(state.email) ? 'password' : 'email' };
      if (state.step === 'verification' || state.step === 'reset-result')
        return { ...state, mode: 'signin', step: 'email', password: '' };
      return state;
    case 'reset':
      return { ...state, mode: 'signin', step: 'reset', password: '' };
    case 'signin-after-message':
      return { ...state, mode: 'signin', step: 'email', password: '' };
    case 'result':
      if (!action.success) return state;
      if (action.operation === 'signout') return { ...initialAccountFlow(), email: state.email };
      if (action.operation === 'reset') return { ...state, step: 'reset-result', password: '' };
      if (action.operation === 'signup' && action.pendingVerification)
        return { ...state, step: 'verification', password: '' };
      return { ...state, password: '' };
  }
}

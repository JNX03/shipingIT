export interface CharacterVoiceCallbacks {
  done(): void;
  stopped(): void;
  error(): void;
}

export interface CharacterVoicePorts {
  stop(): Promise<void>;
  speak(text: string, callbacks: CharacterVoiceCallbacks): void;
}

export interface CharacterVoiceOptions {
  allowed(): boolean;
  suspendAmbience(): () => void;
}

interface Utterance {
  generation: number;
  ended: boolean;
  stopRequested: boolean;
  releaseAmbience: () => void;
  onEnd?: () => void;
}

/** Explicit read-aloud with cancellation and a separate ambience lease per request. */
export function createCharacterVoiceController(
  ports: CharacterVoicePorts,
  options: CharacterVoiceOptions,
) {
  let generation = 0;
  let current: Utterance | undefined;
  let stopBarrier: Promise<void> = Promise.resolve();

  const quietly = (operation: () => void) => {
    try { operation(); } catch { /* Optional voice must not block the screen. */ }
  };
  const allowed = () => {
    try { return options.allowed(); } catch { return false; }
  };

  function finish(utterance: Utterance | undefined) {
    if (!utterance || utterance.ended) return;
    utterance.ended = true;
    if (current === utterance) current = undefined;
    quietly(utterance.releaseAmbience);
    quietly(() => utterance.onEnd?.());
  }

  function requestStop() {
    let result: Promise<boolean>;
    try {
      result = ports.stop().then(() => true, () => false);
    } catch {
      result = Promise.resolve(false);
    }
    // Stops are dispatched immediately. Before starting new voice, wait for
    // every earlier stop too: a late native stop must not cut off a newer line.
    const settled = Promise.all([stopBarrier, result]).then(() => undefined);
    stopBarrier = settled;
    return { result, settled };
  }

  function stop(): void {
    generation += 1;
    const stoppedUtterance = current;
    if (stoppedUtterance) stoppedUtterance.stopRequested = true;
    // Keep its lease until this stop settles or its native callback arrives.
    void requestStop().result.then(() => finish(stoppedUtterance));
  }

  async function read(text: string, onEnd?: () => void): Promise<void> {
    const attempt = ++generation;
    const line = text.slice(0, 1800);
    if (!line.trim() || !allowed()) {
      stop();
      quietly(() => onEnd?.());
      return;
    }

    let releaseAmbience: () => void;
    try {
      releaseAmbience = options.suspendAmbience();
    } catch {
      stop();
      quietly(() => onEnd?.());
      return;
    }
    const utterance: Utterance = {
      generation: attempt, ended: false, stopRequested: false, releaseAmbience, onEnd,
    };
    const previous = current;
    current = utterance;
    // Acquire first so replacing a line never briefly restarts ambience.
    finish(previous);

    const isCurrent = () =>
      !utterance.ended && utterance.generation === generation && current === utterance;
    // An old onEnd can synchronously request another line or stop the voice.
    if (!isCurrent()) {
      if (!utterance.stopRequested) finish(utterance);
      return;
    }
    const stopping = requestStop();
    if (!(await stopping.result)) {
      if (!utterance.stopRequested) finish(utterance);
      return;
    }
    await stopping.settled;
    if (!isCurrent() || !allowed()) {
      if (!utterance.stopRequested) finish(utterance);
      return;
    }

    const end = () => finish(utterance);
    try {
      ports.speak(line, { done: end, stopped: end, error: end });
    } catch {
      finish(utterance);
    }
  }

  return { read, stop };
}

import type { CollectionPort } from '../collection/port';
import type { AnchorSnapshot } from '../transcript/types';
import { findMessageScroller } from './discovery';
import { parseMountedWindow } from './parse-window';
import { queryMessageRoots } from './selectors';

const MUTATION_TIMEOUT_MS = 750;
const RESTORE_ATTEMPTS = 8;
const SCROLL_FRACTION = 0.8;

export interface InstagramCollectionPortOptions {
  scroller: HTMLElement;
  anchorRoot: HTMLElement;
  startingScrollTop: number;
}

export function createInstagramCollectionPort({
  scroller: initialScroller,
  anchorRoot,
  startingScrollTop,
}: InstagramCollectionPortOptions): CollectionPort {
  let scroller = initialScroller;

  const resolveScroller = (): HTMLElement | null => {
    if (scroller.isConnected) return scroller;
    const discovered = findMessageScroller(document);
    if (discovered) scroller = discovered;
    return discovered;
  };

  return {
    readWindow() {
      const activeScroller = resolveScroller();
      if (!activeScroller) return { messages: [] };
      const connectedAnchor = activeScroller.contains(anchorRoot)
        ? anchorRoot
        : undefined;
      return parseMountedWindow(activeScroller, connectedAnchor);
    },

    async scrollOlder(signal) {
      signal.throwIfAborted();
      const activeScroller = resolveScroller();
      if (!activeScroller) return 'timed-out';

      const wait = createMutationWait(activeScroller, signal);
      try {
        signal.throwIfAborted();
        activeScroller.scrollBy({
          top: -(SCROLL_FRACTION * activeScroller.clientHeight),
          behavior: 'instant',
        });
        signal.throwIfAborted();
        return await wait.promise;
      } catch (error) {
        wait.cancel();
        throw error;
      }
    },

    isAtVisualTop() {
      const activeScroller = resolveScroller();
      if (!activeScroller) return false;

      const maximumDistance = Math.max(
        0,
        activeScroller.scrollHeight - activeScroller.clientHeight,
      );
      return activeScroller.scrollTop <= -maximumDistance + 1;
    },

    async restoreAnchor(snapshot, signal) {
      signal.throwIfAborted();

      if (anchorRoot.isConnected) {
        signal.throwIfAborted();
        anchorRoot.scrollIntoView({ block: 'center' });
        return true;
      }

      for (let attempt = 0; attempt < RESTORE_ATTEMPTS; attempt += 1) {
        signal.throwIfAborted();
        const activeScroller = resolveScroller();
        if (!activeScroller) break;

        const matchingRoot = findSnapshotRoot(activeScroller, snapshot);
        if (matchingRoot) {
          signal.throwIfAborted();
          matchingRoot.scrollIntoView({ block: 'center' });
          return true;
        }

        const wait = createMutationWait(activeScroller, signal);
        try {
          signal.throwIfAborted();
          activeScroller.scrollTop = Math.min(
            0,
            activeScroller.scrollTop +
              SCROLL_FRACTION * activeScroller.clientHeight,
          );
          signal.throwIfAborted();
          await wait.promise;
        } catch (error) {
          wait.cancel();
          throw error;
        }
      }

      signal.throwIfAborted();
      const fallbackScroller = resolveScroller();
      if (!fallbackScroller) return false;
      signal.throwIfAborted();
      fallbackScroller.scrollTop = startingScrollTop;
      return false;
    },
  };
}

function findSnapshotRoot(
  scroller: HTMLElement,
  snapshot: AnchorSnapshot,
): HTMLElement | null {
  const parsed = parseMountedWindow(scroller);
  const roots = queryMessageRoots(scroller);
  const signatureMatches = parsed.messages
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.signature === snapshot.signature);
  const neighborMatches = signatureMatches.filter(({ index }) => {
    const previousMatches =
      snapshot.previousSignature === undefined ||
      parsed.messages[index - 1]?.signature === snapshot.previousSignature;
    const nextMatches =
      snapshot.nextSignature === undefined ||
      parsed.messages[index + 1]?.signature === snapshot.nextSignature;
    return previousMatches && nextMatches;
  });
  const match =
    neighborMatches[snapshot.occurrenceInWindow] ??
    neighborMatches[0] ??
    signatureMatches[snapshot.occurrenceInWindow];

  return match ? roots[match.index] ?? null : null;
}

function createMutationWait(
  target: HTMLElement,
  signal: AbortSignal,
): {
  promise: Promise<'mutated' | 'timed-out'>;
  cancel(): void;
} {
  signal.throwIfAborted();
  const initialRoots = queryMessageRoots(target);
  let cancel = (): void => undefined;

  const promise = new Promise<'mutated' | 'timed-out'>((resolve, reject) => {
    let settled = false;
    const observer = new MutationObserver(() => {
      const currentRoots = queryMessageRoots(target);
      const rootsChanged =
        currentRoots.length !== initialRoots.length ||
        currentRoots.some((root, index) => root !== initialRoots[index]);
      if (rootsChanged) finish('mutated');
    });
    const timeout = window.setTimeout(
      () => finish('timed-out'),
      MUTATION_TIMEOUT_MS,
    );
    const onAbort = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    const cleanup = (): void => {
      observer.disconnect();
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
    };
    const finish = (result: 'mutated' | 'timed-out'): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    cancel = () => {
      if (settled) return;
      settled = true;
      cleanup();
    };
    signal.addEventListener('abort', onAbort, { once: true });
    observer.observe(target, { childList: true, subtree: true });
  });

  return { promise, cancel: () => cancel() };
}

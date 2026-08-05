import { mergeWindow } from '../transcript/merge';
import { selectEndingAt } from '../transcript/select';
import type { MergeState, TranscriptMessage } from '../transcript/types';
import type {
  CollectionResult,
  CollectMessagesOptions,
} from './port';

const MAX_CONSECUTIVE_STALLS = 3;

export async function collectMessages({
  port,
  initialWindow,
  requestedCount,
  signal,
  onProgress,
}: CollectMessagesOptions): Promise<CollectionResult> {
  const requested = normalizeRequestedCount(requestedCount);
  let state: MergeState = mergeWindow(
    { messages: [], nextKey: 0 },
    initialWindow,
  );
  const anchorKey = state.anchorKey;
  if (!anchorKey) {
    onProgress(0);
    return { status: signal.aborted ? 'cancelled' : 'stalled', messages: [] };
  }

  let prefixLength = getSelectablePrefix(state.messages, anchorKey).length;
  onProgress(Math.min(prefixLength, requested));

  if (signal.aborted) return result('cancelled', state, anchorKey, requested);
  if (prefixLength >= requested) {
    return result('complete', state, anchorKey, requested);
  }

  let consecutiveStalls = 0;

  while (true) {
    try {
      await port.scrollOlder(signal);
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        return result('cancelled', state, anchorKey, requested);
      }
      throw error;
    }

    if (signal.aborted) {
      return result('cancelled', state, anchorKey, requested);
    }

    state = mergeWindow(state, port.readWindow());
    const nextPrefixLength = getSelectablePrefix(state.messages, anchorKey).length;
    const prefixProgress = nextPrefixLength > prefixLength;
    prefixLength = nextPrefixLength;
    onProgress(Math.min(prefixLength, requested));

    if (prefixLength >= requested) {
      return result('complete', state, anchorKey, requested);
    }

    consecutiveStalls = prefixProgress ? 0 : consecutiveStalls + 1;
    if (consecutiveStalls >= MAX_CONSECUTIVE_STALLS) {
      const status = port.isAtVisualTop() ? 'beginning' : 'stalled';
      return result(status, state, anchorKey, requested);
    }
  }
}

function getSelectablePrefix(
  messages: readonly TranscriptMessage[],
  anchorKey: string,
): readonly TranscriptMessage[] {
  const anchorIndex = messages.findIndex(({ key }) => key === anchorKey);
  return anchorIndex < 0 ? [] : messages.slice(0, anchorIndex + 1);
}

function result(
  status: CollectionResult['status'],
  state: MergeState,
  anchorKey: string,
  requestedCount: number,
): CollectionResult {
  return {
    status,
    messages: selectEndingAt(state.messages, anchorKey, requestedCount),
  };
}

function normalizeRequestedCount(count: number): number {
  return Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

import type {
  AnchorSnapshot,
  MergeState,
  NormalizedMessage,
  ParsedWindow,
  TranscriptMessage,
} from './types';

interface Alignment {
  /** Coordinate of incoming[0] relative to existing[0]. */
  offset: number;
  overlapLength: number;
  matchingCount: number;
  longestMatchingRun: number;
  coversAnchor: boolean;
  mapsAnchor: boolean;
}

export function mergeWindow(
  state: MergeState,
  incoming: ParsedWindow,
): MergeState {
  if (incoming.messages.length === 0) return state;

  if (state.messages.length === 0) {
    const assigned = assignKeys(incoming.messages, state.nextKey);
    const anchorKey = isValidIndex(
      incoming.anchorIndex,
      incoming.messages.length,
    )
      ? assigned.messages[incoming.anchorIndex]?.key
      : undefined;

    return {
      messages: assigned.messages,
      nextKey: assigned.nextKey,
      ...(anchorKey ? { anchorKey } : {}),
    };
  }

  const alignment = findBestAlignment(state, incoming.messages);
  if (!alignment) return state;

  const offset = alignment.offset;
  const firstCoordinate = Math.min(0, offset);
  const lastCoordinate = Math.max(
    state.messages.length - 1,
    offset + incoming.messages.length - 1,
  );
  const merged: TranscriptMessage[] = [];
  let nextKey = state.nextKey;

  for (
    let coordinate = firstCoordinate;
    coordinate <= lastCoordinate;
    coordinate += 1
  ) {
    const existing = state.messages[coordinate];
    if (existing) {
      const incomingMessage = incoming.messages[coordinate - offset];
      merged.push(
        incomingMessage?.signature === existing.signature
          ? reconcileAlignedMessage(existing, incomingMessage)
          : existing,
      );
      continue;
    }

    const incomingMessage = incoming.messages[coordinate - offset];
    if (!incomingMessage) continue;

    merged.push(withKey(incomingMessage, nextKey));
    nextKey += 1;
  }

  return {
    messages: merged,
    nextKey,
    ...(state.anchorKey ? { anchorKey: state.anchorKey } : {}),
  };
}

function reconcileAlignedMessage(
  existing: TranscriptMessage,
  incoming: NormalizedMessage,
): TranscriptMessage {
  const sender =
    senderSpecificity(incoming.sender) > senderSpecificity(existing.sender)
      ? incoming.sender
      : existing.sender;

  return {
    ...existing,
    sender,
    ...(existing.timestamp
      ? { timestamp: existing.timestamp }
      : incoming.timestamp
        ? { timestamp: incoming.timestamp }
        : {}),
    ...(existing.reply
      ? { reply: existing.reply }
      : incoming.reply
        ? { reply: incoming.reply }
        : {}),
  };
}

function senderSpecificity(sender: string): number {
  if (sender === 'Unknown') return 0;
  if (sender === 'You') return 1;
  return 2;
}

export function buildAnchorSnapshot(
  parsedWindow: ParsedWindow,
): AnchorSnapshot | undefined {
  if (!isValidIndex(parsedWindow.anchorIndex, parsedWindow.messages.length)) {
    return undefined;
  }

  const anchorIndex = parsedWindow.anchorIndex;
  const anchor = parsedWindow.messages[anchorIndex];
  if (!anchor) return undefined;

  const occurrenceInWindow = parsedWindow.messages
    .slice(0, anchorIndex)
    .filter(({ signature }) => signature === anchor.signature).length;
  const previousSignature = parsedWindow.messages[anchorIndex - 1]?.signature;
  const nextSignature = parsedWindow.messages[anchorIndex + 1]?.signature;

  return {
    signature: anchor.signature,
    occurrenceInWindow,
    ...(previousSignature ? { previousSignature } : {}),
    ...(nextSignature ? { nextSignature } : {}),
  };
}

function findBestAlignment(
  state: MergeState,
  incoming: readonly NormalizedMessage[],
): Alignment | undefined {
  const anchorIndex = state.anchorKey
    ? state.messages.findIndex(({ key }) => key === state.anchorKey)
    : -1;
  let best: Alignment | undefined;

  for (
    let offset = -incoming.length + 1;
    offset < state.messages.length;
    offset += 1
  ) {
    const overlapStart = Math.max(0, offset);
    const overlapEnd = Math.min(
      state.messages.length,
      offset + incoming.length,
    );
    const overlapLength = overlapEnd - overlapStart;
    if (overlapLength <= 0) continue;

    let matchingCount = 0;
    let longestMatchingRun = 0;
    let currentMatchingRun = 0;
    let singleMatchingSignature: string | undefined;

    for (
      let coordinate = overlapStart;
      coordinate < overlapEnd;
      coordinate += 1
    ) {
      const matches =
        state.messages[coordinate]?.signature ===
        incoming[coordinate - offset]?.signature;
      if (!matches) {
        currentMatchingRun = 0;
        continue;
      }

      matchingCount += 1;
      singleMatchingSignature = state.messages[coordinate]?.signature;
      currentMatchingRun += 1;
      longestMatchingRun = Math.max(longestMatchingRun, currentMatchingRun);
    }

    const mapsAnchor =
      anchorIndex >= overlapStart &&
      anchorIndex < overlapEnd &&
      state.messages[anchorIndex]?.signature ===
        incoming[anchorIndex - offset]?.signature;
    const mapsUniqueMessage =
      matchingCount === 1 &&
      singleMatchingSignature !== undefined &&
      countSignature(state.messages, singleMatchingSignature) === 1 &&
      countSignature(incoming, singleMatchingSignature) === 1;
    if (longestMatchingRun < 2 && !mapsAnchor && !mapsUniqueMessage) continue;

    const candidate: Alignment = {
      offset,
      overlapLength,
      matchingCount,
      longestMatchingRun,
      coversAnchor:
        anchorIndex >= overlapStart && anchorIndex < overlapEnd,
      mapsAnchor,
    };

    if (
      !best ||
      candidate.longestMatchingRun > best.longestMatchingRun ||
      (candidate.longestMatchingRun === best.longestMatchingRun &&
        candidate.matchingCount > best.matchingCount) ||
      (candidate.longestMatchingRun === best.longestMatchingRun &&
        candidate.matchingCount === best.matchingCount &&
        candidate.mapsAnchor &&
        !best.mapsAnchor) ||
      (candidate.longestMatchingRun === best.longestMatchingRun &&
        candidate.matchingCount === best.matchingCount &&
        candidate.mapsAnchor === best.mapsAnchor &&
        candidate.coversAnchor &&
        !best.coversAnchor) ||
      (candidate.longestMatchingRun === best.longestMatchingRun &&
        candidate.matchingCount === best.matchingCount &&
        candidate.mapsAnchor === best.mapsAnchor &&
        candidate.coversAnchor === best.coversAnchor &&
        candidate.overlapLength > best.overlapLength)
    ) {
      best = candidate;
    }
  }

  return best;
}

function countSignature(
  messages: readonly NormalizedMessage[],
  signature: string,
): number {
  return messages.filter((message) => message.signature === signature).length;
}

function assignKeys(
  messages: readonly NormalizedMessage[],
  firstKey: number,
): { messages: TranscriptMessage[]; nextKey: number } {
  return {
    messages: messages.map((message, index) => withKey(message, firstKey + index)),
    nextKey: firstKey + messages.length,
  };
}

function withKey(
  message: NormalizedMessage,
  keyNumber: number,
): TranscriptMessage {
  return { ...message, key: `m${keyNumber}` };
}

function isValidIndex(
  index: number | undefined,
  length: number,
): index is number {
  return (
    index !== undefined &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < length
  );
}

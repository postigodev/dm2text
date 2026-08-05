import { describe, expect, it } from 'vitest';
import { buildAnchorSnapshot, mergeWindow } from './merge';
import { selectEndingAt } from './select';
import type {
  MergeState,
  NormalizedMessage,
  ParsedWindow,
  TranscriptMessage,
} from './types';

describe('mergeWindow', () => {
  it('prepends newly mounted older messages and keeps chronological order', () => {
    expect(
      signatures(
        mergeWindow(stateOf('c', 'd'), windowOf('a', 'b', 'c', 'd'))
          .messages,
      ),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not collapse two consecutive identical messages', () => {
    expect(
      signatures(
        mergeWindow(
          stateOf('same', 'same', 'next'),
          windowOf('older', 'same', 'same'),
        ).messages,
      ),
    ).toEqual(['older', 'same', 'same', 'next']);
  });

  it('merges the longest valid suffix-prefix overlap', () => {
    expect(
      signatures(
        mergeWindow(stateOf('b', 'c', 'd'), windowOf('a', 'b', 'c'))
          .messages,
      ),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps messages after the anchor out of anchored selection', () => {
    const existing = stateOf('a', 'anchor');
    const anchorKey = keyFor(existing.messages, 'anchor');
    const merged = mergeWindow(
      { ...existing, anchorKey },
      windowOf('a', 'anchor', 'new'),
    ).messages;

    expect(
      selectEndingAt(merged, anchorKey, 5).map(({ signature }) => signature),
    ).toEqual(['a', 'anchor']);
  });

  it('anchors the selected occurrence among identical adjacent messages', () => {
    const state = mergeWindow(
      emptyState(),
      windowOf('yes', 'yes', 'yes', { anchorIndex: 1 }),
    );

    expect(state.anchorKey).toBe(state.messages[1]?.key);
    expect(
      selectEndingAt(state.messages, state.anchorKey!, 2).map(({ key }) => key),
    ).toEqual([state.messages[0]?.key, state.messages[1]?.key]);
  });

  it('keeps existing keys for the longest overlap', () => {
    const existing = stateOf('b', 'c', 'd');
    const existingKeys = existing.messages.map(({ key }) => key);
    const merged = mergeWindow(existing, windowOf('a', 'b', 'c'));

    expect(merged.messages.slice(1).map(({ key }) => key)).toEqual(
      existingKeys,
    );
  });

  it('enriches an aligned unknown sender without duplicating the message', () => {
    const existing = mergeWindow(emptyState(), {
      messages: [messageWithSender('same', 'Unknown')],
    });
    const merged = mergeWindow(existing, {
      messages: [messageWithSender('same', 'Person A')],
    });

    expect(merged.messages).toHaveLength(1);
    expect(merged.messages[0]).toMatchObject({
      key: existing.messages[0]?.key,
      sender: 'Person A',
    });
  });
});

describe('buildAnchorSnapshot', () => {
  it('records a zero-based occurrence and immediate neighbor signatures', () => {
    expect(
      buildAnchorSnapshot(
        windowOf('before', 'same', 'middle', 'same', 'after', {
          anchorIndex: 3,
        }),
      ),
    ).toEqual({
      signature: 'same',
      occurrenceInWindow: 1,
      previousSignature: 'middle',
      nextSignature: 'after',
    });
  });
});

function emptyState(): MergeState {
  return { messages: [], nextKey: 0 };
}

function stateOf(...values: string[]): MergeState {
  return mergeWindow(emptyState(), windowOf(...values));
}

function windowOf(
  ...values: Array<string | { anchorIndex: number }>
): ParsedWindow {
  const last = values.at(-1);
  const options = typeof last === 'string' ? undefined : last;
  const signatures = options ? values.slice(0, -1) : values;

  return {
    messages: signatures.map((value) => message(String(value))),
    anchorIndex: options?.anchorIndex,
  };
}

function message(signature: string): NormalizedMessage {
  return {
    signature,
    sender: 'You',
    content: { type: 'text', text: signature },
  };
}

function messageWithSender(
  signature: string,
  sender: string,
): NormalizedMessage {
  return {
    signature,
    sender,
    content: { type: 'text', text: signature },
  };
}

function signatures(messages: TranscriptMessage[]): string[] {
  return messages.map(({ signature }) => signature);
}

function keyFor(messages: TranscriptMessage[], signature: string): string {
  const key = messages.find((message) => message.signature === signature)?.key;
  if (!key) throw new Error(`Missing test signature: ${signature}`);
  return key;
}

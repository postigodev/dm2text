import { describe, expect, it } from 'vitest';
import { selectEndingAt } from './select';
import type { TranscriptMessage } from './types';

const messages: TranscriptMessage[] = ['a', 'b', 'c', 'd'].map((key) => ({
  key,
  signature: key,
  sender: key === 'b' ? 'Ada' : 'You',
  content: { type: 'text', text: key.toUpperCase() },
}));

describe('selectEndingAt', () => {
  it('selects N chronological messages ending at the immutable anchor', () => {
    expect(selectEndingAt(messages, 'c', 2).map(({ key }) => key)).toEqual([
      'b',
      'c',
    ]);
  });

  it('returns all available history when fewer than N precede the anchor', () => {
    expect(selectEndingAt(messages, 'b', 5).map(({ key }) => key)).toEqual([
      'a',
      'b',
    ]);
  });

  it('does not include messages received after the anchor', () => {
    expect(selectEndingAt(messages, 'c', 10).map(({ key }) => key)).not.toContain(
      'd',
    );
  });

  it('returns an empty array when the anchor is absent', () => {
    expect(selectEndingAt(messages, 'missing', 2)).toEqual([]);
  });
});

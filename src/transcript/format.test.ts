import { describe, expect, it } from 'vitest';
import { formatTranscript } from './format';
import type { TranscriptMessage } from './types';

describe('formatTranscript', () => {
  it('formats text, media, timestamps, and replies one message per line', () => {
    expect(
      formatTranscript([
        {
          key: '1',
          signature: '1',
          sender: 'Ada',
          timestamp: { time: '14:16' },
          content: { type: 'text', text: 'Hello\nthere' },
        },
        {
          key: '2',
          signature: '2',
          sender: 'You',
          content: { type: 'media', label: 'image' },
          reply: { sender: 'Ada', preview: 'Hello there' },
        },
      ]),
    ).toBe(
      [
        '[14:16] Ada: Hello\\nthere',
        'You (replying to Ada: Hello there): [image]',
      ].join('\n'),
    );
  });

  it('formats a safely attributable time and date', () => {
    expect(
      formatTranscript([
        {
          key: '3',
          signature: '3',
          sender: 'cali',
          timestamp: { time: '6:07 p.m.', date: '29/7/2026' },
          content: { type: 'text', text: 'mensaje' },
        },
      ]),
    ).toBe('[6:07 p.m., 29/7/2026] cali: mensaje');
  });

  it('propagates only visible dates to following chronological messages', () => {
    const datedMessages: TranscriptMessage[] = [
      {
        key: '1',
        signature: '1',
        sender: 'Ada',
        timestamp: { time: '14:16', date: '29/7/2026' },
        content: { type: 'text', text: 'one' },
      },
      {
        key: '2',
        signature: '2',
        sender: 'You',
        timestamp: { time: '14:17' },
        content: { type: 'text', text: 'two' },
      },
    ];

    expect(formatTranscript(datedMessages)).toBe(
      '[14:16, 29/7/2026] Ada: one\n[14:17, 29/7/2026] You: two',
    );
  });

  it('omits blank optional fields and normalizes whitespace without losing emoji', () => {
    expect(
      formatTranscript([
        {
          key: '1',
          signature: '1',
          sender: '  You  ',
          timestamp: { time: '  ', date: ' ' },
          content: {
            type: 'mixed',
            text: '  hello   😄\r\n  there  ',
            label: '  image  ',
          },
          reply: { sender: ' ', preview: ' ' },
        },
      ]),
    ).toBe('You: hello 😄\\nthere [image]');
  });

  it('keeps visible reply context whether its reference is inside or outside the range', () => {
    const selectedMessages: TranscriptMessage[] = [
      {
        key: 'inside',
        signature: 'inside',
        sender: 'Ada',
        content: { type: 'text', text: 'source' },
      },
      {
        key: 'reply-inside',
        signature: 'reply-inside',
        sender: 'You',
        content: { type: 'text', text: 'inside reply' },
        reply: {
          sender: 'Ada',
          preview: 'source',
          referencedKey: 'inside',
        },
      },
      {
        key: 'reply-outside',
        signature: 'reply-outside',
        sender: 'You',
        content: { type: 'text', text: 'outside reply' },
        reply: {
          sender: 'Lin',
          preview: 'older source',
          referencedKey: 'not-selected',
        },
      },
    ];

    expect(formatTranscript(selectedMessages)).toBe(
      [
        'Ada: source',
        'You (replying to Ada: source): inside reply',
        'You (replying to Lin: older source): outside reply',
      ].join('\n'),
    );
  });
});

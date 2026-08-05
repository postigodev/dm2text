import { describe, expect, it, vi } from 'vitest';
import type { CollectionPort } from './port';
import { collectMessages } from './session';
import type { NormalizedMessage, ParsedWindow } from '../transcript/types';

describe('collectMessages', () => {
  it('completes without reading again when enough messages are initially mounted', async () => {
    const port = fakePort();
    const result = await collect(port, anchoredWindow(['a', 'b'], 1), 2);

    expect(result.status).toBe('complete');
    expect(signatures(result.messages)).toEqual(['a', 'b']);
    expect(port.scrollOlder).not.toHaveBeenCalled();
    expect(port.readWindow).not.toHaveBeenCalled();
  });

  it('establishes the anchor from the captured initial window before a new DM', async () => {
    const port = fakePort({
      windows: [windowOf('a', 'anchor', 'new')],
      visualTop: true,
    });
    const progress: number[] = [];
    const result = await collectMessages({
      port,
      initialWindow: anchoredWindow(['a', 'anchor'], 1),
      requestedCount: 3,
      signal: new AbortController().signal,
      onProgress: (count) => progress.push(count),
    });

    expect(result.status).toBe('beginning');
    expect(signatures(result.messages)).toEqual(['a', 'anchor']);
    expect(progress).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it('collects through two upward loads', async () => {
    const port = fakePort({
      windows: [windowOf('b', 'c', 'd'), windowOf('a', 'b', 'c')],
    });
    const progress: number[] = [];
    const result = await collectMessages({
      port,
      initialWindow: anchoredWindow(['c', 'd'], 1),
      requestedCount: 4,
      signal: new AbortController().signal,
      onProgress: (count) => progress.push(count),
    });

    expect(result.status).toBe('complete');
    expect(signatures(result.messages)).toEqual(['a', 'b', 'c', 'd']);
    expect(progress).toEqual([2, 3, 4]);
  });

  it('ignores repeated post-anchor growth for result, progress, and stall', async () => {
    const port = fakePort({
      windows: [
        windowOf('a', 'anchor', 'new-1'),
        windowOf('a', 'anchor', 'new-1', 'new-2'),
        windowOf('a', 'anchor', 'new-1', 'new-2', 'new-3'),
      ],
    });
    const progress: number[] = [];
    const result = await collectMessages({
      port,
      initialWindow: anchoredWindow(['a', 'anchor'], 1),
      requestedCount: 3,
      signal: new AbortController().signal,
      onProgress: (count) => progress.push(count),
    });

    expect(result.status).toBe('stalled');
    expect(signatures(result.messages)).toEqual(['a', 'anchor']);
    expect(progress).toEqual([2, 2, 2, 2, 2, 2]);
    expect(port.scrollOlder).toHaveBeenCalledTimes(5);
  });

  it('resets stall only when a pre-anchor message grows the selectable prefix', async () => {
    const port = fakePort({
      windows: [
        windowOf('a', 'anchor', 'new-1'),
        windowOf('older', 'a', 'anchor', 'new-1'),
        windowOf('older', 'a', 'anchor', 'new-1', 'new-2'),
        windowOf('older', 'a', 'anchor', 'new-1', 'new-2', 'new-3'),
        windowOf('older', 'a', 'anchor', 'new-1', 'new-2', 'new-3', 'new-4'),
      ],
    });
    const progress: number[] = [];
    const result = await collectMessages({
      port,
      initialWindow: anchoredWindow(['a', 'anchor'], 1),
      requestedCount: 4,
      signal: new AbortController().signal,
      onProgress: (count) => progress.push(count),
    });

    expect(result.status).toBe('stalled');
    expect(signatures(result.messages)).toEqual(['older', 'a', 'anchor']);
    expect(progress).toEqual([2, 2, 3, 3, 3, 3, 3, 3]);
    expect(port.scrollOlder).toHaveBeenCalledTimes(7);
  });

  it('returns cancelled when cancellation wins during a mutation wait', async () => {
    const controller = new AbortController();
    const port = fakePort({
      scrollOlder: (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    });
    const resultPromise = collectMessages({
      port,
      initialWindow: anchoredWindow(['a', 'anchor'], 1),
      requestedCount: 3,
      signal: controller.signal,
      onProgress: vi.fn(),
    });

    controller.abort();

    await expect(resultPromise).resolves.toMatchObject({
      status: 'cancelled',
      messages: [expect.objectContaining({ signature: 'a' }), expect.objectContaining({ signature: 'anchor' })],
    });
  });

  it('stalls after five consecutive windows without prefix growth', async () => {
    const port = fakePort({
      windows: [windowOf('a', 'b'), windowOf('a', 'b'), windowOf('a', 'b')],
      scrollResults: ['mutated', 'timed-out', 'mutated'],
    });
    const result = await collect(port, anchoredWindow(['a', 'b'], 1), 3);

    expect(result.status).toBe('stalled');
    expect(port.scrollOlder).toHaveBeenCalledTimes(5);
  });

  it('requires the full stall budget before accepting visual top as the beginning', async () => {
    const port = fakePort({
      windows: [windowOf('a', 'b'), windowOf('a', 'b'), windowOf('a', 'b')],
      visualTop: true,
    });
    const result = await collect(port, anchoredWindow(['a', 'b'], 1), 3);

    expect(result.status).toBe('beginning');
    expect(port.scrollOlder).toHaveBeenCalledTimes(5);
  });

  it('treats a DOM mutation without normalized growth as no progress', async () => {
    const port = fakePort({
      windows: [windowOf('a', 'b'), windowOf('a', 'b'), windowOf('a', 'b')],
      scrollResults: ['mutated', 'mutated', 'mutated'],
    });
    const result = await collect(port, anchoredWindow(['a', 'b'], 1), 3);

    expect(result.status).toBe('stalled');
  });

  it('accepts a delayed older page after four unchanged anchored windows', async () => {
    const unchanged = windowOf('a', 'anchor');
    const port = fakePort({
      windows: [
        unchanged,
        unchanged,
        unchanged,
        unchanged,
        windowOf('older', 'a', 'anchor'),
      ],
      visualTop: true,
    });
    const result = await collect(
      port,
      anchoredWindow(['a', 'anchor'], 1),
      3,
    );

    expect(result.status).toBe('complete');
    expect(signatures(result.messages)).toEqual(['older', 'a', 'anchor']);
  });

  it('never restores and returns available messages intact for the orchestrator', async () => {
    const port = fakePort({ windows: [windowOf('a', 'anchor')], visualTop: true });
    const result = await collect(
      port,
      anchoredWindow(['a', 'anchor'], 1),
      5,
    );

    expect(signatures(result.messages)).toEqual(['a', 'anchor']);
    expect(port.restoreAnchor).not.toHaveBeenCalled();
  });
});

function fakePort(options: {
  windows?: ParsedWindow[];
  scrollResults?: Array<'mutated' | 'timed-out'>;
  visualTop?: boolean;
  scrollOlder?: CollectionPort['scrollOlder'];
} = {}): CollectionPort & {
  readWindow: ReturnType<typeof vi.fn<CollectionPort['readWindow']>>;
  scrollOlder: ReturnType<typeof vi.fn<CollectionPort['scrollOlder']>>;
  restoreAnchor: ReturnType<typeof vi.fn<CollectionPort['restoreAnchor']>>;
} {
  const windows = [...(options.windows ?? [])];
  const scrollResults = [...(options.scrollResults ?? [])];
  return {
    readWindow: vi.fn(() => windows.shift() ?? windowOf()),
    scrollOlder: vi.fn(
      options.scrollOlder ??
        (async () => scrollResults.shift() ?? 'timed-out'),
    ),
    isAtVisualTop: vi.fn(() => options.visualTop ?? false),
    restoreAnchor: vi.fn(async () => true),
  };
}

function collect(
  port: CollectionPort,
  initialWindow: ParsedWindow,
  requestedCount: number,
) {
  return collectMessages({
    port,
    initialWindow,
    requestedCount,
    signal: new AbortController().signal,
    onProgress: vi.fn(),
  });
}

function anchoredWindow(signatures: string[], anchorIndex: number): ParsedWindow {
  return { messages: signatures.map(message), anchorIndex };
}

function windowOf(...signatures: string[]): ParsedWindow {
  return { messages: signatures.map(message) };
}

function message(signature: string): NormalizedMessage {
  return {
    signature,
    sender: 'You',
    content: { type: 'text', text: signature },
  };
}

function signatures(messages: readonly { signature: string }[]): string[] {
  return messages.map(({ signature }) => signature);
}

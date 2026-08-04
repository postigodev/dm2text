import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipboardError } from './clipboard';
import type { CollectionPort, CollectionResult } from './collection/port';
import { collectMessages } from './collection/session';
import type { CopyContextRequest } from './instagram/menu-integration';
import {
  createCopyContextRequestHandler,
  type OrchestratorDependencies,
  runCopySession,
} from './orchestrator';
import { buildAnchorSnapshot } from './transcript/merge';
import type {
  AnchorSnapshot,
  NormalizedMessage,
  ParsedWindow,
  TranscriptMessage,
} from './transcript/types';
import type { CopySessionDialog } from './ui/copy-dialog';

describe('orchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('acquires one synchronous guard and releases it after resolve and reject', async () => {
    const deps = dependencies();
    const first = deferred<void>();
    const runner = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockRejectedValueOnce(new Error('runner failure'))
      .mockResolvedValue(undefined);
    const handler = createCopyContextRequestHandler(deps, runner);

    const active = handler(request());
    const rejectedWhileActive = handler(request());
    expect(runner).toHaveBeenCalledTimes(1);
    expect(deps.showToast).toHaveBeenCalledWith(
      'A copy session is already running.',
      'warning',
    );

    first.resolve();
    await active;
    await rejectedWhileActive;
    await expect(handler(request())).rejects.toThrow('runner failure');
    await expect(handler(request())).resolves.toBeUndefined();
    expect(runner).toHaveBeenCalledTimes(3);
  });

  it('does not parse until the sole guard has accepted the request', async () => {
    const count = deferred<number | null>();
    const dialog = fakeDialog({ requestCount: () => count.promise });
    const deps = dependencies({ createDialog: vi.fn(() => dialog) });
    const handler = createCopyContextRequestHandler(deps);

    const first = handler(request());
    const second = handler(request());

    expect(deps.parseMountedWindow).toHaveBeenCalledTimes(1);
    count.resolve(null);
    await Promise.all([first, second]);
  });

  it('anchors the exact second occurrence among three identical messages', async () => {
    const identical = message('same');
    const initialWindow: ParsedWindow = {
      messages: [identical, identical, identical],
      anchorIndex: 1,
    };
    const restoreAnchor = vi.fn().mockResolvedValue(true);
    let formattedKeys: string[] = [];
    const formatted = vi.fn((messages: readonly TranscriptMessage[]) => {
      formattedKeys = messages.map(({ key }) => key);
      return 'formatted';
    });
    const deps = dependencies({
      parseMountedWindow: vi.fn(() => initialWindow),
      buildAnchorSnapshot: vi.fn((window) => {
        const snapshot = buildAnchorSnapshot(window);
        if (!snapshot) throw new Error('missing snapshot');
        return snapshot;
      }),
      createDialog: vi.fn(() => fakeDialog({ requestCount: async () => 1 })),
      createCollectionPort: vi.fn(() => port({ restoreAnchor })),
      collectMessages,
      formatTranscript: formatted,
    });

    await runCopySession(request(), deps);

    expect(formattedKeys).toEqual(['m1']);
    expect(restoreAnchor.mock.calls[0]?.[0]).toMatchObject({
      signature: 'same',
      occurrenceInWindow: 1,
    });
  });

  it('copies nothing for a missing exact anchor, closes the menu, and releases the guard', async () => {
    const closeInstagramMenu = vi.fn();
    const copyText = vi.fn();
    const deps = dependencies({
      closeInstagramMenu,
      copyText,
      parseMountedWindow: vi.fn(() => ({ messages: [message('one')] })),
    });
    const handler = createCopyContextRequestHandler(deps);

    await handler(request());
    await handler(request());

    expect(copyText).not.toHaveBeenCalled();
    expect(closeInstagramMenu).toHaveBeenCalled();
    expect(deps.parseMountedWindow).toHaveBeenCalledTimes(2);
  });

  it('rejects an out-of-range anchor index as an exact-anchor failure', async () => {
    const deps = dependencies({
      parseMountedWindow: vi.fn(() => ({
        messages: [message('one')],
        anchorIndex: 2,
      })),
    });

    await runCopySession(request(), deps);

    expect(deps.copyText).not.toHaveBeenCalled();
    expect(deps.showToast).toHaveBeenCalledWith(
      'Instagram changed this conversation layout; no messages were copied.',
      'error',
    );
  });

  it('skips restoration after failure before port creation and closes owned UI', async () => {
    const dialog = fakeDialog({ requestCount: async () => 2 });
    const deps = dependencies({
      createDialog: vi.fn(() => dialog),
      createCollectionPort: vi.fn(() => {
        throw new Error('port discovery failed');
      }),
    });

    await runCopySession(request(), deps);

    expect(dialog.close).toHaveBeenCalled();
    expect(deps.showToast).toHaveBeenCalledWith(
      'Copy failed; no conversation data was saved.',
      'error',
    );
  });

  it('aborts a cooperative restoration at exactly three seconds', async () => {
    let restoreSignal: AbortSignal | undefined;
    const restoreAnchor = vi.fn(
      (_snapshot: AnchorSnapshot, signal: AbortSignal) =>
        new Promise<boolean>((_resolve, reject) => {
          restoreSignal = signal;
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const run = runCopySession(
      request(),
      dependencies({ createCollectionPort: vi.fn(() => port({ restoreAnchor })) }),
    );
    await vi.advanceTimersByTimeAsync(2_999);
    expect(restoreSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await run;

    expect(restoreSignal?.aborted).toBe(true);
  });

  it('settles after three seconds when restoration ignores abort', async () => {
    const never = new Promise<boolean>(() => undefined);
    const deps = dependencies({
      createCollectionPort: vi.fn(() =>
        port({ restoreAnchor: vi.fn(() => never) }),
      ),
    });
    let settled = false;
    const run = runCopySession(request(), deps).then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(2_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await run;
    expect(settled).toBe(true);
  });

  it.each([
    ['false result', vi.fn().mockResolvedValue(false)],
    ['rejection', vi.fn().mockRejectedValue(new Error('restore failed'))],
  ])('warns for restoration %s and clears its timer', async (_label, restoreAnchor) => {
    const clearTimeout = vi.fn(window.clearTimeout.bind(window));
    const deps = dependencies({
      clearTimeout,
      createCollectionPort: vi.fn(() => port({ restoreAnchor })),
    });

    await runCopySession(request(), deps);

    expect(deps.showToast).toHaveBeenCalledWith(
      'The selected message could not be restored.',
      'warning',
    );
    expect(clearTimeout).toHaveBeenCalledTimes(1);
  });

  it('clears the restoration timer after success', async () => {
    const clearTimeout = vi.fn(window.clearTimeout.bind(window));
    await runCopySession(
      request(),
      dependencies({
        clearTimeout,
        createCollectionPort: vi.fn(() => port()),
      }),
    );
    expect(clearTimeout).toHaveBeenCalledTimes(1);
  });

  it('attempts restoration and clears message references after clipboard failure', async () => {
    const messages = transcriptMessages();
    const restoreAnchor = vi.fn().mockResolvedValue(true);
    const deps = dependencies({
      collectMessages: vi.fn(async () => complete(messages)),
      copyText: vi.fn().mockRejectedValue(new ClipboardError()),
      createCollectionPort: vi.fn(() => port({ restoreAnchor })),
    });

    await runCopySession(request(), deps);

    expect(restoreAnchor).toHaveBeenCalled();
    expect(messages).toHaveLength(0);
    expect(deps.showToast).toHaveBeenCalledWith(
      'Clipboard access failed; no conversation data was saved.',
      'error',
    );
  });

  it('waits for explicit partial confirmation before copying', async () => {
    const confirmation = deferred<boolean>();
    const copyText = vi.fn().mockResolvedValue(undefined);
    const dialog = fakeDialog({
      requestCount: async () => 3,
      confirmPartial: () => confirmation.promise,
    });
    const deps = dependencies({
      createDialog: vi.fn(() => dialog),
      collectMessages: vi.fn(async (): Promise<CollectionResult> => ({
        status: 'beginning',
        messages: [transcriptMessage('one', 'm0')],
      })),
      copyText,
    });
    const run = runCopySession(request(), deps);
    await Promise.resolve();
    await Promise.resolve();
    expect(copyText).not.toHaveBeenCalled();

    confirmation.resolve(true);
    await run;

    expect(copyText).toHaveBeenCalledTimes(1);
  });

  it('forwards only collection progress to the persistent dialog', async () => {
    const dialog = fakeDialog();
    const deps = dependencies({
      createDialog: vi.fn(() => dialog),
      collectMessages: vi.fn(async (options) => {
        options.onProgress(1);
        options.onProgress(2);
        return complete(transcriptMessages());
      }),
    });

    await runCopySession(request(), deps);

    expect(dialog.updateProgress).toHaveBeenNthCalledWith(1, 1, 2);
    expect(dialog.updateProgress).toHaveBeenNthCalledWith(2, 2, 2);
  });

  it('aborts on dialog cancellation, closes UI, releases the guard, and allows retry', async () => {
    const firstDialog = fakeDialog({ requestCount: async () => null });
    const secondDialog = fakeDialog();
    const deps = dependencies({
      createDialog: vi
        .fn()
        .mockReturnValueOnce(firstDialog)
        .mockReturnValueOnce(secondDialog),
    });
    const handler = createCopyContextRequestHandler(deps);

    await handler(request());
    await handler(request());

    expect(firstDialog.close).toHaveBeenCalled();
    expect(deps.copyText).toHaveBeenCalledTimes(1);
  });

  it('aborts on SPA exit, closes UI, releases the guard, and allows retry', async () => {
    let exit: (() => void) | undefined;
    let invocation = 0;
    const firstDialog = fakeDialog();
    const deps = dependencies({
      createDialog: vi.fn(() => firstDialog),
      watchDirectRouteExit: vi.fn((_signal, onExit) => {
        exit = onExit;
        return vi.fn();
      }),
      collectMessages: vi.fn(async ({ signal }) => {
        invocation += 1;
        if (invocation > 1) return complete(transcriptMessages());
        return new Promise<CollectionResult>((resolve) => {
          signal.addEventListener(
            'abort',
            () => resolve({ status: 'cancelled', messages: [] }),
            { once: true },
          );
        });
      }),
    });
    const handler = createCopyContextRequestHandler(deps);
    const first = handler(request());
    await Promise.resolve();
    await Promise.resolve();
    exit?.();
    await first;
    await handler(request());

    expect(firstDialog.close).toHaveBeenCalled();
    expect(deps.copyText).toHaveBeenCalledTimes(1);
  });

  const failureCases: Array<
    [string, Partial<OrchestratorDependencies>, string]
  > = [
    [
      'layout',
      { findMessageScroller: vi.fn(() => null) },
      'Instagram changed this conversation layout; no messages were copied.',
    ],
    [
      'anchor',
      { parseMountedWindow: vi.fn(() => ({ messages: [message('one')] })) },
      'Instagram changed this conversation layout; no messages were copied.',
    ],
    [
      'empty',
      {
        collectMessages: vi.fn(async (): Promise<CollectionResult> => ({
          status: 'stalled',
          messages: [],
        })),
      },
      'No messages could be collected.',
    ],
    [
      'cancel',
      { createDialog: vi.fn(() => fakeDialog({ requestCount: async () => null })) },
      'Copy cancelled.',
    ],
    [
      'unknown',
      { formatTranscript: vi.fn(() => { throw new Error('private transcript'); }) },
      'Copy failed; no conversation data was saved.',
    ],
  ];

  it.each(failureCases)('maps %s failures to content-free feedback', async (_label, overrides, expected) => {
    const deps = dependencies(overrides);
    await runCopySession(request(), deps);
    expect(deps.showToast).toHaveBeenCalledWith(expected, 'error');
    expect(JSON.stringify(vi.mocked(deps.showToast).mock.calls)).not.toContain(
      'private transcript',
    );
  });

  it('does not let cleanup failures replace the original session failure', async () => {
    const showToast = vi.fn();
    const deps = dependencies({
      findMessageScroller: vi.fn(() => null),
      closeInstagramMenu: vi.fn(() => {
        throw new Error('cleanup failed');
      }),
      watchDirectRouteExit: vi.fn(() => () => {
        throw new Error('teardown failed');
      }),
      showToast,
    });

    await expect(runCopySession(request(), deps)).resolves.toBeUndefined();
    expect(showToast).toHaveBeenCalledWith(
      'Instagram changed this conversation layout; no messages were copied.',
      'error',
    );
  });
});

function dependencies(
  overrides: Partial<OrchestratorDependencies> = {},
): OrchestratorDependencies {
  const scroller = document.createElement('div');
  const initialWindow: ParsedWindow = {
    messages: [message('one'), message('two')],
    anchorIndex: 1,
  };
  const defaults: OrchestratorDependencies = {
    document,
    createDialog: vi.fn(() => fakeDialog()),
    findMessageScroller: vi.fn(() => scroller),
    parseMountedWindow: vi.fn(() => initialWindow),
    buildAnchorSnapshot: vi.fn(() => snapshot()),
    closeInstagramMenu: vi.fn(),
    createCollectionPort: vi.fn(() => port()),
    collectMessages: vi.fn(async () => complete(transcriptMessages())),
    formatTranscript: vi.fn(() => 'formatted transcript'),
    copyText: vi.fn().mockResolvedValue(undefined),
    showToast: vi.fn(),
    watchDirectRouteExit: vi.fn(() => vi.fn()),
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
  };
  return Object.assign(defaults, overrides);
}

function fakeDialog(
  overrides: Partial<CopySessionDialog> = {},
): CopySessionDialog {
  const controller = new AbortController();
  const defaults: CopySessionDialog = {
    signal: controller.signal,
    requestCount: vi.fn(async () => 2),
    updateProgress: vi.fn(),
    confirmPartial: vi.fn(async () => true),
    close: vi.fn(() => controller.abort()),
  };
  return Object.assign(defaults, overrides);
}

function port(overrides: Partial<CollectionPort> = {}): CollectionPort {
  const defaults: CollectionPort = {
    readWindow: () => ({ messages: [] }),
    scrollOlder: async () => 'timed-out',
    isAtVisualTop: () => true,
    restoreAnchor: vi.fn().mockResolvedValue(true),
  };
  return Object.assign(defaults, overrides);
}

function request(): CopyContextRequest {
  return {
    anchorRoot: document.createElement('div'),
    menuTrigger: document.createElement('button'),
  };
}

function message(signature: string): NormalizedMessage {
  return {
    signature,
    sender: 'Person',
    content: { type: 'text', text: signature },
  };
}

function transcriptMessage(signature: string, key: string): TranscriptMessage {
  return { ...message(signature), key };
}

function transcriptMessages(): TranscriptMessage[] {
  return [transcriptMessage('one', 'm0'), transcriptMessage('two', 'm1')];
}

function complete(messages: TranscriptMessage[]): CollectionResult {
  return { status: 'complete', messages };
}

function snapshot(): AnchorSnapshot {
  return { signature: 'two', occurrenceInWindow: 0 };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

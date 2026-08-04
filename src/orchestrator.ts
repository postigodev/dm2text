import { ClipboardError, type copyText } from './clipboard';
import type { CollectionPort } from './collection/port';
import { collectMessages } from './collection/session';
import type { CopyContextRequest } from './instagram/menu-integration';
import type { formatTranscript } from './transcript/format';
import type {
  AnchorSnapshot,
  ParsedWindow,
  TranscriptMessage,
} from './transcript/types';
import type { CopySessionDialog } from './ui/copy-dialog';

const RESTORE_TIMEOUT_MS = 3_000;

export type ToastKind = 'success' | 'warning' | 'error';

export interface OrchestratorDependencies {
  readonly document: Document;
  readonly createDialog: () => CopySessionDialog;
  readonly findMessageScroller: (root: ParentNode) => HTMLElement | null;
  readonly parseMountedWindow: (
    scroller: HTMLElement,
    anchorRoot: HTMLElement,
  ) => ParsedWindow;
  readonly buildAnchorSnapshot: (window: ParsedWindow) => AnchorSnapshot;
  readonly closeInstagramMenu: (trigger: HTMLElement) => void;
  readonly createCollectionPort: (options: {
    scroller: HTMLElement;
    anchorRoot: HTMLElement;
    startingScrollTop: number;
  }) => CollectionPort;
  readonly collectMessages: typeof collectMessages;
  readonly formatTranscript: typeof formatTranscript;
  readonly copyText: typeof copyText;
  readonly showToast: (message: string, kind: ToastKind) => void;
  readonly watchDirectRouteExit: (
    signal: AbortSignal,
    onExit: () => void,
  ) => () => void;
  readonly setTimeout: typeof window.setTimeout;
  readonly clearTimeout: typeof window.clearTimeout;
}

type SessionRunner = (
  request: CopyContextRequest,
  deps: OrchestratorDependencies,
) => Promise<void>;

export function createCopyContextRequestHandler(
  deps: OrchestratorDependencies,
  runSession: SessionRunner = runCopySession,
): (request: CopyContextRequest) => Promise<void> {
  let activeSession = false;

  return async (request) => {
    if (activeSession) {
      safely(() => deps.closeInstagramMenu(request.menuTrigger));
      safely(() =>
        deps.showToast('A copy session is already running.', 'warning'),
      );
      return;
    }

    activeSession = true;
    try {
      await runSession(request, deps);
    } finally {
      activeSession = false;
    }
  };
}

export async function runCopySession(
  { anchorRoot, menuTrigger }: CopyContextRequest,
  deps: OrchestratorDependencies,
): Promise<void> {
  let messages: TranscriptMessage[] = [];
  let transcript = '';
  let port: CollectionPort | null = null;
  let anchorSnapshot: AnchorSnapshot | null = null;
  let dialog: CopySessionDialog | null = null;
  let stopRouteWatch: () => void = () => undefined;
  let abortReason: 'user' | 'left-direct' | null = null;
  const sessionController = new AbortController();

  try {
    stopRouteWatch = deps.watchDirectRouteExit(
      sessionController.signal,
      () => {
        abortReason = 'left-direct';
        sessionController.abort(
          new DOMException('Left Direct', 'AbortError'),
        );
        safely(() => dialog?.close());
      },
    );

    sessionController.signal.throwIfAborted();
    const scroller = deps.findMessageScroller(deps.document);
    if (!scroller) throw new CopySessionFailure('layout-changed');

    sessionController.signal.throwIfAborted();
    const initialWindow = deps.parseMountedWindow(scroller, anchorRoot);
    if (!hasExactAnchor(initialWindow)) {
      throw new CopySessionFailure('exact-anchor-missing');
    }
    anchorSnapshot = deps.buildAnchorSnapshot(initialWindow);
    safely(() => deps.closeInstagramMenu(menuTrigger));

    sessionController.signal.throwIfAborted();
    dialog = deps.createDialog();
    const cancelFromDialog = (): void => {
      if (abortReason === null) abortReason = 'user';
      sessionController.abort(
        new DOMException('User cancelled', 'AbortError'),
      );
    };
    dialog.signal.addEventListener('abort', cancelFromDialog, { once: true });

    const requestedCount = await dialog.requestCount();
    if (requestedCount === null) throw new CopySessionFailure('cancelled');
    sessionController.signal.throwIfAborted();

    port = deps.createCollectionPort({
      scroller,
      anchorRoot,
      startingScrollTop: scroller.scrollTop,
    });
    const result = await deps.collectMessages({
      port,
      initialWindow,
      requestedCount,
      signal: sessionController.signal,
      onProgress: (collected) =>
        dialog?.updateProgress(collected, requestedCount),
    });
    messages = result.messages;

    if (result.status === 'cancelled') {
      throw new CopySessionFailure(
        abortReason === 'left-direct' ? 'left-direct' : 'cancelled',
      );
    }
    if (messages.length === 0) throw new CopySessionFailure('no-messages');
    if (messages.length < requestedCount) {
      const partialReason =
        result.status === 'beginning' || result.status === 'stalled'
          ? result.status
          : null;
      if (!partialReason) {
        throw new CopySessionFailure('invalid-partial-result');
      }
      const approved = await dialog.confirmPartial(
        messages.length,
        requestedCount,
        partialReason,
      );
      if (!approved) throw new CopySessionFailure('cancelled');
    }

    sessionController.signal.throwIfAborted();
    transcript = deps.formatTranscript(messages);
    sessionController.signal.throwIfAborted();
    await deps.copyText(transcript);
    sessionController.signal.throwIfAborted();
    deps.showToast(`Copied ${messages.length} messages.`, 'success');
  } catch (error) {
    const message = failureMessage(
      abortReason === 'left-direct'
        ? new CopySessionFailure('left-direct')
        : abortReason === 'user'
          ? new CopySessionFailure('cancelled')
          : error,
    );
    if (message) safely(() => deps.showToast(message, 'error'));
  } finally {
    sessionController.abort();
    safely(stopRouteWatch);
    safely(() => deps.closeInstagramMenu(menuTrigger));
    safely(() => dialog?.close());
    if (port && anchorSnapshot) {
      await restoreWithTimeout(port, anchorSnapshot, deps);
    }
    messages.length = 0;
    transcript = '';
  }
}

async function restoreWithTimeout(
  activePort: CollectionPort,
  snapshot: AnchorSnapshot,
  deps: OrchestratorDependencies,
): Promise<void> {
  const restoreController = new AbortController();
  let restoreTimeout: number | undefined;
  const timeoutResult = new Promise<boolean>((resolve) => {
    restoreTimeout = deps.setTimeout(() => {
      restoreController.abort(
        new DOMException('Restore timed out', 'AbortError'),
      );
      resolve(false);
    }, RESTORE_TIMEOUT_MS);
  });

  try {
    const restored = await Promise.race([
      activePort.restoreAnchor(snapshot, restoreController.signal),
      timeoutResult,
    ]);
    if (!restored) {
      safely(() =>
        deps.showToast(
          'The selected message could not be restored.',
          'warning',
        ),
      );
    }
  } catch {
    safely(() =>
      deps.showToast(
        'The selected message could not be restored.',
        'warning',
      ),
    );
  } finally {
    restoreController.abort();
    if (restoreTimeout !== undefined) {
      safely(() => deps.clearTimeout(restoreTimeout));
    }
  }
}

type CopyFailureCode =
  | 'layout-changed'
  | 'exact-anchor-missing'
  | 'no-messages'
  | 'invalid-partial-result'
  | 'cancelled'
  | 'left-direct';

class CopySessionFailure extends Error {
  constructor(readonly code: CopyFailureCode) {
    super(code);
  }
}

function failureMessage(error: unknown): string | null {
  if (error instanceof CopySessionFailure) {
    if (error.code === 'left-direct') return null;
    if (error.code === 'cancelled') return 'Copy cancelled.';
    if (error.code === 'no-messages') {
      return 'No messages could be collected.';
    }
    if (
      error.code === 'layout-changed' ||
      error.code === 'exact-anchor-missing'
    ) {
      return 'Instagram changed this conversation layout; no messages were copied.';
    }
  }
  if (error instanceof ClipboardError) {
    return 'Clipboard access failed; no conversation data was saved.';
  }
  return 'Copy failed; no conversation data was saved.';
}

function hasExactAnchor(
  parsedWindow: ParsedWindow,
): parsedWindow is ParsedWindow & { anchorIndex: number } {
  const { anchorIndex } = parsedWindow;
  return (
    anchorIndex !== undefined &&
    Number.isInteger(anchorIndex) &&
    anchorIndex >= 0 &&
    anchorIndex < parsedWindow.messages.length
  );
}

function safely(action: () => void): void {
  try {
    action();
  } catch {
    // Cleanup and feedback are best-effort and must not leak session data.
  }
}

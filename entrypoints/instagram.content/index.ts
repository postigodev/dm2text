import './style.css';
import { copyText } from '../../src/clipboard';
import { collectMessages } from '../../src/collection/session';
import { findMessageScroller } from '../../src/instagram/discovery';
import { installMenuIntegration } from '../../src/instagram/menu-integration';
import { watchDirectRouteExit } from '../../src/instagram/navigation';
import { parseMountedWindow } from '../../src/instagram/parse-window';
import { createInstagramCollectionPort } from '../../src/instagram/scroll';
import { createCopyContextRequestHandler } from '../../src/orchestrator';
import { formatTranscript } from '../../src/transcript/format';
import { buildAnchorSnapshot } from '../../src/transcript/merge';
import type { AnchorSnapshot } from '../../src/transcript/types';
import { createCopySessionDialog } from '../../src/ui/copy-dialog';
import { showToast } from '../../src/ui/toast';

export default defineContentScript({
  matches: ['https://www.instagram.com/*'],
  main() {
    const handleRequest = createCopyContextRequestHandler({
      document,
      createDialog: createCopySessionDialog,
      findMessageScroller,
      parseMountedWindow,
      buildAnchorSnapshot: requireAnchorSnapshot,
      closeInstagramMenu,
      createCollectionPort: createInstagramCollectionPort,
      collectMessages,
      formatTranscript,
      copyText,
      showToast,
      watchDirectRouteExit,
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
    });
    const teardown = installMenuIntegration({
      onCopyContextRequested(request) {
        if (!location.pathname.startsWith('/direct/')) return;
        void handleRequest(request);
      },
    });

    window.addEventListener('pagehide', teardown, { once: true });
  },
});

function requireAnchorSnapshot(
  parsedWindow: Parameters<typeof buildAnchorSnapshot>[0],
): AnchorSnapshot {
  const snapshot = buildAnchorSnapshot(parsedWindow);
  if (!snapshot) throw new Error('Exact anchor snapshot unavailable');
  return snapshot;
}

function closeInstagramMenu(trigger: HTMLElement): void {
  try {
    const expanded = trigger.getAttribute('aria-expanded');
    if (expanded === 'false') return;
    if (expanded === 'true') {
      trigger.click();
      return;
    }

    trigger.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
  } catch {
    // Instagram menu cleanup is best-effort.
  }
}

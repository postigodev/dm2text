import { findMessageRoot, findMessageScroller } from './discovery';

const CUSTOM_ACTION_ATTRIBUTE = 'data-dm2text-action';
const DIALOG_SELECTOR = '[role="dialog"]';
const MENU_CONTROL_SELECTOR = 'button, [role="button"]';
const OBSERVER_TIMEOUT_MS = 2_000;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export interface CopyContextRequest {
  anchorRoot: HTMLElement;
  menuTrigger: HTMLElement;
}

export interface MenuIntegrationOptions {
  onCopyContextRequested(request: CopyContextRequest): void;
}

export function installMenuIntegration({
  onCopyContextRequested,
}: MenuIntegrationOptions): () => void {
  let observer: MutationObserver | null = null;
  let observerTimeout: number | null = null;
  let tornDown = false;
  const injectedActions = new Set<HTMLElement>();

  const stopObservation = (): void => {
    observer?.disconnect();
    observer = null;

    if (observerTimeout !== null) {
      window.clearTimeout(observerTimeout);
      observerTimeout = null;
    }
  };

  const removeInjectedActions = (): void => {
    for (const action of injectedActions) action.remove();
    injectedActions.clear();
  };

  const onNavigation = (): void => {
    if (location.pathname.startsWith('/direct/')) return;
    stopObservation();
    removeInjectedActions();
  };

  const onDocumentClick = (event: MouseEvent): void => {
    if (!location.pathname.startsWith('/direct/')) {
      stopObservation();
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(`[${CUSTOM_ACTION_ATTRIBUTE}]`)) return;

    const menuTrigger = target.closest<HTMLElement>(MENU_CONTROL_SELECTOR);
    if (!menuTrigger) return;

    const scroller = findMessageScroller(document);
    if (!scroller?.contains(menuTrigger)) return;

    const anchorRoot = findMessageRoot(menuTrigger);
    if (!anchorRoot) return;

    stopObservation();
    const dialogsBeforeClick = new Set(
      document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR),
    );

    observer = new MutationObserver(() => {
      const dialogs = Array.from(
        document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR),
      );
      const newDialogs = dialogs.filter(
        (dialog) => !dialogsBeforeClick.has(dialog),
      );
      const reusedDialogs = dialogs
        .filter((dialog) => dialogsBeforeClick.has(dialog))
        .reverse();

      for (const dialog of [...newDialogs, ...reusedDialogs]) {
        const injected = injectAction(
          dialog,
          { anchorRoot, menuTrigger },
          onCopyContextRequested,
          injectedActions,
        );
        if (!injected) continue;

        stopObservation();
        return;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observerTimeout = window.setTimeout(
      stopObservation,
      OBSERVER_TIMEOUT_MS,
    );
  };

  document.addEventListener('click', onDocumentClick, true);
  window.addEventListener('popstate', onNavigation);

  return () => {
    if (tornDown) return;
    tornDown = true;
    stopObservation();
    removeInjectedActions();
    document.removeEventListener('click', onDocumentClick, true);
    window.removeEventListener('popstate', onNavigation);
  };
}

function injectAction(
  dialog: HTMLElement,
  request: CopyContextRequest,
  onCopyContextRequested: (request: CopyContextRequest) => void,
  injectedActions: Set<HTMLElement>,
): boolean {
  const existing = dialog.querySelector<HTMLElement>(
    `[${CUSTOM_ACTION_ATTRIBUTE}]`,
  );
  if (existing) {
    injectedActions.add(existing);
    return true;
  }

  const nativeAction = Array.from(
    dialog.querySelectorAll<HTMLElement>(MENU_CONTROL_SELECTOR),
  ).find((action) => !action.hasAttribute(CUSTOM_ACTION_ATTRIBUTE));
  if (!nativeAction?.parentElement) return false;

  const customAction = nativeAction.cloneNode(true);
  if (!(customAction instanceof HTMLElement)) return false;

  customAction.setAttribute(CUSTOM_ACTION_ATTRIBUTE, '');
  if (!decorateCustomAction(customAction)) return false;
  let emitted = false;
  customAction.addEventListener('click', () => {
    if (emitted) return;
    emitted = true;
    onCopyContextRequested(request);
  });
  nativeAction.parentElement.append(customAction);
  injectedActions.add(customAction);
  return true;
}

function decorateCustomAction(action: HTMLElement): boolean {
  const labelNode = findFirstTextNode(action);
  if (!labelNode) return false;

  labelNode.textContent = 'Copy context';
  const icon =
    action.querySelector<SVGSVGElement>('svg') ??
    document.createElementNS(SVG_NAMESPACE, 'svg');
  if (!icon.parentElement) action.append(icon);
  icon.setAttribute('data-dm2text-icon', '');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('width', '20');
  icon.setAttribute('height', '20');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');

  const page = document.createElementNS(SVG_NAMESPACE, 'rect');
  page.setAttribute('x', '8');
  page.setAttribute('y', '7');
  page.setAttribute('width', '10');
  page.setAttribute('height', '12');
  page.setAttribute('rx', '2');
  const context = document.createElementNS(SVG_NAMESPACE, 'path');
  context.setAttribute(
    'd',
    'M6 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1',
  );
  icon.replaceChildren(page, context);
  return true;
}

function findFirstTextNode(root: HTMLElement): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let candidate = walker.nextNode();

  while (candidate) {
    if (candidate.textContent?.trim()) return candidate as Text;
    candidate = walker.nextNode();
  }

  return null;
}

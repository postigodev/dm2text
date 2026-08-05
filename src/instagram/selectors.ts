export const MESSAGE_ROOT_SELECTOR = [
  '[role="row"][aria-label="Message"]',
  '[role="row"][aria-label="Sent by you"]',
].join(', ');

export const DATE_SEPARATOR_SELECTOR = '[role="separator"]';
export const MESSAGE_ACTIONS_SELECTOR = '[aria-label="Message actions"]';
export const LEAF_ACTION_SELECTOR = 'button, [role="button"]';
export const OUTGOING_MESSAGE_SELECTOR = '[aria-label="Sent by you"]';
export const SENDER_SELECTOR = '[aria-label="Sender"]';
export const PROFILE_LINK_SELECTOR = [
  'a[aria-label^="Profile of "]',
  'a[aria-label^="Open the profile page of "]',
].join(', ');
export const REPLY_SELECTOR = '[aria-label="Reply preview"]';
export const REPLY_SENDER_SELECTOR = '[aria-label="Replied-to sender"]';
export const AI_RESPONSE_SELECTOR = '[role="presentation"]';
export const SHARED_POST_PERMALINK_SELECTOR = [
  'a[href*="/p/"]',
  'a[href*="/reel/"]',
].join(', ');
export const SHARED_POST_PREVIEW_SELECTOR = '[role="button"]';
export const SHARED_POST_SOURCE_LINK_SELECTOR = 'a[role="link"][href]';
export const EMBEDDED_CONTENT_SELECTOR = [
  REPLY_SELECTOR,
  '[data-shared-post-card]',
].join(', ');
export const TEXT_CONTENT_SELECTOR = ':scope > [dir="auto"]';
export const TIME_SELECTOR = ':scope > time';
export const MEDIA_SELECTOR = [
  ':scope > [data-media-kind]',
  ':scope > img[alt]',
  ':scope > video',
  ':scope > audio',
].join(', ');

export function queryMessageRoots(root: ParentNode): HTMLElement[] {
  const semanticRoots = Array.from(
    root.querySelectorAll<HTMLElement>(MESSAGE_ROOT_SELECTOR),
  );
  if (semanticRoots.length > 0) return semanticRoots;

  const containers = [
    ...(root instanceof HTMLElement ? [root] : []),
    ...root.querySelectorAll<HTMLElement>('div'),
  ];
  let bestRoots: HTMLElement[] = [];
  let bestChildCount = 0;

  for (const container of containers) {
    const children = Array.from(container.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );
    if (children.length < 5) continue;

    const roots = children.filter(isStructuralMessageRoot);
    if (
      roots.length > bestRoots.length ||
      (roots.length === bestRoots.length && children.length > bestChildCount)
    ) {
      bestRoots = roots;
      bestChildCount = children.length;
    }
  }

  return bestRoots;
}

export function findStructuralActionBar(
  actionButton: Element,
): HTMLElement | null {
  const labelledBar = actionButton.closest<HTMLElement>(MESSAGE_ACTIONS_SELECTOR);
  if (labelledBar && isFinalAction(labelledBar, actionButton)) return labelledBar;

  let candidate = actionButton.parentElement;
  for (let depth = 0; candidate && depth < 5; depth += 1) {
    const controls = leafActions(candidate);
    if (controls.length === 3 && controls.at(-1) === actionButton) {
      return candidate;
    }
    candidate = candidate.parentElement;
  }

  return null;
}

function isFinalAction(bar: HTMLElement, actionButton: Element): boolean {
  const controls = leafActions(bar);
  return controls.length === 3 && controls.at(-1) === actionButton;
}

function leafActions(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll(LEAF_ACTION_SELECTOR)).filter(
    (control) => !control.querySelector(LEAF_ACTION_SELECTOR),
  );
}

function isStructuralMessageRoot(candidate: HTMLElement): boolean {
  return (
    candidate.querySelector('[role="group"]') !== null &&
    candidate.querySelector('[dir="auto"], img, video, audio') !== null
  );
}

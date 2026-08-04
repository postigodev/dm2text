export const MESSAGE_ROOT_SELECTOR = [
  '[role="row"][aria-label="Message"]',
  '[role="row"][aria-label="Sent by you"]',
].join(', ');

export const DATE_SEPARATOR_SELECTOR = '[role="separator"]';
export const MESSAGE_ACTIONS_SELECTOR = '[aria-label="Message actions"]';
export const LEAF_ACTION_SELECTOR = 'button, [role="button"]';
export const OUTGOING_MESSAGE_SELECTOR = '[aria-label="Sent by you"]';
export const SENDER_SELECTOR = '[aria-label="Sender"]';
export const PROFILE_LINK_SELECTOR = 'a[aria-label^="Profile of "]';
export const REPLY_SELECTOR = '[aria-label="Reply preview"]';
export const REPLY_SENDER_SELECTOR = '[aria-label="Replied-to sender"]';
export const TEXT_CONTENT_SELECTOR = ':scope > [dir="auto"]';
export const TIME_SELECTOR = ':scope > time';
export const MEDIA_SELECTOR = [
  ':scope > [data-media-kind]',
  ':scope > img[alt]',
  ':scope > video',
  ':scope > audio',
].join(', ');

export function queryMessageRoots(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(MESSAGE_ROOT_SELECTOR));
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

import {
  MESSAGE_ROOT_SELECTOR,
  findStructuralActionBar,
  queryMessageRoots,
} from './selectors';

export function findMessageScroller(root: ParentNode): HTMLElement | null {
  const candidates = root.querySelectorAll<HTMLElement>(
    'main [aria-label="Messages"], main [role="log"], main div',
  );

  return (
    Array.from(candidates).find((candidate) => {
      const style = getComputedStyle(candidate);
      const hasScrollableOverflow =
        style.overflowY === 'scroll' || style.overflowY === 'auto';

      return style.flexDirection === 'column-reverse' && hasScrollableOverflow;
    }) ?? null
  );
}

export function findMessageRoot(actionButton: Element): HTMLElement | null {
  const actionBar = findStructuralActionBar(actionButton);
  const semanticRoot = actionBar?.closest<HTMLElement>(MESSAGE_ROOT_SELECTOR);
  if (semanticRoot) return semanticRoot;
  if (!actionBar) return null;

  const scroller = findMessageScroller(document);
  return (
    queryMessageRoots(scroller ?? document).find((root) =>
      root.contains(actionBar),
    ) ?? null
  );
}

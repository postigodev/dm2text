import type { ParsedWindow } from '../transcript/types';
import { parseMessage } from './parse-message';
import {
  DATE_SEPARATOR_SELECTOR,
  MESSAGE_ROOT_SELECTOR,
  queryMessageRoots,
} from './selectors';

export function parseMountedWindow(
  scroller: HTMLElement,
  anchorRoot?: HTMLElement,
): ParsedWindow {
  const messages: ParsedWindow['messages'] = [];
  let activeDate: string | undefined;
  let unresolvedSenders: Array<{
    index: number;
    mayBeOutgoing: boolean;
  }> = [];
  let anchorIndex: number | undefined;
  const semanticItems = scroller.querySelectorAll<HTMLElement>(
    `${DATE_SEPARATOR_SELECTOR}, ${MESSAGE_ROOT_SELECTOR}`,
  );
  const mountedItems =
    semanticItems.length > 0
      ? Array.from(semanticItems)
      : queryMessageRoots(scroller);

  for (const item of mountedItems) {
    if (item.matches(DATE_SEPARATOR_SELECTOR)) {
      activeDate = normalizeInline(
        item.getAttribute('aria-label') ?? item.textContent ?? '',
      );
      continue;
    }

    const parsed = parseMessage(item, {
      ...(activeDate ? { date: activeDate } : {}),
      scroller,
    });
    if (!parsed) continue;

    if (parsed.sender === 'You') {
      for (const unresolved of unresolvedSenders) {
        if (!unresolved.mayBeOutgoing) continue;
        const message = messages[unresolved.index];
        if (message) messages[unresolved.index] = { ...message, sender: 'You' };
      }
      unresolvedSenders = [];
    } else if (parsed.sender === 'Unknown') {
      unresolvedSenders.push({
        index: messages.length,
        mayBeOutgoing: !item.matches(
          '[role="row"][aria-label="Message"]',
        ),
      });
    } else {
      for (const { index } of unresolvedSenders) {
        const unresolved = messages[index];
        if (unresolved) {
          messages[index] = { ...unresolved, sender: parsed.sender };
        }
      }
      unresolvedSenders = [];
    }

    if (item === anchorRoot) anchorIndex = messages.length;
    messages.push(parsed);
  }

  return {
    messages,
    ...(anchorIndex !== undefined ? { anchorIndex } : {}),
  };
}

function normalizeInline(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

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
  let unresolvedIncomingIndexes: number[] = [];
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
      unresolvedIncomingIndexes = [];
    } else if (parsed.sender === 'Unknown') {
      unresolvedIncomingIndexes.push(messages.length);
    } else {
      for (const index of unresolvedIncomingIndexes) {
        const unresolved = messages[index];
        if (unresolved) {
          messages[index] = { ...unresolved, sender: parsed.sender };
        }
      }
      unresolvedIncomingIndexes = [];
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

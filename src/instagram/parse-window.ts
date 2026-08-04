import type { ParsedWindow } from '../transcript/types';
import { parseMessage } from './parse-message';
import {
  DATE_SEPARATOR_SELECTOR,
  MESSAGE_ROOT_SELECTOR,
} from './selectors';

export function parseMountedWindow(
  scroller: HTMLElement,
  anchorRoot?: HTMLElement,
): ParsedWindow {
  const messages: ParsedWindow['messages'] = [];
  let activeDate: string | undefined;
  let anchorIndex: number | undefined;
  const mountedItems = scroller.querySelectorAll<HTMLElement>(
    `${DATE_SEPARATOR_SELECTOR}, ${MESSAGE_ROOT_SELECTOR}`,
  );

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

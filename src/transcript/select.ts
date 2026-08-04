import type { TranscriptMessage } from './types';

export function selectEndingAt(
  messages: readonly TranscriptMessage[],
  anchorKey: string,
  count: number,
): TranscriptMessage[] {
  const anchorIndex = messages.findIndex(({ key }) => key === anchorKey);
  if (anchorIndex < 0) return [];

  const normalizedCount = Number.isFinite(count)
    ? Math.max(1, Math.floor(count))
    : 1;
  const startIndex = Math.max(0, anchorIndex - normalizedCount + 1);

  return messages.slice(startIndex, anchorIndex + 1);
}

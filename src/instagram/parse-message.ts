import type {
  MessageContent,
  NormalizedMessage,
  ReplyContext,
} from '../transcript/types';
import {
  MEDIA_SELECTOR,
  OUTGOING_MESSAGE_SELECTOR,
  PROFILE_LINK_SELECTOR,
  REPLY_SELECTOR,
  REPLY_SENDER_SELECTOR,
  SENDER_SELECTOR,
  TEXT_CONTENT_SELECTOR,
  TIME_SELECTOR,
} from './selectors';

export interface ParseMessageContext {
  date?: string;
  scroller?: HTMLElement;
}

export function parseMessage(
  root: HTMLElement,
  context: ParseMessageContext = {},
): NormalizedMessage | null {
  const content = parseContent(root);
  if (!content) return null;

  const sender = parseSender(root, context);
  const time = normalizeInline(
    root.querySelector<HTMLElement>(TIME_SELECTOR)?.textContent ?? '',
  );
  const date = normalizeInline(context.date ?? '');
  const timestamp = time
    ? { time, ...(date ? { date } : {}) }
    : undefined;
  const reply = parseReply(root);
  const signature = JSON.stringify({
    sender,
    timestamp,
    content,
    reply,
  });

  return {
    signature,
    sender,
    ...(timestamp ? { timestamp } : {}),
    content,
    ...(reply ? { reply } : {}),
  };
}

function parseSender(
  root: HTMLElement,
  context: ParseMessageContext,
): string {
  if (root.matches(OUTGOING_MESSAGE_SELECTOR)) return 'You';

  const visibleSender = normalizeInline(
    root.querySelector<HTMLElement>(SENDER_SELECTOR)?.textContent ?? '',
  );
  if (visibleSender) return visibleSender;

  const profileSender = normalizeInline(
    root.querySelector<HTMLImageElement>(`${PROFILE_LINK_SELECTOR} img[alt]`)
      ?.alt ?? '',
  );
  if (profileSender) return profileSender;

  return inferSenderFromGeometry(root, context.scroller);
}

function inferSenderFromGeometry(
  root: HTMLElement,
  scroller: HTMLElement | undefined,
): string {
  if (!scroller) return 'Unknown';

  const rootRect = root.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  if (rootRect.width <= 0 || scrollerRect.width <= 0) return 'Unknown';

  const rootCenter = rootRect.left + rootRect.width / 2;
  const scrollerCenter = scrollerRect.left + scrollerRect.width / 2;
  return rootCenter > scrollerCenter ? 'You' : 'Unknown';
}

function parseContent(root: HTMLElement): MessageContent | null {
  const text = normalizeMultiline(
    root.querySelector<HTMLElement>(TEXT_CONTENT_SELECTOR)?.textContent ?? '',
  );
  const media = root.querySelector<HTMLElement>(MEDIA_SELECTOR);
  const label = media ? parseMediaLabel(media) : '';

  if (text && label) return { type: 'mixed', text, label };
  if (text) return { type: 'text', text };
  if (label) return { type: 'media', label };
  return null;
}

function parseMediaLabel(media: HTMLElement): string {
  const explicitKind = normalizeInline(media.dataset.mediaKind ?? '');
  if (explicitKind) return explicitKind.toLowerCase();

  if (media instanceof HTMLImageElement) {
    return normalizeInline(media.alt).toLowerCase() || 'image';
  }
  if (media instanceof HTMLVideoElement) return 'video';
  if (media instanceof HTMLAudioElement) return 'audio';

  return normalizeInline(media.getAttribute('aria-label') ?? '').toLowerCase();
}

function parseReply(root: HTMLElement): ReplyContext | undefined {
  const replyRoot = root.querySelector<HTMLElement>(REPLY_SELECTOR);
  if (!replyRoot) return undefined;

  const preview = normalizeMultiline(
    replyRoot.querySelector<HTMLElement>('[dir="auto"]')?.textContent ?? '',
  );
  if (!preview) return undefined;

  const sender = normalizeInline(
    replyRoot.querySelector<HTMLElement>(REPLY_SENDER_SELECTOR)?.textContent ?? '',
  );

  return {
    ...(sender ? { sender } : {}),
    preview,
  };
}

function normalizeInline(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

function normalizeMultiline(value: string): string {
  return value
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(normalizeInline)
    .filter(Boolean)
    .join('\n');
}

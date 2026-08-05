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
  previousIncomingSender?: string;
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
    content,
    ...(reply ? { replyPreview: reply.preview } : {}),
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

  const profileLink = root.querySelector<HTMLAnchorElement>(
    PROFILE_LINK_SELECTOR,
  );
  const profileSender = parseProfileSender(profileLink);
  if (profileSender) return profileSender;

  return inferSenderFromGeometry(root, context);
}

function inferSenderFromGeometry(
  root: HTMLElement,
  context: ParseMessageContext,
): string {
  const { scroller } = context;
  if (!scroller) return 'Unknown';

  const contentRoot = findLeafTextNodes(root).at(-1) ?? findMedia(root) ?? root;
  const rootRect = contentRoot.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  if (rootRect.width <= 0 || scrollerRect.width <= 0) return 'Unknown';

  const rootCenter = rootRect.left + rootRect.width / 2;
  const scrollerCenter = scrollerRect.left + scrollerRect.width / 2;
  if (rootCenter > scrollerCenter) return 'You';
  if (rootCenter < scrollerCenter) {
    return context.previousIncomingSender ?? 'Unknown';
  }
  return 'Unknown';
}

function parseContent(root: HTMLElement): MessageContent | null {
  const textRoot =
    root.querySelector<HTMLElement>(TEXT_CONTENT_SELECTOR) ??
    findLeafTextNodes(root).at(-1);
  const text = normalizeMultiline(textRoot?.textContent ?? '');
  const media = findMedia(root);
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
  const replyRoot =
    root.querySelector<HTMLElement>(REPLY_SELECTOR) ??
    findStructuralReply(root);
  if (!replyRoot) return undefined;

  const preview = normalizeMultiline(
    replyRoot.querySelector<HTMLElement>('[dir="auto"]')?.textContent ??
      replyRoot.textContent ??
      '',
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

function parseProfileSender(link: HTMLAnchorElement | null): string {
  if (!link) return '';

  const imageAlt = normalizeInline(
    link.querySelector<HTMLImageElement>('img[alt]')?.alt ?? '',
  );
  if (imageAlt && imageAlt !== 'user-profile-picture') return imageAlt;

  const label = normalizeInline(link.getAttribute('aria-label') ?? '');
  const labelledSender = label.match(
    /^(?:Profile of |Open the profile page of )(.+)$/u,
  )?.[1];
  if (labelledSender) return labelledSender;

  return normalizeInline(link.getAttribute('href') ?? '')
    .replace(/^\//u, '')
    .replace(/\/$/u, '');
}

function findLeafTextNodes(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[dir="auto"]')).filter(
    (candidate) => candidate.querySelector('[dir="auto"]') === null,
  );
}

function findMedia(root: HTMLElement): HTMLElement | null {
  const explicitMedia = root.querySelector<HTMLElement>(MEDIA_SELECTOR);
  if (explicitMedia) return explicitMedia;

  return (
    Array.from(
      root.querySelectorAll<HTMLElement>('img[alt], video, audio'),
    ).find((candidate) => {
      if (candidate.closest(PROFILE_LINK_SELECTOR)) return false;
      if (candidate.closest('[aria-label="Message actions"]')) return false;
      return candidate.getAttribute('alt') !== 'user-profile-picture';
    }) ?? null
  );
}

function findStructuralReply(root: HTMLElement): HTMLElement | null {
  const contentRoot = findLeafTextNodes(root).at(-1);
  if (!contentRoot) return null;

  return (
    Array.from(root.querySelectorAll<HTMLElement>('[role="button"]')).find(
      (candidate) => {
        if (!normalizeMultiline(candidate.textContent ?? '')) return false;
        if (candidate.querySelector('img, video, audio')) return false;
        if (candidate.contains(contentRoot)) return false;
        return Boolean(
          candidate.compareDocumentPosition(contentRoot) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        );
      },
    ) ?? null
  );
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

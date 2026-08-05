import type {
  MessageContent,
  ReplyContext,
  TranscriptMessage,
} from './types';

export function formatTranscript(
  messages: readonly TranscriptMessage[],
): string {
  let activeDate: string | undefined;

  return messages
    .map((message) => {
      const explicitDate = normalizeInline(message.timestamp?.date ?? '');
      if (explicitDate) activeDate = explicitDate;

      const time = normalizeInline(message.timestamp?.time ?? '');
      const timestamp = formatTimestamp(time, activeDate);
      const sender = normalizeInline(message.sender) || 'Unknown';
      const reply = formatReply(message.reply);
      const content = formatContent(message.content);

      return `${timestamp}${sender}${reply}: ${content}`;
    })
    .join('\n');
}

function formatTimestamp(time: string, date: string | undefined): string {
  if (!time) return '';
  return date ? `[${time}, ${date}] ` : `[${time}] `;
}

function formatReply(reply: ReplyContext | undefined): string {
  if (!reply) return '';

  const preview = normalizeMessageText(reply.preview);
  if (!preview) return '';

  const sender = normalizeInline(reply.sender ?? '');
  const context = sender ? `${sender}: ${preview}` : preview;
  return ` (replying to ${context})`;
}

function formatContent(content: MessageContent): string {
  if (content.type === 'shared-post') {
    const source = normalizeInline(content.source ?? '');
    const caption = normalizeMessageText(content.caption ?? '');
    const header = source
      ? `[shared post by ${source}]`
      : '[shared post]';

    return caption ? `${header}\n  Caption: ${caption}` : header;
  }

  if (content.type === 'text') {
    return normalizeMessageText(content.text);
  }

  const label = normalizeInline(content.label) || 'media';
  if (content.type === 'media') return `[${label}]`;

  const text = normalizeMessageText(content.text);
  return text ? `${text} [${label}]` : `[${label}]`;
}

function normalizeInline(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

function normalizeMessageText(value: string): string {
  return value
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(normalizeInline)
    .filter(Boolean)
    .join('\\n');
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'media'; label: string }
  | { type: 'mixed'; text: string; label: string };

export interface TimestampParts {
  time: string;
  date?: string;
}

export interface ReplyContext {
  sender?: string;
  preview: string;
  referencedKey?: string;
}

export interface NormalizedMessage {
  signature: string;
  sender: string;
  timestamp?: TimestampParts;
  content: MessageContent;
  reply?: ReplyContext;
}

export interface TranscriptMessage extends NormalizedMessage {
  key: string;
}

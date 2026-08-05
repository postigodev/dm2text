export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'media'; label: string }
  | { type: 'mixed'; text: string; label: string }
  | { type: 'shared-post'; source?: string; caption?: string };

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

export interface ParsedWindow {
  messages: NormalizedMessage[];
  anchorIndex?: number;
}

export interface AnchorSnapshot {
  signature: string;
  /** Zero-based occurrence among equal signatures in the parsed window. */
  occurrenceInWindow: number;
  previousSignature?: string;
  nextSignature?: string;
}

export interface MergeState {
  messages: TranscriptMessage[];
  nextKey: number;
  anchorKey?: string;
}

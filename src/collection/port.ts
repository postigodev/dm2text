import type {
  AnchorSnapshot,
  ParsedWindow,
  TranscriptMessage,
} from '../transcript/types';

export interface CollectionPort {
  readWindow(): ParsedWindow;
  scrollOlder(signal: AbortSignal): Promise<'mutated' | 'timed-out'>;
  isAtVisualTop(): boolean;
  restoreAnchor(
    snapshot: AnchorSnapshot,
    signal: AbortSignal,
  ): Promise<boolean>;
}

export interface CollectMessagesOptions {
  port: CollectionPort;
  initialWindow: ParsedWindow;
  requestedCount: number;
  signal: AbortSignal;
  onProgress(collected: number): void;
}

export interface CollectionResult {
  status: 'complete' | 'beginning' | 'stalled' | 'cancelled';
  messages: TranscriptMessage[];
}

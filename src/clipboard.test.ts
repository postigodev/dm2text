import { describe, expect, it, vi } from 'vitest';
import { ClipboardError, copyText } from './clipboard';

describe('copyText', () => {
  it('prefers the async clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const execCommand = vi.fn();
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    await copyText('private transcript');

    expect(writeText).toHaveBeenCalledWith('private transcript');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back to a temporary textarea when the clipboard API fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    await copyText('private transcript');

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('removes the textarea and throws a content-free error when both methods fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    const error = await copyText('do not leak this').catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ClipboardError);
    expect(String(error)).not.toContain('do not leak this');
    expect(document.querySelector('textarea')).toBeNull();
  });
});

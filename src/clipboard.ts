export class ClipboardError extends Error {
  constructor() {
    super('Clipboard operation failed');
    this.name = 'ClipboardError';
  }
}

export async function copyText(text: string): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) throw new ClipboardError();
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    copyWithTemporaryTextarea(text);
  }
}

function copyWithTemporaryTextarea(text: string): void {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.append(textarea);

  try {
    textarea.select();
    if (!document.execCommand('copy')) throw new ClipboardError();
  } catch {
    throw new ClipboardError();
  } finally {
    textarea.remove();
  }
}

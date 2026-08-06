import { describe, expect, it, vi } from 'vitest';
import { createCopySessionDialog } from './copy-dialog';

describe('createCopySessionDialog', () => {
  it('is lazy and keeps one host alive from count entry through progress', async () => {
    expect(document.querySelector('.dm2text-root')).toBeNull();

    const dialog = createCopySessionDialog();
    const host = requiredHost();
    const countPromise = dialog.requestCount();
    setCountValue('50');
    clickButton('Copy');

    await expect(countPromise).resolves.toBe(50);
    dialog.updateProgress(12, 50);

    expect(requiredHost()).toBe(host);
    expect(shadowText()).toContain('12 of 50 messages');
    expect(dialog.signal.aborted).toBe(false);

    const partialConfirmation = dialog.confirmPartial(23, 50, 'stalled');
    expect(requiredHost()).toBe(host);
    clickButton('Copy 23');
    await expect(partialConfirmation).resolves.toBe(true);

    dialog.close();
    expect(document.querySelector('.dm2text-root')).toBeNull();
  });

  it.each(['1', '999'])('accepts the valid boundary count %s', async (value) => {
    const dialog = createCopySessionDialog();
    const countPromise = dialog.requestCount();
    setCountValue(value);
    clickButton('Copy');

    await expect(countPromise).resolves.toBe(Number(value));
    dialog.close();
  });

  it.each(['', '1.5', '0', '-1', '1000'])(
    'rejects invalid count %j inline',
    async (value) => {
      const dialog = createCopySessionDialog();
      let settled = false;
      const countPromise = dialog.requestCount().then((result) => {
        settled = true;
        return result;
      });
      setCountValue(value);
      clickButton('Copy');
      await Promise.resolve();

      expect(settled).toBe(false);
      expect(shadowRoot().querySelector('[data-dm2text-error]')?.textContent).not
        .toBe('');

      clickButton('Cancel');
      await expect(countPromise).resolves.toBeNull();
      dialog.close();
    },
  );

  it('aborts and resolves null when count entry is cancelled', async () => {
    const dialog = createCopySessionDialog();
    const countPromise = dialog.requestCount();

    clickButton('Cancel');

    expect(dialog.signal.aborted).toBe(true);
    await expect(countPromise).resolves.toBeNull();
    expect(document.querySelector('.dm2text-root')).not.toBeNull();
    dialog.close();
  });

  it('aborts on Escape during progress', async () => {
    const dialog = createCopySessionDialog();
    const countPromise = dialog.requestCount();
    setCountValue('50');
    clickButton('Copy');
    await countPromise;
    dialog.updateProgress(12, 50);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(dialog.signal.aborted).toBe(true);
    dialog.close();
  });

  it('confirms a partial copy on the same host only from its copy action', async () => {
    const dialog = createCopySessionDialog();
    const host = requiredHost();

    const confirmation = dialog.confirmPartial(23, 50, 'stalled');
    expect(requiredHost()).toBe(host);
    expect(shadowText()).toContain(
      'Found only 23 of 50 messages. Copy the available messages?',
    );
    clickButton('Copy 23');

    await expect(confirmation).resolves.toBe(true);
    expect(dialog.signal.aborted).toBe(false);
    dialog.close();
  });

  it('lets cancellation win during partial confirmation', async () => {
    const dialog = createCopySessionDialog();
    const confirmation = dialog.confirmPartial(23, 50, 'beginning');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(dialog.signal.aborted).toBe(true);
    await expect(confirmation).resolves.toBe(false);
    dialog.close();
  });

  it('closes idempotently, resolves pending work, and removes listeners', async () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const dialog = createCopySessionDialog();
    const countPromise = dialog.requestCount();

    dialog.close();
    dialog.close();

    await expect(countPromise).resolves.toBeNull();
    expect(dialog.signal.aborted).toBe(true);
    expect(document.querySelector('.dm2text-root')).toBeNull();
    expect(removeEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
  });

  it('renders a labelled count state inside the owned scrim', () => {
    const dialog = createCopySessionDialog();
    void dialog.requestCount();

    expect(shadowRoot().querySelector('[data-dm2text-scrim]')).not.toBeNull();
    expect(
      shadowRoot().querySelector('[data-dm2text-state="count"]'),
    ).not.toBeNull();
    expect(shadowRoot().querySelector('h2')?.textContent).toBe('Copy context');
    expect(shadowText()).toContain('Ends at the selected message');
    expect(shadowRoot().querySelector('label')?.textContent).toContain(
      'Messages to include',
    );
    expect(shadowRoot().activeElement).toBe(
      shadowRoot().querySelector<HTMLInputElement>('input'),
    );
    expect(
      shadowRoot().querySelector('[data-variant="primary"]')?.textContent,
    ).toBe('Copy');

    dialog.close();
  });

  it('applies the Instagram page font after the host style reset', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      fontFamily: 'Instagram Sans, sans-serif',
    } as CSSStyleDeclaration);

    const dialog = createCopySessionDialog();

    expect(requiredHost().style.fontFamily).toBe(
      '"Instagram Sans", sans-serif',
    );
    expect(requiredHost().style.fontSize).toBe('14px');
    expect(requiredHost().style.lineHeight).toBe('1.4');
    dialog.close();
  });

  it('exposes clamped determinate progress without changing the reported count', () => {
    const dialog = createCopySessionDialog();

    dialog.updateProgress(75, 50);

    const progress = shadowRoot().querySelector<HTMLProgressElement>(
      '[data-dm2text-progress]',
    );
    expect(progress?.max).toBe(50);
    expect(progress?.value).toBe(50);
    expect(progress?.getAttribute('aria-label')).toBe(
      'Collected 75 of 50 messages',
    );
    expect(
      shadowRoot().querySelector('[data-dm2text-state="progress"]'),
    ).not.toBeNull();
    expect(shadowText()).toContain('75 of 50 messages');

    dialog.close();
  });

  it('keeps achieved progress visible during partial confirmation', async () => {
    const dialog = createCopySessionDialog();
    const confirmation = dialog.confirmPartial(23, 50, 'stalled');

    const progress = shadowRoot().querySelector<HTMLProgressElement>(
      '[data-dm2text-progress]',
    );
    expect(
      shadowRoot().querySelector('[data-dm2text-state="partial"]'),
    ).not.toBeNull();
    expect(progress?.value).toBe(23);
    expect(progress?.max).toBe(50);
    expect(
      shadowRoot().querySelector('[data-variant="primary"]')?.textContent,
    ).toBe('Copy 23');

    clickButton('Cancel');
    await expect(confirmation).resolves.toBe(false);
    dialog.close();
  });

  it('keeps validation polite and structurally stable', async () => {
    const dialog = createCopySessionDialog();
    const countPromise = dialog.requestCount();

    setCountValue('0');
    clickButton('Copy');

    const error = shadowRoot().querySelector('[data-dm2text-error]');
    expect(error?.getAttribute('aria-live')).toBe('polite');
    expect(error?.textContent).toBe('Enter a whole number from 1 to 999.');
    expect(
      shadowRoot().querySelector('[data-dm2text-state="count"]'),
    ).not.toBeNull();

    clickButton('Cancel');
    await expect(countPromise).resolves.toBeNull();
    dialog.close();
  });
});

function requiredHost(): HTMLElement {
  const host = document.querySelector<HTMLElement>('.dm2text-root');
  if (!host) throw new Error('Copy dialog host not found');
  return host;
}

function shadowRoot(): ShadowRoot {
  const root = requiredHost().shadowRoot;
  if (!root) throw new Error('Copy dialog shadow root not found');
  return root;
}

function shadowText(): string {
  return shadowRoot().textContent ?? '';
}

function setCountValue(value: string): void {
  const input = shadowRoot().querySelector<HTMLInputElement>('input');
  if (!input) throw new Error('Count input not found');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickButton(label: string): void {
  const button = Array.from(shadowRoot().querySelectorAll('button')).find(
    (candidate) => candidate.textContent === label,
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  button.click();
}

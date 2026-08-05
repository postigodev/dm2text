import { afterEach, describe, expect, it, vi } from 'vitest';
import { showToast } from './toast';

describe('showToast', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('.dm2text-root').forEach((host) => host.remove());
  });

  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'status'],
    ['error', 'alert'],
  ] as const)('renders %s with the correct semantic role', (kind, role) => {
    showToast('Content-free status', kind);

    const toast = requiredShadow().querySelector('[data-dm2text-toast]');
    expect(toast?.getAttribute('role')).toBe(role);
    expect(toast?.getAttribute('data-kind')).toBe(kind);
    expect(
      requiredShadow().querySelector('[data-dm2text-indicator]')?.getAttribute(
        'aria-hidden',
      ),
    ).toBe('true');
    expect(
      requiredShadow().querySelector('[data-dm2text-message]')?.textContent,
    ).toBe('Content-free status');
  });

  it('removes the owned host when clicked', () => {
    showToast('Copied 50 messages.', 'success');

    requiredShadow()
      .querySelector<HTMLElement>('[data-dm2text-toast]')
      ?.click();

    expect(document.querySelector('.dm2text-root')).toBeNull();
  });

  it('removes the owned host after four seconds', () => {
    vi.useFakeTimers();
    showToast('Copied 50 messages.', 'success');

    vi.advanceTimersByTime(3_999);
    expect(document.querySelector('.dm2text-root')).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(document.querySelector('.dm2text-root')).toBeNull();
  });
});

function requiredShadow(): ShadowRoot {
  const root = document.querySelector<HTMLElement>('.dm2text-root')?.shadowRoot;
  if (!root) throw new Error('Toast shadow root not found');
  return root;
}

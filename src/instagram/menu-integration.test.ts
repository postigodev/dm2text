import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installMenuIntegration } from './menu-integration';

const parseMountedWindow = vi.hoisted(() => vi.fn());

vi.mock('./parse-window', () => ({ parseMountedWindow }));

describe('installMenuIntegration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    history.replaceState({}, '', '/direct/t/local-thread');
    document.body.innerHTML = readFileSync(
      'tests/fixtures/instagram/menu.html',
      'utf8',
    );
  });

  it('captures the original root before the dialog and emits it exactly once', async () => {
    const onCopyContextRequested = vi.fn();
    const teardown = installMenuIntegration({ onCopyContextRequested });
    const originalRoot = requiredElement('[data-fixture-message="original"]');
    const menuTrigger = requiredElement('[aria-label="More"]');

    menuTrigger.click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    const dialog = mountNativeDialog();
    await flushMutations();
    expect(dialog.querySelectorAll('[data-dm2text-action]')).toHaveLength(1);

    originalRoot.parentElement?.append(newIncomingMessage());
    requiredElement('[data-dm2text-action]').click();
    requiredElement('[data-dm2text-action]').click();

    expect(onCopyContextRequested).toHaveBeenCalledTimes(1);
    expect(onCopyContextRequested).toHaveBeenCalledWith({
      anchorRoot: originalRoot,
      menuTrigger,
    });
    expect(parseMountedWindow).not.toHaveBeenCalled();
    teardown();
  });

  it('reuses an injected action without duplicating native or custom rows', async () => {
    const teardown = installMenuIntegration({
      onCopyContextRequested: vi.fn(),
    });
    const menuTrigger = requiredElement('[aria-label="More"]');
    menuTrigger.click();
    const dialog = mountNativeDialog();
    await flushMutations();

    dialog.remove();
    menuTrigger.click();
    document.body.append(dialog);
    await flushMutations();

    expect(dialog.querySelectorAll('[data-dm2text-action]')).toHaveLength(1);
    expect(dialog.querySelectorAll('button')).toHaveLength(3);
    expect(parseMountedWindow).not.toHaveBeenCalled();
    teardown();
  });

  it('preserves the native row layout while replacing its label and icon', async () => {
    const teardown = installMenuIntegration({
      onCopyContextRequested: vi.fn(),
    });
    requiredElement('[aria-label="More"]').click();
    const dialog = mountNativeDialog();
    await flushMutations();

    const nativeAction = dialog.querySelector<HTMLElement>(
      'button:not([data-dm2text-action])',
    );
    const customAction = requiredElement('[data-dm2text-action]');
    const icon = customAction.querySelector<SVGSVGElement>(
      '[data-dm2text-icon]',
    );

    expect(customAction.className).toBe(nativeAction?.className);
    expect(customAction.querySelector('[data-native-label]')?.textContent).toBe(
      'Copy context',
    );
    expect(customAction.querySelector('[data-native-icon-slot]')).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(icon?.querySelectorAll('path, rect')).toHaveLength(2);
    teardown();
  });

  it('reinjects when Instagram repopulates the same dialog node', async () => {
    const onCopyContextRequested = vi.fn();
    const teardown = installMenuIntegration({ onCopyContextRequested });
    const menuTrigger = requiredElement('[aria-label="More"]');
    menuTrigger.click();
    const dialog = mountNativeDialog();
    await flushMutations();

    requiredElement('[data-dm2text-action]').remove();
    menuTrigger.click();
    dialog.append(document.createElement('span'));
    await flushMutations();

    const reinjected = requiredElement('[data-dm2text-action]');
    reinjected.click();
    expect(onCopyContextRequested).toHaveBeenCalledTimes(1);
    teardown();
  });

  it('disconnects bounded observation after injection, timeout, and teardown', async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const teardown = installMenuIntegration({
      onCopyContextRequested: vi.fn(),
    });
    const menuTrigger = requiredElement('[aria-label="More"]');

    menuTrigger.click();
    mountNativeDialog();
    await flushMutations();
    expect(disconnect).toHaveBeenCalled();

    const callsAfterInjection = disconnect.mock.calls.length;
    menuTrigger.click();
    vi.advanceTimersByTime(2_000);
    expect(disconnect.mock.calls.length).toBeGreaterThan(callsAfterInjection);

    teardown();
    expect(document.querySelector('[data-dm2text-action]')).toBeNull();
  });

  it('returns immediately outside Direct and cleans up on SPA navigation away', async () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const teardown = installMenuIntegration({
      onCopyContextRequested: vi.fn(),
    });
    const menuTrigger = requiredElement('[aria-label="More"]');

    history.replaceState({}, '', '/');
    menuTrigger.click();
    expect(observe).not.toHaveBeenCalled();

    history.replaceState({}, '', '/direct/t/local-thread');
    menuTrigger.click();
    expect(observe).toHaveBeenCalledTimes(1);

    history.replaceState({}, '', '/');
    dispatchEvent(new PopStateEvent('popstate'));
    expect(disconnect).toHaveBeenCalled();

    mountNativeDialog();
    await flushMutations();
    expect(document.querySelector('[data-dm2text-action]')).toBeNull();
    teardown();
  });
});

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing fixture element: ${selector}`);
  return element;
}

function mountNativeDialog(): HTMLElement {
  const template = requiredElement('#native-menu-template');
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error('Native menu fixture is not a template');
  }

  const dialog = template.content.firstElementChild?.cloneNode(true);
  if (!(dialog instanceof HTMLElement)) {
    throw new Error('Native menu fixture has no dialog');
  }
  document.body.append(dialog);
  return dialog;
}

function newIncomingMessage(): HTMLElement {
  const root = document.createElement('div');
  root.setAttribute('role', 'row');
  root.setAttribute('aria-label', 'Message');
  root.innerHTML = '<span aria-label="Sender">Person B</span>';
  return root;
}

async function flushMutations(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

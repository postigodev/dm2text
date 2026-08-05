import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAnchorSnapshot } from '../transcript/merge';
import { findMessageScroller } from './discovery';
import { parseMountedWindow } from './parse-window';
import { createInstagramCollectionPort } from './scroll';

describe('createInstagramCollectionPort', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finds the active chat scroller instead of the conversation list', () => {
    const { activeScroller } = mountScrollFixture();
    expect(findMessageScroller(document)).toBe(activeScroller);
  });

  it('scrolls by a negative 0.8 viewport and times out without polling', async () => {
    const { activeScroller, anchorRoot } = mountScrollFixture();
    const scrollBy = vi.fn();
    activeScroller.scrollBy = scrollBy;
    const port = createInstagramCollectionPort({
      scroller: activeScroller,
      anchorRoot,
      startingScrollTop: 0,
    });

    const resultPromise = port.scrollOlder(new AbortController().signal);
    expect(scrollBy).toHaveBeenCalledWith({ top: -400, behavior: 'instant' });
    await vi.advanceTimersByTimeAsync(750);

    await expect(resultPromise).resolves.toBe('timed-out');
  });

  it('reaches the oldest mounted root in one collection step', async () => {
    const { activeScroller, anchorRoot } = mountScrollFixture();
    const oldestRoot = requiredElement('[data-signature="before"]');
    Object.defineProperty(oldestRoot, 'getBoundingClientRect', {
      configurable: true,
      value: () => rect(-1_200, 100),
    });
    Object.defineProperty(activeScroller, 'getBoundingClientRect', {
      configurable: true,
      value: () => rect(0, 500),
    });
    const scrollBy = vi.fn();
    activeScroller.scrollBy = scrollBy;
    const port = createInstagramCollectionPort({
      scroller: activeScroller,
      anchorRoot,
      startingScrollTop: 0,
    });

    const resultPromise = port.scrollOlder(new AbortController().signal);
    expect(scrollBy).toHaveBeenCalledWith({
      top: -1_200,
      behavior: 'instant',
    });
    await vi.advanceTimersByTimeAsync(750);

    await expect(resultPromise).resolves.toBe('timed-out');
  });

  it('ignores unrelated mutations and resolves after message roots change', async () => {
    const { activeScroller, wrapper, anchorRoot } = mountScrollFixture();
    activeScroller.scrollBy = vi.fn();
    const port = createInstagramCollectionPort({
      scroller: activeScroller,
      anchorRoot,
      startingScrollTop: 0,
    });

    const resultPromise = port.scrollOlder(new AbortController().signal);
    activeScroller.append(document.createElement('div'));
    let settled = false;
    void resultPromise.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(100);

    expect(settled).toBe(false);

    wrapper.insertAdjacentHTML('afterbegin', messageMarkup('older'));

    await vi.advanceTimersByTimeAsync(49);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(resultPromise).resolves.toBe('mutated');
  });

  it('reports visual top from column-reverse geometry only', () => {
    const { activeScroller, anchorRoot } = mountScrollFixture();
    let scrollTop = -1_500;
    Object.defineProperty(activeScroller, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    const port = createInstagramCollectionPort({
      scroller: activeScroller,
      anchorRoot,
      startingScrollTop: 0,
    });

    expect(port.isAtVisualTop()).toBe(true);
    scrollTop = -1_000;
    expect(port.isAtVisualTop()).toBe(false);
  });

  it('centers the original anchor while it remains connected', async () => {
    const { activeScroller, anchorRoot } = mountScrollFixture();
    const scrollIntoView = vi.mocked(anchorRoot.scrollIntoView);
    const initialWindow = parseMountedWindow(activeScroller, anchorRoot);
    const snapshot = buildAnchorSnapshot(initialWindow)!;
    const port = createInstagramCollectionPort({
      scroller: activeScroller,
      anchorRoot,
      startingScrollTop: 0,
    });

    await expect(
      port.restoreAnchor(snapshot, new AbortController().signal),
    ).resolves.toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('scrolls toward zero and rematches occurrence plus neighbor context', async () => {
    const { activeScroller, wrapper, anchorRoot } = mountScrollFixture();
    const initialWindow = parseMountedWindow(activeScroller, anchorRoot);
    const snapshot = buildAnchorSnapshot(initialWindow)!;
    const originalMarkup = wrapper.innerHTML;
    anchorRoot.remove();
    wrapper.innerHTML = messageMarkup('unrelated');
    let scrollTop = -1_000;
    Object.defineProperty(activeScroller, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
        wrapper.innerHTML = originalMarkup;
      },
    });
    const port = createInstagramCollectionPort({
      scroller: activeScroller,
      anchorRoot,
      startingScrollTop: -120,
    });

    const restoration = port.restoreAnchor(
      snapshot,
      new AbortController().signal,
    );
    await vi.advanceTimersByTimeAsync(50);

    await expect(restoration).resolves.toBe(true);
    expect(scrollTop).toBeGreaterThan(-1_000);
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
    });
  });

  it('falls back to the saved offset when the anchor cannot be remounted', async () => {
    const { activeScroller, wrapper, anchorRoot } = mountScrollFixture();
    const snapshot = buildAnchorSnapshot(
      parseMountedWindow(activeScroller, anchorRoot),
    )!;
    anchorRoot.remove();
    wrapper.innerHTML = messageMarkup('unrelated');
    let scrollTop = -1_000;
    Object.defineProperty(activeScroller, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    const port = createInstagramCollectionPort({
      scroller: activeScroller,
      anchorRoot,
      startingScrollTop: -120,
    });

    const restoration = port.restoreAnchor(
      snapshot,
      new AbortController().signal,
    );
    await vi.runAllTimersAsync();

    await expect(restoration).resolves.toBe(false);
    expect(scrollTop).toBe(-120);
  });

  it('performs no restoration mutation after an abort', async () => {
    const { activeScroller, anchorRoot } = mountScrollFixture();
    const snapshot = buildAnchorSnapshot(
      parseMountedWindow(activeScroller, anchorRoot),
    )!;
    anchorRoot.remove();
    const setScrollTop = vi.fn();
    Object.defineProperty(activeScroller, 'scrollTop', {
      configurable: true,
      get: () => -1_000,
      set: setScrollTop,
    });
    const controller = new AbortController();
    controller.abort();
    const port = createInstagramCollectionPort({
      scroller: activeScroller,
      anchorRoot,
      startingScrollTop: -120,
    });

    await expect(port.restoreAnchor(snapshot, controller.signal)).rejects.toThrow();
    expect(setScrollTop).not.toHaveBeenCalled();
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

function mountScrollFixture(): {
  activeScroller: HTMLElement;
  wrapper: HTMLElement;
  anchorRoot: HTMLElement;
} {
  document.body.innerHTML = `
    <main>
      <div aria-label="Conversation list" style="overflow-y: scroll"></div>
      <div aria-label="Messages" style="display:flex;flex-direction:column-reverse;overflow-y:scroll">
        <div>${messageMarkup('before')}${messageMarkup('anchor')}${messageMarkup('after')}</div>
      </div>
    </main>
  `;
  const activeScroller = requiredElement('[aria-label="Messages"]');
  const wrapper = activeScroller.firstElementChild;
  if (!(wrapper instanceof HTMLElement)) throw new Error('Missing wrapper');
  const anchorRoot = requiredElement('[data-signature="anchor"]');
  defineMetric(activeScroller, 'clientHeight', 500);
  defineMetric(activeScroller, 'scrollHeight', 2_000);
  defineMetric(activeScroller, 'scrollTop', 0);
  return { activeScroller, wrapper, anchorRoot };
}

function messageMarkup(signature: string): string {
  return `
    <div role="row" aria-label="Sent by you" data-signature="${signature}">
      <time>14:16</time><div dir="auto">${signature}</div>
    </div>
  `;
}

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function defineMetric(element: HTMLElement, name: string, value: number): void {
  Object.defineProperty(element, name, {
    configurable: true,
    writable: true,
    value,
  });
}

function rect(top: number, height: number): DOMRect {
  return {
    x: 0,
    y: top,
    left: 0,
    right: 100,
    top,
    bottom: top + height,
    width: 100,
    height,
    toJSON: () => ({}),
  };
}

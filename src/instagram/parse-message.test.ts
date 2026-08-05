import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findMessageRoot, findMessageScroller } from './discovery';
import { parseMessage } from './parse-message';
import { parseMountedWindow } from './parse-window';

describe('Instagram DOM adapter', () => {
  it('discovers only the active column-reverse message scroller', () => {
    loadFixture('individual');
    const scroller = document.querySelector<HTMLElement>('[aria-label="Messages"]');

    expect(findMessageScroller(document)).toBe(scroller);
  });

  it('finds the message root from the final action button', () => {
    loadFixture('individual');
    const messageRoot = document.querySelector<HTMLElement>('[role="row"]');
    const actionButton = messageRoot?.querySelector(
      '[aria-label="Message actions"] [aria-label="More"]',
    );

    expect(actionButton).not.toBeNull();
    expect(findMessageRoot(actionButton!)).toBe(messageRoot);
  });

  it('finds and parses a current virtualized message without semantic rows', () => {
    mountCurrentDomShape();
    const scroller = requiredScroller();
    const menuTrigger = document.querySelector<HTMLElement>(
      '[data-current-menu-trigger]',
    );
    const messageRoot = document.querySelector<HTMLElement>(
      '[data-current-message]',
    );

    expect(menuTrigger).not.toBeNull();
    expect(findMessageRoot(menuTrigger!)).toBe(messageRoot);

    const parsed = parseMountedWindow(scroller, messageRoot!);
    expect(parsed.anchorIndex).toBe(0);
    expect(parsed.messages).toMatchObject([
      {
        sender: 'Person Current',
        content: { type: 'text', text: 'current-message' },
        reply: { preview: 'earlier-message' },
      },
    ]);
  });

  it('parses group senders, replies, dates, and an exact repeated anchor', () => {
    loadFixture('group');
    const scroller = requiredScroller();
    const messageRoots = scroller.querySelectorAll<HTMLElement>('[role="row"]');
    const secondRepeatedRoot = messageRoots[2];
    const parsed = parseMountedWindow(scroller, secondRepeatedRoot);

    expect(parsed.messages.map(({ sender }) => sender)).toEqual([
      'Person A',
      'You',
      'Person B',
    ]);
    expect(parsed.messages[0]?.reply).toEqual({
      sender: 'Person A',
      preview: 'message-one',
    });
    expect(parsed.messages[0]?.timestamp).toEqual({
      time: '14:16',
      date: '29/7/2026',
    });
    expect(parsed.messages[1]?.timestamp).toEqual({
      time: '14:17',
      date: '29/7/2026',
    });
    expect(parsed.messages[2]?.timestamp).toBeUndefined();
    expect(parsed.anchorIndex).toBe(2);
  });

  it('parses representative image and unsupported attachment media', () => {
    loadFixture('individual');
    const parsed = parseMountedWindow(requiredScroller());

    expect(parsed.messages[1]?.content).toEqual({
      type: 'media',
      label: 'image',
    });
    expect(parsed.messages[2]?.content).toEqual({
      type: 'media',
      label: 'attachment',
    });
    expect(parsed.messages[2]?.timestamp).toBeUndefined();
  });

  it('keeps message identity stable when sender evidence changes', () => {
    document.body.innerHTML = `
      <div id="incoming" role="row" aria-label="Message">
        <span aria-label="Sender">Person A</span>
        <div dir="auto">same-content</div>
      </div>
      <div id="outgoing" role="row" aria-label="Sent by you">
        <div dir="auto">same-content</div>
      </div>
    `;

    const incoming = parseMessage(requiredElement('#incoming'));
    const outgoing = parseMessage(requiredElement('#outgoing'));

    expect(incoming?.sender).toBe('Person A');
    expect(outgoing?.sender).toBe('You');
    expect(incoming?.signature).toBe(outgoing?.signature);
  });

  it('backfills an explicit sender across the preceding incoming group', () => {
    document.body.innerHTML = `
      <div aria-label="Messages">
        <div role="row" aria-label="Message">
          <div dir="auto">first-message</div>
        </div>
        <div role="row" aria-label="Message">
          <span aria-label="Sender">Person A</span>
          <div dir="auto">second-message</div>
        </div>
      </div>
    `;
    const scroller = requiredElement('[aria-label="Messages"]');
    Object.defineProperty(scroller, 'getBoundingClientRect', {
      value: () => rect(0, 1_000),
    });
    const firstContent = requiredElement(
      '[role="row"]:first-child [dir="auto"]',
    );
    Object.defineProperty(firstContent, 'getBoundingClientRect', {
      value: () => rect(100, 200),
    });

    expect(
      parseMountedWindow(scroller).messages.map(({ sender }) => sender),
    ).toEqual(['Person A', 'Person A']);
  });

  it('does not backfill an unknown sender across an outgoing boundary', () => {
    document.body.innerHTML = `
      <div aria-label="Messages">
        <div role="row" aria-label="Message">
          <div dir="auto">unresolved-message</div>
        </div>
        <div role="row" aria-label="Sent by you">
          <div dir="auto">outgoing-message</div>
        </div>
        <div role="row" aria-label="Message">
          <span aria-label="Sender">Person A</span>
          <div dir="auto">resolved-message</div>
        </div>
      </div>
    `;

    expect(
      parseMountedWindow(requiredElement('[aria-label="Messages"]')).messages.map(
        ({ sender }) => sender,
      ),
    ).toEqual(['Unknown', 'You', 'Person A']);
  });

  it('detects an offscreen outgoing message from stable flex alignment', () => {
    document.body.innerHTML = `
      <div id="scroller">
        <div id="outgoing">
          <div role="group">
            <div style="display:flex;align-items:flex-end;justify-content:flex-end">
              <div style="display:flex;align-items:center;flex-direction:row-reverse;justify-content:flex-start">
                <div dir="auto">offscreen-message</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    expect(
      parseMessage(requiredElement('#outgoing'), {
        scroller: requiredElement('#scroller'),
      })?.sender,
    ).toBe('You');
  });

  it('prefers measurable incoming geometry over nested outgoing flex', () => {
    document.body.innerHTML = `
      <div id="scroller">
        <div id="incoming">
          <div role="group">
            <div style="display:flex;align-items:flex-end;justify-content:flex-end">
              <div style="display:flex;align-items:center;flex-direction:row-reverse">
                <div dir="auto">incoming-with-reaction-layout</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    const scroller = requiredElement('#scroller');
    const content = requiredElement('[dir="auto"]');
    Object.defineProperty(scroller, 'getBoundingClientRect', {
      value: () => rect(0, 1_000),
    });
    Object.defineProperty(content, 'getBoundingClientRect', {
      value: () => rect(100, 200),
    });

    expect(parseMessage(requiredElement('#incoming'), { scroller })?.sender).toBe(
      'Unknown',
    );
  });

  it('does not treat an incoming media card alignment as outgoing', () => {
    document.body.innerHTML = `
      <div id="scroller">
        <div id="incoming">
          <div role="group">
            <div style="display:flex;align-items:flex-end;justify-content:flex-start">
              <div style="display:flex;align-items:flex-end;justify-content:flex-end">
                <div style="display:flex;align-items:center;flex-direction:row-reverse;justify-content:flex-start">
                  <img alt="image" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    expect(
      parseMessage(requiredElement('#incoming'), {
        scroller: requiredElement('#scroller'),
      })?.sender,
    ).toBe('Unknown');
  });

  it('backfills an ambiguous structural media card from a following outgoing message', () => {
    document.body.innerHTML = `
      <div id="scroller"><div>
        <div>
          <div role="group">
            <div style="display:flex;align-items:flex-end;justify-content:flex-end">
              <div style="display:flex;align-items:center;flex-direction:row-reverse;justify-content:flex-start">
                <img alt="image" />
              </div>
            </div>
          </div>
        </div>
        <div>
          <div role="group">
            <div style="display:flex;align-items:flex-end;justify-content:flex-end">
              <div style="display:flex;align-items:center;flex-direction:row-reverse;justify-content:flex-start">
                <div dir="auto">following-message</div>
              </div>
            </div>
          </div>
        </div>
        <div></div><div></div><div></div>
      </div></div>
    `;

    expect(
      parseMountedWindow(requiredElement('#scroller')).messages.map(
        ({ sender }) => sender,
      ),
    ).toEqual(['You', 'You']);
  });

  it('parses shared posts structurally without a redundant media marker', () => {
    loadFixture('special-messages');

    expect(parseMessage(requiredElement('#shared-full'))?.content).toEqual({
      type: 'shared-post',
      source: 'source.account',
      caption: 'First line\nSecond line',
    });
    expect(parseMessage(requiredElement('#shared-source-only'))?.content).toEqual({
      type: 'shared-post',
      source: 'source.only',
    });
    expect(parseMessage(requiredElement('#shared-caption-only'))?.content).toEqual({
      type: 'shared-post',
      caption: 'Caption without a visible source',
    });
  });

  it('keeps shared-post signatures stable when sender evidence changes', () => {
    loadFixture('special-messages');
    const incoming = parseMessage(requiredElement('#shared-full'));
    const clone = requiredElement('#shared-full').cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-label', 'Sent by you');
    clone.querySelector('[aria-label="Sender"]')?.remove();

    expect(incoming?.signature).toBe(parseMessage(clone)?.signature);
  });

  it('extracts a Meta AI answer instead of its presentation badge', () => {
    loadFixture('special-messages');

    expect(parseMessage(requiredElement('#meta-answer'))?.content).toEqual({
      type: 'text',
      text: 'A substantive answer.\nSecond paragraph.',
    });
    expect(parseMessage(requiredElement('#meta-badge-only'))).toBeNull();
  });

  it('does not use a profile nested in a shared card as the outer sender', () => {
    document.body.innerHTML = `
      <div id="scroller">
        <div id="message">
          <div role="group">
            <div style="display:flex;align-items:flex-end;justify-content:flex-end">
              <div style="display:flex;align-items:center;flex-direction:row-reverse">
                <div role="button" data-shared-post-card>
                  <a href="/nested.source/" aria-label="Profile of nested.source">
                    <img alt="user-profile-picture" />
                  </a>
                  <a href="/p/nested-post/"><img alt="Photo" /></a>
                  <div dir="auto">Nested caption</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    expect(
      parseMessage(requiredElement('#message'), {
        scroller: requiredElement('#scroller'),
      })?.sender,
    ).toBe('You');
  });

  it('leaves an incoming card ambiguous instead of using its nested profile', () => {
    document.body.innerHTML = `
      <div id="scroller">
        <div id="message">
          <div role="group">
            <div style="display:flex;align-items:flex-end;justify-content:flex-start">
              <div role="button" data-shared-post-card>
                <a href="/nested.source/" aria-label="Profile of nested.source">
                  <img alt="user-profile-picture" />
                </a>
                <a href="/reel/nested-reel/"><video></video></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    expect(
      parseMessage(requiredElement('#message'), {
        scroller: requiredElement('#scroller'),
      })?.sender,
    ).toBe('Unknown');
  });

  it('does not treat a message-level user avatar as message media', () => {
    document.body.innerHTML = `
      <div id="scroller">
        <div id="message">
          <div role="group">
            <div>
              <div style="display:flex;flex-direction:column">
                <div style="display:flex;align-items:flex-end;justify-content:flex-end">
                  <div style="display:flex;align-items:center;flex-direction:row-reverse">
                    <div role="presentation">
                      <span dir="auto">Outgoing text</span>
                    </div>
                  </div>
                </div>
                <div role="button">
                  <img alt="Avatar del usuario" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    expect(
      parseMessage(requiredElement('#message'), {
        scroller: requiredElement('#scroller'),
      }),
    ).toMatchObject({
      sender: 'You',
      content: { type: 'text', text: 'Outgoing text' },
    });
  });
});

function loadFixture(name: 'group' | 'individual' | 'special-messages'): void {
  document.body.innerHTML = readFileSync(
    `tests/fixtures/instagram/${name}.html`,
    'utf8',
  );
}

function requiredScroller(): HTMLElement {
  const scroller = findMessageScroller(document);
  if (!scroller) throw new Error('Fixture message scroller not found');
  return scroller;
}

function requiredElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing test element: ${selector}`);
  return element;
}

function rect(left: number, width: number): DOMRect {
  return {
    x: left,
    y: 0,
    left,
    right: left + width,
    top: 0,
    bottom: 20,
    width,
    height: 20,
    toJSON: () => ({}),
  };
}

function mountCurrentDomShape(): void {
  document.body.innerHTML = `
    <main>
      <div style="display:flex;flex-direction:column-reverse;overflow-y:scroll">
        <div><div>
          <div></div><div></div><div></div><div></div>
          <div data-current-message>
            <div><div role="group">
              <a href="/person-current/" aria-label="Open the profile page of Person Current">
                <img alt="user-profile-picture" />
              </a>
              <span dir="auto">Person Current replied</span>
              <div role="button"><div>earlier-message</div></div>
              <span dir="auto"><div dir="auto">current-message</div></span>
              <div>
                <span><div role="button"></div></span>
                <span><div role="button"></div></span>
                <span><div role="button" data-current-menu-trigger></div></span>
              </div>
            </div></div>
          </div>
        </div></div>
      </div>
    </main>
  `;
}

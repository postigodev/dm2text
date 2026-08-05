import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findMessageRoot, findMessageScroller } from './discovery';
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
});

function loadFixture(name: 'group' | 'individual'): void {
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

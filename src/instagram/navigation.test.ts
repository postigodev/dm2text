import { describe, expect, it, vi } from 'vitest';
import { watchDirectRouteExit } from './navigation';

describe('watchDirectRouteExit', () => {
  it('reports a popstate route exit once', () => {
    history.replaceState({}, '', '/direct/t/example/');
    const controller = new AbortController();
    const onExit = vi.fn();
    const teardown = watchDirectRouteExit(controller.signal, onExit);

    history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(onExit).toHaveBeenCalledTimes(1);
    teardown();
  });

  it('detects client-side navigation when the active DOM mutates', async () => {
    history.replaceState({}, '', '/direct/t/example/');
    const controller = new AbortController();
    const onExit = vi.fn();
    watchDirectRouteExit(controller.signal, onExit);

    history.pushState({}, '', '/explore/');
    document.body.append(document.createElement('div'));
    await Promise.resolve();

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('removes its listener and observer on abort or manual teardown', async () => {
    history.replaceState({}, '', '/direct/t/example/');
    const controller = new AbortController();
    const onExit = vi.fn();
    const teardown = watchDirectRouteExit(controller.signal, onExit);

    controller.abort();
    history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    document.body.append(document.createElement('div'));
    await Promise.resolve();
    teardown();

    expect(onExit).not.toHaveBeenCalled();
  });
});

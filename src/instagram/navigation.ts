export function watchDirectRouteExit(
  signal: AbortSignal,
  onExit: () => void,
): () => void {
  let active = true;

  const teardown = (): void => {
    if (!active) return;
    active = false;
    observer.disconnect();
    window.removeEventListener('popstate', checkRoute);
    signal.removeEventListener('abort', teardown);
  };
  const checkRoute = (): void => {
    if (!active || location.pathname.startsWith('/direct/')) return;
    teardown();
    onExit();
  };
  const observer = new MutationObserver(checkRoute);

  if (signal.aborted) {
    active = false;
    return teardown;
  }

  window.addEventListener('popstate', checkRoute);
  signal.addEventListener('abort', teardown, { once: true });
  observer.observe(document.body, { childList: true, subtree: true });

  return teardown;
}

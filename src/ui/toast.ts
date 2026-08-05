export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export function showToast(message: string, kind: ToastKind): void {
  const host = document.createElement('div');
  host.className = 'dm2text-root';
  const shadow = host.attachShadow({ mode: 'open' });
  const toast = document.createElement('div');
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.setAttribute('data-kind', kind);
  toast.setAttribute('data-dm2text-toast', '');
  const indicator = document.createElement('span');
  indicator.setAttribute('data-dm2text-indicator', '');
  indicator.setAttribute('aria-hidden', 'true');
  const copy = document.createElement('span');
  copy.setAttribute('data-dm2text-message', '');
  copy.textContent = message;
  toast.append(indicator, copy);
  const style = document.createElement('style');
  style.textContent = `
    :host {
      --dm-toast: #ffffff;
      --dm-toast-text: #202124;
      --dm-toast-border: rgb(16 17 20 / 12%);
      --dm-info: #0095f6;
      --dm-success: #2e8b57;
      --dm-warning: #b36b00;
      --dm-error: #c6283c;
      color: var(--dm-toast-text);
      font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --dm-toast: #24262c;
        --dm-toast-text: #f5f5f7;
        --dm-toast-border: rgb(255 255 255 / 12%);
        --dm-success: #65b884;
        --dm-warning: #e2a84f;
        --dm-error: #ff7b8b;
      }
    }

    *, *::before, *::after { box-sizing: border-box; }

    [data-dm2text-toast] {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: min(360px, calc(100vw - 32px));
      min-height: 42px;
      padding: 10px 13px;
      border: 1px solid var(--dm-toast-border);
      border-radius: 11px;
      color: var(--dm-toast-text);
      background: var(--dm-toast);
      box-shadow: 0 10px 30px rgb(0 0 0 / 24%);
      cursor: pointer;
      animation: dm-toast-in 140ms cubic-bezier(.2, .8, .2, 1);
    }

    [data-dm2text-indicator] {
      width: 7px;
      height: 7px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--dm-info);
    }

    [data-kind="success"] [data-dm2text-indicator] {
      background: var(--dm-success);
    }

    [data-kind="warning"] [data-dm2text-indicator] {
      background: var(--dm-warning);
    }

    [data-kind="error"] [data-dm2text-indicator] {
      background: var(--dm-error);
    }

    [data-dm2text-message] { overflow-wrap: anywhere; }

    @keyframes dm-toast-in {
      from { opacity: 0; transform: translateY(5px); }
    }

    @media (prefers-reduced-motion: reduce) {
      [data-dm2text-toast] { animation: none; }
    }
  `;
  shadow.append(style, toast);
  document.body.append(host);

  const remove = (): void => host.remove();
  toast.addEventListener('click', remove, { once: true });
  window.setTimeout(remove, 4_000);
}

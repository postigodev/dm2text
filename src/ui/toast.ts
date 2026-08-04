export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export function showToast(message: string, kind: ToastKind): void {
  const host = document.createElement('div');
  host.className = 'dm2text-root';
  const shadow = host.attachShadow({ mode: 'open' });
  const toast = document.createElement('div');
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  toast.setAttribute('data-kind', kind);
  toast.textContent = message;
  const style = document.createElement('style');
  style.textContent = `
    :host { color: #fff; font: 14px/1.4 system-ui, sans-serif; }
    div {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      max-width: min(360px, calc(100vw - 32px));
      padding: 10px 14px;
      border-radius: 8px;
      background: #262626;
      box-shadow: 0 8px 24px rgb(0 0 0 / 35%);
    }
    [data-kind="warning"] { background: #7a4b00; }
    [data-kind="error"] { background: #8a1c1c; }
    [data-kind="success"] { background: #176b37; }
  `;
  shadow.append(style, toast);
  document.body.append(host);

  const remove = (): void => host.remove();
  toast.addEventListener('click', remove, { once: true });
  window.setTimeout(remove, 4_000);
}

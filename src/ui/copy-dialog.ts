export interface CopySessionDialog {
  readonly signal: AbortSignal;
  requestCount(): Promise<number | null>;
  updateProgress(collected: number, requested: number): void;
  confirmPartial(
    available: number,
    requested: number,
    reason: 'beginning' | 'stalled',
  ): Promise<boolean>;
  close(): void;
}

export function createCopySessionDialog(): CopySessionDialog {
  const controller = new AbortController();
  const host = document.createElement('div');
  host.className = 'dm2text-root';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = DIALOG_STYLES;
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Copy context');
  shadow.append(style, panel);
  document.body.append(host);

  let closed = false;
  let cancelPending: (() => void) | null = null;

  const abortSession = (): void => {
    if (!controller.signal.aborted) controller.abort();
    cancelPending?.();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    abortSession();
  };
  document.addEventListener('keydown', onKeyDown);

  const requestCount = (): Promise<number | null> => {
    if (controller.signal.aborted || closed) return Promise.resolve(null);

    cancelPending?.();
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: number | null): void => {
        if (settled) return;
        settled = true;
        cancelPending = null;
        resolve(value);
      };
      cancelPending = () => finish(null);
      renderCountForm(panel, finish, abortSession);
    });
  };

  const updateProgress = (collected: number, requested: number): void => {
    if (closed) return;
    cancelPending?.();
    renderProgress(panel, collected, requested, abortSession);
  };

  const confirmPartial = (
    available: number,
    requested: number,
    reason: 'beginning' | 'stalled',
  ): Promise<boolean> => {
    void reason;
    if (controller.signal.aborted || closed) return Promise.resolve(false);

    cancelPending?.();
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: boolean): void => {
        if (settled) return;
        settled = true;
        cancelPending = null;
        resolve(value);
      };
      cancelPending = () => finish(false);
      renderPartialConfirmation(
        panel,
        available,
        requested,
        finish,
        abortSession,
      );
    });
  };

  const close = (): void => {
    if (closed) return;
    closed = true;
    abortSession();
    document.removeEventListener('keydown', onKeyDown);
    host.remove();
  };

  return {
    signal: controller.signal,
    requestCount,
    updateProgress,
    confirmPartial,
    close,
  };
}

function renderCountForm(
  panel: HTMLElement,
  finish: (count: number | null) => void,
  cancel: () => void,
): void {
  const title = heading();
  const form = document.createElement('form');
  form.noValidate = true;
  const label = document.createElement('label');
  label.textContent = 'How many messages?';
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.max = '999';
  input.step = '1';
  input.required = true;
  const error = document.createElement('p');
  error.setAttribute('data-dm2text-error', '');
  error.setAttribute('aria-live', 'polite');
  const actions = actionRow(
    button('Copy', 'submit'),
    cancelButton(cancel),
  );

  label.append(input);
  form.append(label, error, actions);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const count = parseCount(input.value);
    if (count === null) {
      error.textContent = 'Enter a whole number from 1 to 999.';
      return;
    }

    error.textContent = '';
    finish(count);
  });
  panel.replaceChildren(title, form);
  input.focus();
}

function renderProgress(
  panel: HTMLElement,
  collected: number,
  requested: number,
  cancel: () => void,
): void {
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = `Collecting ${collected} of ${requested}…`;
  panel.replaceChildren(heading(), status, actionRow(cancelButton(cancel)));
}

function renderPartialConfirmation(
  panel: HTMLElement,
  available: number,
  requested: number,
  finish: (confirmed: boolean) => void,
  cancel: () => void,
): void {
  const message = document.createElement('p');
  message.textContent =
    `Found only ${available} of ${requested} messages. ` +
    'Copy the available messages?';
  const copyAvailable = button(`Copy ${available}`, 'button');
  copyAvailable.addEventListener('click', () => finish(true));
  panel.replaceChildren(
    heading(),
    message,
    actionRow(copyAvailable, cancelButton(cancel)),
  );
}

function heading(): HTMLHeadingElement {
  const title = document.createElement('h2');
  title.textContent = 'Copy context';
  return title;
}

function cancelButton(cancel: () => void): HTMLButtonElement {
  const cancelAction = button('Cancel', 'button');
  cancelAction.addEventListener('click', cancel);
  return cancelAction;
}

function actionRow(...buttons: HTMLButtonElement[]): HTMLElement {
  const row = document.createElement('div');
  row.className = 'actions';
  row.append(...buttons);
  return row;
}

function button(
  text: string,
  type: 'button' | 'submit',
): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = type;
  element.textContent = text;
  return element;
}

function parseCount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/u.test(trimmed)) return null;

  const count = Number(trimmed);
  return count >= 1 && count <= 999 ? count : null;
}

const DIALOG_STYLES = `
  :host {
    color: #f5f5f5;
    font-family: system-ui, sans-serif;
  }

  section {
    position: fixed;
    inset: 50% auto auto 50%;
    z-index: 2147483647;
    width: min(360px, calc(100vw - 32px));
    padding: 20px;
    border: 1px solid #363636;
    border-radius: 12px;
    background: #181818;
    box-shadow: 0 16px 48px rgb(0 0 0 / 45%);
    transform: translate(-50%, -50%);
  }

  h2, p { margin: 0 0 16px; }
  label { display: grid; gap: 8px; }
  input, button { font: inherit; }
  input { padding: 8px; }
  [data-dm2text-error] { min-height: 1.5em; color: #ff8a8a; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  button { padding: 8px 12px; cursor: pointer; }
`;

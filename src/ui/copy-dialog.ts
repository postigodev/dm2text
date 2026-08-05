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
  const scrim = document.createElement('div');
  scrim.setAttribute('data-dm2text-scrim', '');
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'dm2text-dialog-title');
  scrim.append(panel);
  shadow.append(style, scrim);
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
  const form = document.createElement('form');
  form.noValidate = true;
  const label = document.createElement('label');
  label.textContent = 'Messages to include';
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
    cancelButton(cancel),
    button('Copy', 'submit', 'primary'),
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
  renderState(panel, 'count', contextProgress(0, 1, true), form);
  input.focus();
}

function renderProgress(
  panel: HTMLElement,
  collected: number,
  requested: number,
  cancel: () => void,
): void {
  renderState(
    panel,
    'progress',
    contextProgress(collected, requested),
    progressCopy(collected, requested),
    actionRow(cancelButton(cancel)),
  );
}

function renderPartialConfirmation(
  panel: HTMLElement,
  available: number,
  requested: number,
  finish: (confirmed: boolean) => void,
  cancel: () => void,
): void {
  const message = document.createElement('p');
  message.className = 'partial-copy';
  message.textContent =
    `Found only ${available} of ${requested} messages. ` +
    'Copy the available messages?';
  const copyAvailable = button(`Copy ${available}`, 'button', 'primary');
  copyAvailable.addEventListener('click', () => finish(true));
  renderState(
    panel,
    'partial',
    contextProgress(available, requested),
    message,
    actionRow(cancelButton(cancel), copyAvailable),
  );
}

type DialogState = 'count' | 'progress' | 'partial';

function renderState(
  panel: HTMLElement,
  state: DialogState,
  ...content: Node[]
): void {
  panel.setAttribute('data-dm2text-state', state);
  panel.replaceChildren(dialogHeader(), ...content);
}

function dialogHeader(): HTMLElement {
  const header = document.createElement('header');
  const copy = document.createElement('div');
  const title = document.createElement('h2');
  title.id = 'dm2text-dialog-title';
  title.textContent = 'Copy context';
  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.textContent = 'Ends at the selected message';
  const anchor = document.createElement('span');
  anchor.className = 'anchor-glyph';
  anchor.setAttribute('aria-hidden', 'true');
  anchor.textContent = '⌁';
  copy.append(title, subtitle);
  header.append(copy, anchor);
  return header;
}

function contextProgress(
  current: number,
  requested: number,
  decorative = false,
): HTMLElement {
  const safeMaximum = Math.max(1, requested);
  const clamped = Math.min(Math.max(0, current), safeMaximum);
  const wrapper = document.createElement('div');
  wrapper.className = 'context-progress';
  const history = document.createElement('span');
  history.className = 'context-endpoint history-endpoint';
  history.setAttribute('aria-hidden', 'true');
  const progress = document.createElement('progress');
  progress.setAttribute('data-dm2text-progress', '');
  if (decorative) {
    progress.setAttribute('aria-hidden', 'true');
  } else {
    progress.setAttribute(
      'aria-label',
      `Collected ${current} of ${requested} messages`,
    );
  }
  progress.max = safeMaximum;
  progress.value = clamped;
  const anchor = document.createElement('span');
  anchor.className = 'context-endpoint anchor-endpoint';
  anchor.setAttribute('aria-hidden', 'true');
  wrapper.append(history, progress, anchor);
  return wrapper;
}

function progressCopy(current: number, requested: number): HTMLElement {
  const status = document.createElement('p');
  status.className = 'progress-copy';
  status.setAttribute('role', 'status');
  status.textContent = `${current} of ${requested} messages`;
  return status;
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
  variant: 'primary' | 'secondary' = 'secondary',
): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = type;
  element.setAttribute('data-variant', variant);
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
    --dm-scrim: rgb(0 0 0 / 18%);
    --dm-panel: #ffffff;
    --dm-control: #f2f3f5;
    --dm-text: #101114;
    --dm-text-secondary: #5f636d;
    --dm-text-muted: #858a94;
    --dm-border: rgb(16 17 20 / 12%);
    --dm-border-emphasis: rgb(16 17 20 / 22%);
    --dm-action: #0095f6;
    --dm-action-active: #1877f2;
    --dm-error: #c6283c;
    color: var(--dm-text);
    font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --dm-scrim: rgb(0 0 0 / 42%);
      --dm-panel: #191b20;
      --dm-control: #101217;
      --dm-text: #f5f5f7;
      --dm-text-secondary: #c7c9cf;
      --dm-text-muted: #989ca6;
      --dm-border: rgb(255 255 255 / 11%);
      --dm-border-emphasis: rgb(255 255 255 / 20%);
      --dm-error: #ff7b8b;
    }
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  [data-dm2text-scrim] {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: grid;
    place-items: center;
    padding: 16px;
    background: var(--dm-scrim);
  }

  section {
    width: min(360px, 100%);
    padding: 20px;
    border: 1px solid var(--dm-border);
    border-radius: 16px;
    color: var(--dm-text);
    background: var(--dm-panel);
    box-shadow: 0 18px 48px rgb(0 0 0 / 28%);
    animation: dm-panel-in 140ms cubic-bezier(.2, .8, .2, 1);
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 650;
    letter-spacing: -.01em;
  }

  p { margin: 0; }

  .subtitle {
    margin-top: 2px;
    color: var(--dm-text-muted);
    font-size: 12px;
  }

  .anchor-glyph {
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    flex: 0 0 auto;
    border: 1px solid var(--dm-border);
    border-radius: 50%;
    color: var(--dm-text-muted);
  }

  .context-progress {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 18px 0 16px;
  }

  .context-endpoint {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--dm-border-emphasis);
  }

  .anchor-endpoint { background: var(--dm-action); }

  progress {
    width: 100%;
    height: 2px;
    overflow: hidden;
    border: 0;
    border-radius: 999px;
    background: var(--dm-border);
  }

  progress::-webkit-progress-bar { background: var(--dm-border); }
  progress::-webkit-progress-value { background: var(--dm-action); }
  progress::-moz-progress-bar { background: var(--dm-action); }

  form, label { display: grid; }

  label {
    gap: 7px;
    color: var(--dm-text-secondary);
    font-size: 12px;
    font-weight: 600;
  }

  input, button { font: inherit; }

  input {
    width: 100%;
    height: 40px;
    padding: 0 11px;
    border: 1px solid var(--dm-border);
    border-radius: 9px;
    outline: 0;
    color: var(--dm-text);
    background: var(--dm-control);
    font-variant-numeric: tabular-nums;
  }

  input:hover { border-color: var(--dm-border-emphasis); }

  input:focus-visible {
    border-color: var(--dm-action);
    box-shadow: 0 0 0 3px rgb(0 149 246 / 20%);
  }

  [data-dm2text-error] {
    min-height: 18px;
    margin-top: 5px;
    color: var(--dm-error);
    font-size: 12px;
    font-weight: 500;
  }

  .progress-copy, .partial-copy { color: var(--dm-text-secondary); }

  .actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    margin-top: 18px;
  }

  button {
    min-height: 36px;
    padding: 8px 13px;
    border: 0;
    border-radius: 9px;
    cursor: pointer;
    color: var(--dm-text-secondary);
    background: transparent;
    font-weight: 650;
  }

  button:hover { background: var(--dm-control); }
  button:active { transform: translateY(1px); }

  button:focus-visible {
    outline: 3px solid rgb(0 149 246 / 28%);
    outline-offset: 2px;
  }

  button[data-variant="primary"] {
    color: #fff;
    background: var(--dm-action);
  }

  button[data-variant="primary"]:hover { background: var(--dm-action-active); }
  button:disabled { cursor: default; opacity: .5; }

  @keyframes dm-panel-in {
    from { opacity: 0; transform: translateY(5px); }
  }

  @media (prefers-reduced-motion: reduce) {
    section { animation: none; }
    button:active { transform: none; }
  }
`;

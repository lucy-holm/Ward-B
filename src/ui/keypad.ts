// Self-contained staff keypad overlay. Builds its own DOM + styles, so it
// can be dropped into any room script without touching index.html/style.css.
// Visual language matches the HUD (dark translucent panels, mono, teal
// accent) but is namespaced under `wardb-kp-*` so it can't collide.

export interface KeypadOptions {
  code: string;
  onSuccess: () => void;
  onClose: () => void;
  // Fired each time a 4-digit entry is wrong, before the buffer resets.
  onDenied?: () => void;
}

const STYLE_ID = 'wardb-kp-style';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .wardb-kp-overlay {
      position: fixed; inset: 0; z-index: 40; display: flex;
      align-items: center; justify-content: center;
      background: rgba(3, 5, 5, 0.82);
      font-family: "SF Mono", "Cascadia Mono", Consolas, Menlo, monospace;
      color: #e9f2ef;
    }
    .wardb-kp-pad {
      background: #0d1412; border: 1px solid rgba(159, 216, 203, 0.35);
      border-radius: 3px; padding: 22px 24px; text-align: center;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
    }
    .wardb-kp-head {
      font-size: 10px; letter-spacing: 0.28em; opacity: 0.7;
      margin-bottom: 14px; text-indent: 0.28em;
    }
    .wardb-kp-display {
      font-size: 26px; letter-spacing: 0.5em; text-indent: 0.5em;
      color: #9fd8cb; height: 38px; margin-bottom: 14px;
      border-bottom: 1px solid rgba(159, 216, 203, 0.25);
    }
    .wardb-kp-grid {
      display: grid; grid-template-columns: repeat(3, 64px); gap: 8px;
    }
    .wardb-kp-key {
      pointer-events: auto; cursor: pointer; height: 52px;
      background: #101b18; border: 1px solid rgba(159, 216, 203, 0.25);
      color: #e9f2ef; font-family: inherit; font-size: 18px; border-radius: 2px;
    }
    .wardb-kp-key:active { background: rgba(159, 216, 203, 0.2); }
    .wardb-kp-key.wardb-kp-exit { color: #ff3b30; border-color: rgba(255, 59, 48, 0.35); }
    .wardb-kp-msg {
      margin-top: 12px; font-size: 10px; letter-spacing: 0.2em; opacity: 0.65; height: 14px;
    }
    .wardb-kp-msg.wardb-kp-denied { color: #ff3b30; opacity: 1; }
    .wardb-kp-msg.wardb-kp-granted { color: #9fd8cb; opacity: 1; }
  `;
  document.head.appendChild(style);
}

let activeOverlay: HTMLElement | null = null;
let activeEscHandler: ((e: KeyboardEvent) => void) | null = null;

function teardown(): void {
  if (activeOverlay) {
    activeOverlay.remove();
    activeOverlay = null;
  }
  if (activeEscHandler) {
    document.removeEventListener('keydown', activeEscHandler);
    activeEscHandler = null;
  }
}

export function openKeypad(opts: KeypadOptions): void {
  injectStyles();
  teardown(); // only one instance at a time

  const overlay = document.createElement('div');
  overlay.className = 'wardb-kp-overlay';

  const pad = document.createElement('div');
  pad.className = 'wardb-kp-pad';

  const head = document.createElement('div');
  head.className = 'wardb-kp-head';
  head.textContent = 'STAFF ACCESS — WING B';

  const display = document.createElement('div');
  display.className = 'wardb-kp-display';

  const grid = document.createElement('div');
  grid.className = 'wardb-kp-grid';

  const msg = document.createElement('div');
  msg.className = 'wardb-kp-msg';

  let buf = '';
  let locked = false; // ignore input while showing DENIED/GRANTED

  const render = (): void => {
    display.textContent = buf.split('').join(' ');
  };

  const close = (): void => {
    teardown();
    opts.onClose();
  };

  const submit = (): void => {
    locked = true;
    if (buf === opts.code) {
      msg.textContent = 'ACCESS GRANTED';
      msg.className = 'wardb-kp-msg wardb-kp-granted';
      setTimeout(() => {
        opts.onSuccess();
        close();
      }, 500);
    } else {
      msg.textContent = 'DENIED';
      msg.className = 'wardb-kp-msg wardb-kp-denied';
      opts.onDenied?.();
      setTimeout(() => {
        buf = '';
        render();
        msg.textContent = 'STAFF ACCESS — WING B';
        msg.className = 'wardb-kp-msg';
        locked = false;
      }, 600);
    }
  };

  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '×'];
  labels.forEach((label) => {
    const btn = document.createElement('button');
    btn.className = 'wardb-kp-key';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (locked) return;
      if (label === 'C') {
        buf = '';
        render();
        return;
      }
      if (label === '×') {
        close();
        return;
      }
      if (buf.length >= 4) return;
      buf += label;
      render();
      if (buf.length === 4) submit();
    });
    if (label === '×') btn.classList.add('wardb-kp-exit');
    grid.appendChild(btn);
  });

  pad.appendChild(head);
  pad.appendChild(display);
  pad.appendChild(grid);
  pad.appendChild(msg);
  overlay.appendChild(pad);
  document.body.appendChild(overlay);

  activeOverlay = overlay;
  msg.textContent = 'STAFF ACCESS — WING B';
  render();

  activeEscHandler = (e: KeyboardEvent) => {
    if (e.code === 'Escape') close();
  };
  document.addEventListener('keydown', activeEscHandler);
}

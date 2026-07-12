import { TUNING } from '../tuning';

// Ported from v0.1: pointer-lock mouse look with a click-drag fallback for
// browsers/contexts where pointer lock is unavailable, plus a touch stick +
// touch look + on-screen buttons for mobile. Look deltas are handed back as
// raw pixels (touch pre-scaled) — Player applies TUNING.player.lookSensitivity
// so both input paths share one sensitivity curve.
export class Input {
  readonly isTouch: boolean;
  enabled = false;
  onInteract: (() => void) | null = null;
  onShift: (() => void) | null = null;

  private canvas: HTMLElement;
  private keys: Record<string, boolean> = {};

  private plActive = false;
  private dragging = false;
  private dragLastX = 0;
  private dragLastY = 0;

  private lookDX = 0;
  private lookDY = 0;

  private stickEl: HTMLElement | null;
  private nubEl: HTMLElement | null;
  private moveTouch: number | null = null;
  private lookTouch: number | null = null;
  private stickVec = { x: 0, y: 0 };
  private stickBase = { x: 0, y: 0 };
  private touchLookLastX = 0;
  private touchLookLastY = 0;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    this.isTouch = 'ontouchstart' in window && matchMedia('(pointer:coarse)').matches;
    if (this.isTouch) document.body.classList.add('touch');

    this.stickEl = document.getElementById('stick');
    this.nubEl = document.getElementById('nub');

    this.bindKeyboard();
    this.bindMouse();
    this.bindTouch();
    this.bindButtons();
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (!this.enabled) return;
      if (e.code === 'KeyE') this.onInteract?.();
      if (e.code === 'KeyQ') this.onShift?.();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  private bindMouse(): void {
    this.canvas.addEventListener('click', () => {
      if (!this.enabled || this.isTouch) return;
      if (!this.plActive) {
        try {
          this.canvas.requestPointerLock();
        } catch {
          // ignore — pointer lock unavailable, drag fallback still works
        }
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.plActive = document.pointerLockElement === this.canvas;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.plActive) {
        this.lookDX += e.movementX;
        this.lookDY += e.movementY;
      } else if (this.dragging) {
        this.lookDX += e.clientX - this.dragLastX;
        this.lookDY += e.clientY - this.dragLastY;
        this.dragLastX = e.clientX;
        this.dragLastY = e.clientY;
      }
    });
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.plActive) {
        this.dragging = true;
        this.dragLastX = e.clientX;
        this.dragLastY = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });
  }

  private bindTouch(): void {
    window.addEventListener(
      'touchstart',
      (e) => {
        if (!this.enabled) return;
        for (const t of Array.from(e.changedTouches)) {
          const target = t.target as HTMLElement | null;
          if (target?.closest && (target.closest('.tbtn') || target.closest('.overlay'))) continue;
          if (t.clientX < window.innerWidth * 0.45 && this.moveTouch === null) {
            this.moveTouch = t.identifier;
            const r = this.stickEl?.getBoundingClientRect();
            this.stickBase = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
          } else if (this.lookTouch === null) {
            this.lookTouch = t.identifier;
            this.touchLookLastX = t.clientX;
            this.touchLookLastY = t.clientY;
          }
        }
      },
      { passive: true },
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === this.moveTouch) {
            let dx = t.clientX - this.stickBase.x;
            let dy = t.clientY - this.stickBase.y;
            const m = Math.hypot(dx, dy);
            const max = 48;
            if (m > max) {
              dx *= max / m;
              dy *= max / m;
            }
            this.stickVec = { x: dx / max, y: dy / max };
            if (this.nubEl) this.nubEl.style.transform = `translate(${dx}px,${dy}px)`;
          } else if (t.identifier === this.lookTouch) {
            const dx = (t.clientX - this.touchLookLastX) * TUNING.player.touchLookScale;
            const dy = (t.clientY - this.touchLookLastY) * TUNING.player.touchLookScale;
            this.lookDX += dx;
            this.lookDY += dy;
            this.touchLookLastX = t.clientX;
            this.touchLookLastY = t.clientY;
          }
        }
      },
      { passive: true },
    );

    const touchEnd = (e: TouchEvent): void => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.moveTouch) {
          this.moveTouch = null;
          this.stickVec = { x: 0, y: 0 };
          if (this.nubEl) this.nubEl.style.transform = '';
        }
        if (t.identifier === this.lookTouch) this.lookTouch = null;
      }
    };
    window.addEventListener('touchend', touchEnd);
    window.addEventListener('touchcancel', touchEnd);
  }

  private bindButtons(): void {
    document.getElementById('btnAct')?.addEventListener('click', () => {
      if (this.enabled) this.onInteract?.();
    });
    document.getElementById('btnShift')?.addEventListener('click', () => {
      if (this.enabled) this.onShift?.();
    });
  }

  moveAxes(): { f: number; s: number } {
    if (!this.enabled) return { f: 0, s: 0 };
    let f = 0;
    let s = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) f += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) f -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) s -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) s += 1;
    f += -this.stickVec.y;
    s += this.stickVec.x;
    const mag = Math.hypot(f, s);
    if (mag > 0) {
      f /= Math.max(1, mag);
      s /= Math.max(1, mag);
    }
    return { f, s };
  }

  consumeLook(): { dx: number; dy: number } {
    const out = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0;
    this.lookDY = 0;
    return out;
  }

  releasePointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

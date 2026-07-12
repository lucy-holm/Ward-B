import type { WardState } from '../rooms/types';

// Direct DOM HUD driver — no framework, mirrors the v0.1 prototype.
export class Hud {
  private stateChip: HTMLElement;
  private objective: HTMLElement;
  private prompt: HTMLElement;
  private toastEl: HTMLElement;
  private pills: HTMLElement;
  private pillPopupEl: HTMLElement;
  private vignette: HTMLElement;
  private shiftFx: HTMLElement;
  private startOverlay: HTMLElement;
  private startBtn: HTMLButtonElement;
  private genericOverlay: HTMLElement;
  private ovTitle: HTMLElement;
  private ovSub: HTMLElement;
  private ovCard: HTMLElement;
  private ovBtn: HTMLButtonElement;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  // Tracks the last count shown so setPills can tell a real change (gain or
  // spend) from a redundant call, and flash only when something happened.
  // -1 means "not yet shown" so the very first call never flashes.
  private prevPillCount = -1;

  constructor() {
    this.stateChip = this.byId('stateChip');
    this.objective = this.byId('objective');
    this.prompt = this.byId('prompt');
    this.toastEl = this.byId('toast');
    this.pills = this.byId('pills');
    this.pillPopupEl = this.byId('pillPopup');
    this.vignette = this.byId('vignette');
    this.shiftFx = this.byId('shiftFx');
    this.startOverlay = this.byId('startOverlay');
    this.startBtn = this.byId('startBtn') as HTMLButtonElement;
    this.genericOverlay = this.byId('genericOverlay');
    this.ovTitle = this.byId('ovTitle');
    this.ovSub = this.byId('ovSub');
    this.ovCard = this.byId('ovCard');
    this.ovBtn = this.byId('ovBtn') as HTMLButtonElement;
  }

  private byId(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Hud: missing #${id} element`);
    return el;
  }

  setState(state: WardState): void {
    const unmed = state === 'unmed';
    this.stateChip.textContent = unmed ? 'UNMEDICATED' : 'LUCID';
    this.stateChip.classList.toggle('unmed', unmed);
    this.vignette.classList.toggle('on', unmed);
  }

  setObjective(text: string): void {
    this.objective.textContent = text;
  }

  setPrompt(text: string | null): void {
    if (text === null) {
      this.prompt.style.display = 'none';
      return;
    }
    this.prompt.textContent = text;
    this.prompt.style.display = 'block';
  }

  toast(text: string, ms = 3200): void {
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = '1';
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.style.opacity = '0';
    }, ms);
  }

  setPills(n: number, max: number, visible: boolean): void {
    this.pills.style.display = visible ? 'flex' : 'none';
    if (!visible) {
      this.prevPillCount = -1; // hidden means "not shown"; next reveal shouldn't flash
      return;
    }
    const filled = Math.max(0, Math.min(max, n));
    let dots = '';
    for (let i = 0; i < max; i++) dots += `<span class="pillDot${i < filled ? ' filled' : ''}"></span>`;
    const fullTag = filled >= max ? '<span class="pillsFullTag">full</span>' : '';
    this.pills.innerHTML = `<span class="pillsLabel">pills</span><span class="pillsDots">${dots}</span>${fullTag}`;

    // spending or gaining a pill should always be felt, whichever call site triggered it
    if (this.prevPillCount !== -1 && n !== this.prevPillCount) this.pillsFlash();
    this.prevPillCount = n;
  }

  // Pops/pulses the pills HUD element — call whenever the count changes.
  pillsFlash(): void {
    this.pills.classList.remove('flash');
    void this.pills.offsetWidth; // restart the CSS animation
    this.pills.classList.add('flash');
  }

  // Unmissable center-screen line for the moment pills are gained, e.g. "+1 pill".
  pillPopup(text: string): void {
    this.pillPopupEl.textContent = text;
    this.pillPopupEl.classList.remove('show');
    void this.pillPopupEl.offsetWidth; // restart the CSS animation
    this.pillPopupEl.classList.add('show');
  }

  shiftPulse(): void {
    this.shiftFx.classList.remove('pulse');
    void this.shiftFx.offsetWidth; // restart the CSS animation
    this.shiftFx.classList.add('pulse');
  }

  showStart(onStart: () => void): void {
    this.startOverlay.style.display = 'flex';
    this.startBtn.onclick = () => {
      this.startOverlay.style.display = 'none';
      onStart();
    };
  }

  showEndCard(title: string, sub: string, cardHtml: string, btnLabel: string, onBtn: () => void): void {
    this.ovTitle.textContent = title;
    this.ovSub.textContent = sub;
    this.ovCard.innerHTML = cardHtml;
    this.ovBtn.textContent = btnLabel;
    this.ovBtn.onclick = onBtn;
    this.genericOverlay.style.display = 'flex';
  }

  hideOverlays(): void {
    this.startOverlay.style.display = 'none';
    this.genericOverlay.style.display = 'none';
  }
}

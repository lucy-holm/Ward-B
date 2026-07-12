import type { WardState } from '../rooms/types';

// Direct DOM HUD driver — no framework, mirrors the v0.1 prototype.
export class Hud {
  private stateChip: HTMLElement;
  private objective: HTMLElement;
  private prompt: HTMLElement;
  private toastEl: HTMLElement;
  private pills: HTMLElement;
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

  constructor() {
    this.stateChip = this.byId('stateChip');
    this.objective = this.byId('objective');
    this.prompt = this.byId('prompt');
    this.toastEl = this.byId('toast');
    this.pills = this.byId('pills');
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
    this.pills.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const filled = Math.max(0, Math.min(max, n));
    const dots: string[] = [];
    for (let i = 0; i < max; i++) dots.push(i < filled ? '●' : '○');
    this.pills.textContent = `PILLS ${dots.join(' ')}`;
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

import type { WardState } from '../rooms/types';

// Direct DOM HUD driver — no framework, mirrors the v0.1 prototype.
export class Hud {
  private stateChip: HTMLElement;
  private objective: HTMLElement;
  private prompt: HTMLElement;
  private toastEl: HTMLElement;
  private pills: HTMLElement;
  private pillPopupEl: HTMLElement;
  private medMeter: HTMLElement;
  private medMeterFill: HTMLElement;
  private vignette: HTMLElement;
  private shiftFx: HTMLElement;
  private threatVignette: HTMLElement;
  private threatEdgeL: HTMLElement;
  private threatEdgeR: HTMLElement;
  private threatLine: HTMLElement;
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
  // Tracks the last capacity shown, same -1-means-"not yet shown" convention
  // as prevPillCount, but kept separate: a capacity upgrade (room9's coat)
  // doesn't necessarily change the pill *count* (upgradeCapacity never tops
  // you up), so the ordinary flash-on-count-change above can silently miss
  // it — the dot just appears with no fanfare. setPills checks this
  // independently and pops the newly-added slot(s) whenever max grows.
  private prevMax = -1;

  // Threat presentation state — smoothed level plus threshold-crossing flags
  // so setThreat (called every frame) never touches classList/innerHTML
  // unless something actually crossed a boundary.
  private threatLevelCur = 0;
  private threatPulseOn = false;
  private threatLineOn = false;

  // Medication meter — tracks last visibility/warning so setMedication
  // (called every frame) only touches classList/display on a real change.
  private medVisible = false;
  private medWarnOn = false;

  constructor() {
    this.stateChip = this.byId('stateChip');
    this.objective = this.byId('objective');
    this.prompt = this.byId('prompt');
    this.toastEl = this.byId('toast');
    this.pills = this.byId('pills');
    this.pillPopupEl = this.byId('pillPopup');
    this.medMeter = this.byId('medMeter');
    this.medMeterFill = this.byId('medMeterFill');
    this.vignette = this.byId('vignette');
    this.shiftFx = this.byId('shiftFx');
    this.threatVignette = this.byId('threatVignette');
    this.threatEdgeL = this.byId('threatEdgeL');
    this.threatEdgeR = this.byId('threatEdgeR');
    this.threatLine = this.byId('threatLine');
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
      this.prevMax = -1; // same for capacity — next reveal shouldn't pop either
      return;
    }
    // Capacity growth is rare and one-time (room9's coat), so it's worth
    // marking BEFORE the DOM is rebuilt below: newSlotFrom is the first dot
    // index that didn't exist last time this was called (visible) with a
    // smaller max. -1 means "nothing new" — the ordinary case.
    const newSlotFrom = this.prevMax !== -1 && max > this.prevMax ? this.prevMax : -1;

    const filled = Math.max(0, Math.min(max, n));
    let dots = '';
    for (let i = 0; i < max; i++) {
      const cls = `pillDot${i < filled ? ' filled' : ''}${i >= newSlotFrom && newSlotFrom !== -1 ? ' new' : ''}`;
      dots += `<span class="${cls}"></span>`;
    }
    const fullTag = filled >= max ? '<span class="pillsFullTag">full</span>' : '';
    this.pills.innerHTML = `<span class="pillsLabel">pills</span><span class="pillsDots">${dots}</span>${fullTag}`;

    // spending or gaining a pill should always be felt, whichever call site triggered it
    if (this.prevPillCount !== -1 && n !== this.prevPillCount) this.pillsFlash();
    this.prevPillCount = n;
    this.prevMax = max;

    // A capacity increase gets its own loud, one-time treatment on top of
    // (or instead of) the ordinary flash above — the new dot needs to read
    // as "you now have a second slot", not just "the pill row twitched".
    // No CSS backing this (style.css isn't touched here): the pop is driven
    // entirely by inline styles/transitions set on the freshly-built
    // elements, so it's self-contained to this call and safe to fire
    // exactly once per growth, never per-frame.
    if (newSlotFrom !== -1) this.popNewPillSlots();
  }

  // Pops/pulses the pills HUD element — call whenever the count changes.
  pillsFlash(): void {
    this.pills.classList.remove('flash');
    void this.pills.offsetWidth; // restart the CSS animation
    this.pills.classList.add('flash');
  }

  // One-time "you have a new pocket" emphasis for a capacity increase: the
  // whole pill row gets the existing flash (loud, but says "something
  // changed", not "you gained a slot"), and every dot marked .new (just
  // built into innerHTML by setPills) gets an inline-driven pop — snaps in
  // small/dim, springs past full size with a bright glow, eases back to
  // rest — plus a slightly longer glow hang than the ordinary filled-dot
  // look so it's unmistakably the one that's different this time.
  private popNewPillSlots(): void {
    this.pillsFlash();
    const newDots = this.pills.querySelectorAll<HTMLElement>('.pillDot.new');
    newDots.forEach((el, i) => {
      el.style.transition = 'none';
      el.style.transform = 'scale(0.15)';
      el.style.opacity = '0.15';
      void el.offsetWidth; // force the reflow so the transition below actually animates
      // Small stagger if more than one slot ever appears at once (the
      // upgrade is always +1 today, but this holds if that ever changes).
      const delay = i * 90;
      el.style.transition = `transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.35s ease-out ${delay}ms, box-shadow 0.6s ease-out ${delay}ms`;
      el.style.transform = 'scale(1.45)';
      el.style.opacity = '1';
      el.style.boxShadow = '0 0 24px 7px rgba(159, 216, 203, 0.95)';
      setTimeout(() => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '';
        // Drop the marker once its one-time pop has played — nothing else
        // keys off .new, this just keeps it from meaning anything stale.
        el.classList.remove('new');
      }, delay + 620);
    });
  }

  // Medication meter — called every frame from the loop while lucid.
  // fraction is 1 (fresh pill) down to 0 (worn off); visible is false while
  // unmed (the meter hides rather than shows empty — nothing to camp on
  // there); warning is true in the last warnSec, driving the red/amber pulse.
  // No per-frame DOM churn: width is a plain style write, display/warn class
  // only toggle on an actual visibility/threshold change.
  setMedication(fraction: number, visible: boolean, warning: boolean): void {
    if (visible !== this.medVisible) {
      this.medMeter.style.display = visible ? 'flex' : 'none';
      this.medVisible = visible;
    }
    if (!visible) {
      if (this.medWarnOn) {
        this.medMeter.classList.remove('warn');
        this.medWarnOn = false;
      }
      return;
    }
    const f = Math.max(0, Math.min(1, fraction));
    this.medMeterFill.style.width = `${f * 100}%`;
    if (warning !== this.medWarnOn) {
      this.medMeter.classList.toggle('warn', warning);
      this.medWarnOn = warning;
    }
  }

  // Unmissable center-screen line for the moment pills are gained, e.g. "+1 pill".
  pillPopup(text: string): void {
    this.pillPopupEl.textContent = text;
    this.pillPopupEl.classList.remove('show');
    void this.pillPopupEl.offsetWidth; // restart the CSS animation
    this.pillPopupEl.classList.add('show');
  }

  // Threat presentation: level is the watcher's 0..1 sight-ramp (0 = unseen,
  // 1 = caught), or a held value while being chased; bearing is the threat's
  // direction relative to the camera in radians (0 = dead ahead, positive =
  // to the right), or null when there is no active threat this frame.
  //
  // Called every frame — no DOM churn: opacity is a plain style write (cheap,
  // no layout), classList is only touched on threshold crossings, and the
  // displayed level is lerped toward the target so a single-frame blip from
  // the ramp can't strobe the overlay.
  setThreat(level: number, bearing: number | null): void {
    // Hard reset — the documented "fully clear" call (also used on room
    // exit). Snap instantly rather than lerping out so nothing lingers.
    if (level <= 0 && bearing === null) {
      this.threatLevelCur = 0;
      this.threatVignette.style.opacity = '0';
      this.threatEdgeL.style.opacity = '0';
      this.threatEdgeR.style.opacity = '0';
      if (this.threatPulseOn) {
        this.threatVignette.classList.remove('pulse');
        this.threatPulseOn = false;
      }
      if (this.threatLineOn) {
        this.threatLine.classList.remove('show');
        this.threatLineOn = false;
      }
      return;
    }

    const target = Math.max(0, Math.min(1, level));
    this.threatLevelCur += (target - this.threatLevelCur) * 0.25;
    if (Math.abs(this.threatLevelCur - target) < 0.002) this.threatLevelCur = target;
    const lv = this.threatLevelCur;

    this.threatVignette.style.opacity = String(lv);

    // Slow oppressive pulse once he's all but on top of you.
    const pulseNow = lv >= (this.threatPulseOn ? 0.85 : 0.9);
    if (pulseNow !== this.threatPulseOn) {
      this.threatVignette.classList.toggle('pulse', pulseNow);
      this.threatPulseOn = pulseNow;
    }

    // Directional edge glow: bias the vignette toward the threat's side when
    // it's off-screen, both edges (and a touch stronger) when it's behind.
    let edgeL = 0;
    let edgeR = 0;
    if (bearing !== null && lv > 0.35) {
      const wrapped = Math.atan2(Math.sin(bearing), Math.cos(bearing));
      const ab = Math.abs(wrapped);
      if (ab > 0.7) {
        const offAxis = Math.min(1, (ab - 0.7) / (Math.PI - 0.7));
        const strength = offAxis * lv;
        if (ab > 2.4) {
          const behindStrength = Math.min(1, strength * 0.9 + 0.15);
          edgeL = behindStrength;
          edgeR = behindStrength;
        } else if (wrapped > 0) {
          edgeR = strength;
        } else {
          edgeL = strength;
        }
      }
    }
    this.threatEdgeL.style.opacity = String(edgeL);
    this.threatEdgeR.style.opacity = String(edgeR);

    // "he sees you" line — appears at the warn threshold, hides with a
    // little hysteresis so it doesn't flicker right at the boundary.
    const lineNow = lv >= (this.threatLineOn ? 0.45 : 0.5);
    if (lineNow !== this.threatLineOn) {
      this.threatLine.classList.toggle('show', lineNow);
      this.threatLineOn = lineNow;
    }
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

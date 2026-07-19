// Persistent gameplay options, set from the start screen's CONFIGURATION
// panel. Kept separate from tuning.ts (which is fixed balance constants,
// not player-facing toggles) and from state.ts (which is per-playthrough,
// not persisted).

const STORAGE_KEY = 'wardb-settings-v1';

interface Settings {
  // Reroll every keypad's 4-digit code (and its on-wall clue) on every room
  // entry and every time the player is caught, instead of the fixed code
  // baked into that room. Default off: preserves the original fixed-code
  // behaviour unless the player opts in.
  randomizeCodes: boolean;
}

const DEFAULTS: Settings = { randomizeCodes: false };

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // localStorage unavailable (private browsing, etc.) — setting still
    // holds for the rest of this session, just doesn't survive a reload.
  }
}

let current: Settings = load();

export function isRandomizeCodesEnabled(): boolean {
  return current.randomizeCodes;
}

export function setRandomizeCodes(on: boolean): void {
  current.randomizeCodes = on;
  save();
}

// Types shared between room files and the dev-only map viewer
// (src/devtools/map.ts). Room files import ONLY this module (type-only),
// never the viewer itself, so nothing viewer-related can reach the game
// bundle.

// One orderly's patrol, re-exported by a room as `debugPatrols` purely for
// the map viewer. Descriptive data only — the game never reads it.
export interface DebugPatrol {
  waypoints: { x: number; z: number }[];
  // Sight-radius override for rooms that pass a custom sightRange to
  // Orderly (room13's TUNING.lastWard.orderlySightRangeM). Absent ⇒ the
  // viewer uses TUNING.orderly.sightRange.
  sightRange?: number;
  // Display label when a room has multiple orderlies ('A'/'B', room11's
  // 'lower'/'upper').
  label?: string;
  // True stacked floors — which level this orderly is fixed to (matches the
  // `level` passed to Orderly/OrderlyCfg). Absent ⇒ '__flat'/undrawn-level
  // filtering treats it like every other room's patrol, i.e. always shown.
  level?: string;
}

import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Build SHA for telemetry's BUILD_VERSION (src/tuning.ts) — lets Tom tell
// builds apart in the telemetry stream instead of relying on a hand-
// maintained version string that goes stale. CI sets VITE_BUILD_SHA
// (deploy.yml); local dev/build falls back to the working tree's git SHA;
// outside a git repo (or if git isn't on PATH) falls back to 'dev' so
// `npm run dev` never breaks because of this.
function resolveBuildSha(): string {
  if (process.env.VITE_BUILD_SHA) return process.env.VITE_BUILD_SHA;
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

// base './' so the built bundle works from any path (itch.io HTML5 zip).
export default defineConfig({
  base: './',
  define: {
    __BUILD_SHA__: JSON.stringify(resolveBuildSha()),
  },
});

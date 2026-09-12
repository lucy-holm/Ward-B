// Offline report contract check. It uses only the checked-in fixture and
// never contacts D1, the Worker, or a live collector.
import { readFile } from 'node:fs/promises';
import { buildReport, renderMarkdown } from '../../telemetry-worker/report.mjs';

const fixture = JSON.parse(await readFile(new URL('../../telemetry-worker/report_fixture.json', import.meta.url), 'utf8'));
const report = buildReport(fixture);
const wrappedReport = buildReport([{ results: fixture }]);
const debugReport = buildReport([...fixture, { ...fixture[0], session: 'debug', debug: 1 }]);
const markdown = renderMarkdown(report);
const hiddenRows = [
  { session: 'hidden', player: 'p-hidden', run: 1, debug: 0, data: JSON.stringify({ name: 'session_start', t: 200000, room: 'room3' }) },
  { session: 'hidden', player: 'p-hidden', run: 1, debug: 0, data: JSON.stringify({ name: 'room_enter', t: 200100, room: 'room3' }) },
  { session: 'hidden', player: 'p-hidden', run: 1, debug: 0, data: JSON.stringify({ name: 'puzzle_step', t: 201000, room: 'room3', puzzle: 'hidden-puzzle', step: 'open' }) },
  { session: 'hidden', player: 'p-hidden', run: 1, debug: 0, data: JSON.stringify({ name: 'visibility_hidden', t: 202000, room: 'room3' }) },
  { session: 'hidden', player: 'p-hidden', run: 1, debug: 0, data: JSON.stringify({ name: 'visibility_visible', t: 400000, room: 'room3' }) },
  { session: 'hidden', player: 'p-hidden', run: 1, debug: 0, data: JSON.stringify({ name: 'puzzle_step', t: 401000, room: 'room3', puzzle: 'hidden-puzzle', step: 'progress' }) },
];
const hiddenReport = buildReport(hiddenRows);
const room6Rows = [
  { session: 'room6', player: 'p-room6', run: 1, debug: 0, data: JSON.stringify({ name: 'session_start', t: 500000, room: 'room6' }) },
  { session: 'room6', player: 'p-room6', run: 1, debug: 0, data: JSON.stringify({ name: 'room_enter', t: 500100, room: 'room6' }) },
  { session: 'room6', player: 'p-room6', run: 1, debug: 0, data: JSON.stringify({ name: 'puzzle_step', t: 501000, room: 'room6', puzzle: 'room6_maintenance', step: 'panel_powered' }) },
  { session: 'room6', player: 'p-room6', run: 1, debug: 0, data: JSON.stringify({ name: 'room_complete', t: 501500, room: 'room6' }) },
];
const room6Report = buildReport(room6Rows);
const completedQuitReport = buildReport([...fixture, { ...fixture[0], session: 'a', data: JSON.stringify({ name: 'quit', t: 134000, room: 'room20' }) }]);
const legacyRouteReport = buildReport([
  { session: 'legacy-route', player: 'p-legacy', run: 1, debug: 0, data: JSON.stringify({ name: 'session_start', t: 600000, room: 'room18' }) },
  { session: 'legacy-route', player: 'p-legacy', run: 1, debug: 0, data: JSON.stringify({ name: 'wing_power_set', t: 600100, room: 'room18', power: 'lights' }) },
  { session: 'legacy-route', player: 'p-legacy', run: 1, debug: 0, data: JSON.stringify({ name: 'room_enter', t: 600200, room: 'room19' }) },
  { session: 'legacy-route', player: 'p-legacy', run: 1, debug: 0, data: JSON.stringify({ name: 'room_complete', t: 600500, room: 'room19' }) },
]);
const checks = [];
function check(name, condition) {
  checks.push(condition);
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`);
}

check('groups all sessions including noncompleters', report.sample.sessions === 5 && report.sample.fresh_run_sessions === 4);
check('unwraps wrangler result envelopes', wrappedReport.sample.sessions === 5);
check('excludes debug sessions from player metrics', debugReport.sample.sessions === 5);
check('funnel excludes checkpoint continuation from fresh denominator', report.funnel.find((x) => x.stage === 'page_load')?.n === 4 && report.resumed_funnel.find((x) => x.stage === 'room_enter')?.successes === 1);
check('funnel counts game completion', report.funnel.find((x) => x.stage === 'game_complete')?.successes === 1);
check('explicit quit is separate from inferred abandonment', report.outcomes.explicit_quit_or_close === 1 && report.outcomes.inferred_abandonment_or_missing_terminal_event === 1);
check('completed sessions are excluded from quit outcome', completedQuitReport.outcomes.explicit_quit_or_close === 1);
check('room report includes active time and catches', report.room_progress[0]?.active_s.median === 10 && report.room_progress[0]?.catches === 1);
check('room report keeps incomplete visits and censored active time', report.room_progress.some((x) => x.incomplete_visits === 1 && x.censored_active_s.n === 1));
check('incomplete visits retain discrete catches', report.room_progress.some((x) => x.incomplete_visits === 1 && x.catches === 1));
check('puzzle stall is surfaced as a candidate', report.puzzle_stalls.candidates[0]?.candidates === 1);
check('puzzle gaps subtract hidden time and preserve censored final steps', hiddenReport.puzzle_stalls.candidates[0]?.candidates === 0 && hiddenReport.puzzle_stalls.candidates[0]?.unfinished_final_steps === 1);
check('room6 panel_powered and room completion close the puzzle', room6Report.puzzle_stalls.candidates.length === 0);
check('platform/performance segmentation has mobile and desktop sessions', report.platform_performance.some((x) => x.platform === 'mobile') && report.platform_performance.some((x) => x.platform === 'desktop'));
check('build and route-19 cohort sections are present', Array.isArray(report.build_cohorts) && Array.isArray(report.route19));
check('route-19 splits the logical room into both authored variants', report.route19.length === 2 && report.route19.find((x) => x.route === 'lights')?.enters === 1 && report.route19.find((x) => x.route === 'doors')?.enters === 1);
check('legacy route-19 rows infer branch from wing power', legacyRouteReport.route19.find((x) => x.route === 'lights')?.enters === 1);
check('small samples are marked inadequate', report.platform_performance.every((x) => x.adequate === false));
check('observation event counters are bounded in the report shape', Object.hasOwn(report.observations, 'noise') && Object.hasOwn(report.observations, 'hazard_caught'));
check('observation breakdowns retain authored source fields', report.observation_breakdown.noise_by_source.keypad === 1);
check('renders a readable markdown report', markdown.includes('| Room |') && markdown.includes('Ranked investigation prompts'));

if (checks.some((value) => !value)) process.exit(1);
console.log(`OK - telemetry report (${checks.length} checks)`);

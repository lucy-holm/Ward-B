#!/usr/bin/env bash
# Run the whole Godot test suite, and FAIL LOUDLY rather than falsely passing.
#
#   godot/tools/run_tests.sh              # all suites
#   godot/tools/run_tests.sh test_triggers # one suite
#
# WHY THIS EXISTS — the false green.
#
# In a FRESH checkout or worktree there is no .godot/global_script_class_cache.cfg,
# so every `class_name` type (WardCollision, Interactable, RoomExit,
# TriggerVolume, TriggerPoll, DeferredGate, WardLevels...) fails to resolve.
# The harness script then fails to PARSE, which means:
#
#   * no guard written inside a test script can catch it — the script never
#     runs at all; and
#   * Godot may still exit 0, so CI and background jobs see a pass.
#
# That exact false green was observed once already, and the same condition has
# also been seen to hang instead. Either way the run reports something other
# than the truth, which is worse than a red build.
#
# So: import first (idempotent), then require each suite to print its "OK - "
# line. Absence of that line is a failure, whatever the exit code says.
set -uo pipefail
cd "$(dirname "$0")/.."

GODOT="${GODOT:-godot}"
TIMEOUT_S="${TIMEOUT_S:-300}"
SUITES=("$@")
if [ ${#SUITES[@]} -eq 0 ]; then
  SUITES=(check_rooms test_mechanics test_settings test_triggers test_flicker \
          test_room11 test_room13 test_room14 test_room15 test_room17)
fi

echo "==> rebuilding the import cache (this is the load-bearing step)"
"$GODOT" --headless --path . --import >/dev/null 2>&1 || true
if [ ! -f .godot/global_script_class_cache.cfg ]; then
  echo "FATAL: .godot/global_script_class_cache.cfg still missing after --import."
  echo "       Every class_name type will fail to resolve; suite results would be meaningless."
  exit 1
fi

fail=0
for s in "${SUITES[@]}"; do
  printf '%-18s ' "$s"
  out=$(
    # macOS has no coreutils `timeout`; run in the background and poll, so a
    # HANG is reported as a hang instead of silently eating the build.
    "$GODOT" --headless --path . "tools/$s.tscn" 2>&1 &
    pid=$!
    n=0
    while kill -0 $pid 2>/dev/null && [ $n -lt "$TIMEOUT_S" ]; do sleep 1; n=$((n+1)); done
    if kill -0 $pid 2>/dev/null; then kill -9 $pid 2>/dev/null; echo "__TIMEOUT__"; fi
    wait $pid 2>/dev/null
  )
  if grep -q "__TIMEOUT__" <<<"$out"; then
    echo "TIMEOUT after ${TIMEOUT_S}s"; fail=1
  elif grep -qE "(^[[:space:]]*|: )OK [-—–] " <<<"$out"; then
    grep -oE "OK [-—–] .*" <<<"$out" | head -1
  else
    echo "FAILED (no 'OK -' line — see output below)"
    sed 's/^/    /' <<<"$out" | tail -15
    fail=1
  fi
done

[ $fail -eq 0 ] && echo "==> all suites green" || echo "==> SUITE FAILURES"
exit $fail

#!/usr/bin/env bash
# Round-trip guard for tools/gen_rooms.py: regenerate every room into a throwaway
# copy of the tree and diff the output against the committed .tscn files.
#
#   godot/tools/check_roundtrip.sh
#
# WHY THIS EXISTS.
#
# gen_rooms.py's docstring claims a full run reproduces all 21 committed room
# scenes byte-for-byte — that claim is only as good as someone remembering to
# check it by hand. room20 already drifted out from under exactly that kind of
# trust once: it was defined in this file but missing from __main__'s
# write_room() list, so `python3 tools/gen_rooms.py` never touched
# rooms/room20/room20.tscn at all, and nothing would have caught a genuine
# divergence between the generator and the shipped scene until someone
# regenerated room20 by hand and happened to diff it. This script is the thing
# that would have caught it, run every time instead of never.
#
# THE SAFE WAY TO DO THIS is NOT to run gen_rooms.py against the working tree:
# a bug in a preset (or in this pass's conversion of a room to use one) could
# silently rewrite committed geometry, and `git diff` after the fact is a much
# worse failure mode than a script that never touched the working tree at all.
# So: rsync the whole repo into a scratch copy (skipping the heavy/generated
# .godot, build, .artifacts directories, none of which gen_rooms.py reads or
# writes), regenerate THERE, and diff the scratch copy's rooms/ against this
# tree's. The working tree is never written.
#
# COVERAGE: every directory under rooms/ is checked, not a hardcoded list, and
# the scratch copy's .tscn files are DELETED before regenerating. That deletion
# is load-bearing, not tidiness:
#
#   An earlier version of this script rsynced the tree (committed .tscn files
#   included) and regenerated on top. A room missing from __main__'s
#   write_room() list — room20's exact failure mode — was therefore never
#   written in the scratch copy, so the diff compared the rsynced committed
#   file against ITSELF and passed. The MISSING branch below could not fire at
#   all, because rsync guaranteed the file existed. The header claimed this
#   case was covered; it was not. Deleting first means only files the generator
#   actually emits exist in the scratch tree, so an unwritten room shows up as
#   MISSING instead of silently passing.
#
# Only .tscn files are removed. The room .gd scripts and .uid files stay,
# because gen_rooms.py does not write them and check_rooms is not run here.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"
SCRATCH="$(mktemp -d /tmp/wbroundtrip.XXXXXX)"
trap 'rm -rf "$SCRATCH"' EXIT

echo "==> copying the tree to $SCRATCH (excluding .godot, build, .artifacts)"
rsync -a --exclude '.godot' --exclude 'build' --exclude '.artifacts' \
  "$REPO_ROOT/" "$SCRATCH/"

echo "==> clearing the scratch copy's .tscn files (see COVERAGE above)"
find "$SCRATCH/rooms" -name '*.tscn' -delete

echo "==> regenerating every room in the scratch copy"
if ! ( cd "$SCRATCH" && python3 tools/gen_rooms.py ); then
  echo "FATAL: tools/gen_rooms.py failed to run — see output above"
  exit 1
fi

fail=0
checked=0
for room_dir in "$REPO_ROOT"/rooms/*/; do
  room="$(basename "$room_dir")"
  for f in "$room_dir"*.tscn; do
    [ -e "$f" ] || continue
    rel="rooms/$room/$(basename "$f")"
    checked=$((checked + 1))
    if [ ! -e "$SCRATCH/$rel" ]; then
      echo "MISSING FROM REGENERATE: $rel (defined/committed but no write_room() call reaches it — see room20's history above)"
      fail=1
    elif ! diff -q "$f" "$SCRATCH/$rel" >/dev/null 2>&1; then
      echo "DIFFERS: $rel"
      diff -u "$f" "$SCRATCH/$rel" | head -20 | sed 's/^/    /'
      fail=1
    fi
  done
done

if [ "$checked" -eq 0 ]; then
  echo "FATAL: found zero .tscn files under rooms/ — check_roundtrip.sh is looking in the wrong place"
  exit 1
fi

echo "==> checked $checked room scene(s)"
if [ "$fail" -eq 0 ]; then
  echo "==> round-trip OK — every committed room regenerates byte-for-byte"
else
  echo "==> ROUND-TRIP FAILURE — gen_rooms.py no longer reproduces the shipped ward (see above)"
fi
exit $fail

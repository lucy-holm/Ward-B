#!/usr/bin/env python3
"""Assert every .tres/.tscn declares the sub-resources it references.

    python3 tools/check_resources.py

WHY THIS EXISTS, and why it is a separate guard rather than a test.

A hand-edit that deletes a `[sub_resource ...]` HEADER while leaving the
`SubResource("id")` references pointing at it produces a file that is still
valid INI, still parses, and still imports without complaint — and then makes
Godot HANG rather than fail. That exact thing happened to materials/wall.tres
during the concept-art pass: `--headless --import` reported success,
`check_rooms` failed with all 20 rooms unable to load, and `tools/shoot.tscn`
renders stopped producing output and sat there until killed. Two separate
agents lost time diagnosing it as process contention, because a hang looks
nothing like a corrupt file.

The existing suites cannot catch this cheaply: they all run Godot, so they
inherit the hang they are supposed to be diagnosing. This is pure Python, runs
in well under a second, and fails LOUDLY with the offending id — which is
exactly what was missing.

Checks BOTH directions:
  * referenced but never declared -> the hang above;
  * declared but never referenced -> harmless at runtime, but in generated
    files it means the emitter is writing dead resources, and in hand-authored
    ones it usually means a part was deleted and its resource left behind.
"""

import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DECL = re.compile(r'\[sub_resource type="[^"]+" id="([^"]+)"\]')
USE = re.compile(r'SubResource\("([^"]+)"\)')
EXT_DECL = re.compile(r'\[ext_resource [^\]]*id="([^"]+)"\]')
EXT_USE = re.compile(r'ExtResource\("([^"]+)"\)')


def main():
    patterns = ("materials/*.tres", "props/*.tscn", "props/*.tres",
                "fixtures/*.tscn", "fixtures/*.tres", "rooms/*/*.tscn")
    files = []
    for pat in patterns:
        files.extend(sorted(glob.glob(os.path.join(ROOT, pat))))

    fail = 0
    for path in files:
        with open(path, "r") as fh:
            txt = fh.read()
        rel = os.path.relpath(path, ROOT)
        for kind, decl_re, use_re in (("sub_resource", DECL, USE),
                                      ("ext_resource", EXT_DECL, EXT_USE)):
            declared = set(decl_re.findall(txt))
            used = set(use_re.findall(txt))
            for missing in sorted(used - declared):
                print("BROKEN %s: %s(\"%s\") referenced but never declared "
                      "— this is the hang, not a parse error" % (rel, kind, missing))
                fail += 1
            for orphan in sorted(declared - used):
                print("ORPHAN %s: %s id=\"%s\" declared but never referenced"
                      % (rel, kind, orphan))
                fail += 1

    print("==> checked %d resource file(s)" % len(files))
    if fail:
        print("==> %d PROBLEM(S) — see above" % fail)
        return 1
    print("==> all sub/ext resource references resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main())

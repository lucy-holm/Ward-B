#!/usr/bin/env bash
# Build the Godot web export and stage it for the tailnet nginx container.
#
#   ./tools/deploy_tailnet.sh
#
# The container (infra: docker/ward-b-godot/) bind-mounts build/ read-only, so
# this script IS the deploy — no container restart needed.
#
# Two non-obvious steps:
#  * chmod a+rX — Godot, like Vite, writes with a umask that leaves the output
#    dir 700. OrbStack's mount then serves 403s to nginx's unprivileged user.
#    This bit the Three.js build before (hence its postbuild chmod).
#  * pre-gzip — the wasm is 38 MB raw / 9.6 MB gzipped. nginx gzip_static
#    serves the .gz with zero per-request CPU, which matters a lot when
#    you're playtesting over a remote VPN rather than on the LAN.
set -euo pipefail

cd "$(dirname "$0")/.."
GODOT="${GODOT:-/Applications/Godot.app/Contents/MacOS/Godot}"

echo "==> exporting web build"
mkdir -p build
"$GODOT" --headless --path . --export-release "Web" build/index.html

echo "==> fixing permissions for the OrbStack mount"
chmod -R a+rX build

echo "==> pre-compressing for gzip_static"
find build -type f -name '*.gz' -delete
for f in build/*.wasm build/*.js build/*.pck build/*.html; do
  [ -f "$f" ] || continue
  gzip -9 -k -f "$f"
done
chmod -R a+rX build

# STALENESS GUARD.
#
# nginx has gzip_static on, so it serves index.pck.gz / index.wasm.gz in
# preference to the real files for any client sending Accept-Encoding: gzip —
# i.e. every browser. That means a .gz left over from an EARLIER build is not a
# cosmetic problem: it is the entire thing the player runs, and no amount of
# Cache-Control no-cache helps, because the staleness is server-side.
#
# This actually shipped: an export run with the raw `--export-release` command
# instead of this script refreshed index.pck/index.wasm but left hour-old .gz
# files next to them. The playtester spent a session on a build that had none
# of the fixes, and even `verify_desktop.mjs` passed against it — the assertions
# it makes were true of both builds, so a green test gave false confidence.
#
# Two checks, because they fail differently: the first catches a bad/partial
# gzip, the second catches nginx serving something other than what we just
# built (wrong mount, wrong container, permissions).
echo "==> verifying .gz match their sources"
for f in build/*.wasm build/*.js build/*.pck build/*.html; do
  [ -f "$f" ] || continue
  [ -f "$f.gz" ] || { echo "MISSING: $f.gz"; exit 1; }
  if [ "$(gunzip -c "$f.gz" | shasum -a 256 | cut -d' ' -f1)" \
     != "$(shasum -a 256 "$f" | cut -d' ' -f1)" ]; then
    echo "STALE/CORRUPT: $f.gz does not match $f"; exit 1
  fi
done
echo "    all .gz match"

PORT="${WARDB_PORT:-8091}"
if curl -sf -o /dev/null "http://127.0.0.1:$PORT/index.html" 2>/dev/null; then
  echo "==> verifying what nginx actually serves on :$PORT"
  for f in index.pck index.wasm; do
    curl -s -H "Accept-Encoding: gzip" --compressed -o "/tmp/wardb-served-$f" \
      "http://127.0.0.1:$PORT/$f"
    if [ "$(shasum -a 256 "/tmp/wardb-served-$f" | cut -d' ' -f1)" \
       != "$(shasum -a 256 "build/$f" | cut -d' ' -f1)" ]; then
      echo "SERVED MISMATCH: $f on :$PORT is not the file just built"; exit 1
    fi
    rm -f "/tmp/wardb-served-$f"
  done
  echo "    served bytes match the build"
else
  echo "==> nginx not reachable on :$PORT — skipped served-bytes check"
fi

echo
echo "sizes:"
du -h build/index.wasm build/index.wasm.gz build/index.pck 2>/dev/null | sed 's/^/  /'
echo
echo "==> live at https://hellos.impala-alpha.ts.net:8444"

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

echo
echo "sizes:"
du -h build/index.wasm build/index.wasm.gz build/index.pck 2>/dev/null | sed 's/^/  /'
echo
echo "==> live at https://hellos.impala-alpha.ts.net:8444"

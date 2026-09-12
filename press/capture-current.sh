#!/usr/bin/env bash
# Actual game-camera captures. Cover type is rendered by Godot, not retouched.
set -euo pipefail
cd "$(dirname "$0")/.."
GODOT="${GODOT:-/opt/homebrew/bin/godot}"
mkdir -p press/current
capture() {
  local name="$1" room="$2" state="$3" mono="$4" pose="$5"
  "$GODOT" --path godot --resolution 1600x900 tools/shoot_game.tscn -- "press-$name" 0.1 "$room" "$state" "mono_amount=$mono" "" "$pose"
  cp "godot/.artifacts/press-$name.png" "press/current/$name.png"
}
capture 01-observation-ward room12 lucid 0 '5,18,0,__flat,0,0'
capture 02-treatment-bays room11 lucid 0 '-3,8,0,__flat,0,0'
capture 03-shape-seal-mono room7 unmed 1 '3.4,-1.1,-1.5708,__flat,0,-0.25'
capture 04-wall-bell-mono room8 unmed 1 '7.4,-4.6,-1.5708,__flat,0,0'
capture 05-gallery room17 lucid 0 '-3,7,1.5708,balcony,3.4,-0.25'
capture 06-relay-choice room18 lucid 0 '0,3,0,__flat,0,0'
capture 07-loading-bay room20 lucid 0 '0,5,0,__flat,0,0'
capture 08-asylum-mono room12 unmed 1 '5,18,0,__flat,0,0'
"$GODOT" --path godot --resolution 630x500 tools/shoot_game.tscn -- press-cover 0.1 room12 lucid mono_amount=0 nohud '5,18,0,__flat,0,0' cover
cp godot/.artifacts/press-cover.png press/current/cover.png

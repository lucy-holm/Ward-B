# Monochrome readability feedback pass

The shape and bell puzzles referred to in this playtest are project rooms 7
and 8. This pass improves their presentation without changing their solutions,
patrols, catches, pill costs or telemetry event meanings.

- Shape seals stand upright and face their approach lanes, with pale tinted
  faces and dark backing. They retain a slight pickup bob, but no longer spin
  edge-on. Room 7's stands are larger and taller. The shared improvement also
  applies to room 15; its first seal now faces the dogleg approach.
- The room 7 reader displays the requested physical shape in both states.
  The icon and entrance clue update together when an uncollected catch changes
  the request. A held seal keeps the same requirement.
- Room 8's bells have larger plates, bright silhouettes against dark fields,
  a separate raised press button and a wider progress lamp. The discovered
  clue explicitly numbers the three shapes, and the objective explains that
  each matching wall bell must be pressed while unmedicated.
- Medication stations have a small luminous canopy and a soft local light.
  The locator is steady through mood flicker and room circuit changes, like
  battery-backed signage. Its range is 1.1m and it casts no shadows. The light
  was reduced after the first visual review found it washing out the clue.

## Verification

All 30 Godot suites pass in the final full run. This includes 206 early puzzle
assertions, the room 15 shapes, 402 scrawl layout assertions across 21 room
variants, the room 16 lighting puzzle, and the medication locator's steady
behavior through circuit off/on. Real camera focus still reaches all seals,
readers and bells. The generator round-trip passes for all 123 scene/spec
outputs. `npm run check:rooms` and `npm run build` pass; the existing Vite
chunk-size warning remains. The required room 7/8 archive maps load without
page errors; gameplay checks above use the maintained Godot scenes.

Actual player-camera Compatibility renders were reviewed in black and white
for all three room 7 seals, the reader in both states, the bell, medication
stations in rooms 6/8, and room 15's first seal and door icons. An isolated Web
export of the same game code was also captured with a temporary camera harness:
four desktop views at 1280×720 and two touch-enabled tablet views at 1024×768.
All six browser views rendered without page or script errors. The harness
only admits, positions the real player camera and applies `mono_amount=1`;
it does not substitute materials or lights. The touch controls remained visible
in the tablet captures. This is browser emulation, not a physical iPad test.

Visual artifacts are in the ignored `godot/.artifacts/` directory:
`mono-seal7-*.png`, `mono-reader7-*.png`, `mono-disp8.png`, and
`web-mono-*.png`. The next human playtest should start in monochrome and check
whether the requested shape and numbered bell sequence are understood without
trying every option. Color remains a secondary cue.

The private build was refreshed with `godot/tools/deploy_tailnet.sh` at
`https://hellos.impala-alpha.ts.net:8444`. Raw/gzip and the HTTPS-served PCK
match SHA-256 `c03b6a80f2e15acec8ef07ab367916842dbfb0404e76f12ba4e6c376a3ddded3`.
The served desktop input smoke test passes admission, movement, pointer lock
and look with no page errors. Public itch.io was not republished; the private
build retains an empty telemetry collector configuration.

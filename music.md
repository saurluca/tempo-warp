# Tempo Warp — music

Procedural Tone.js. No audio files. One sequencer, one synth rack; each track swaps a **kit** (instruments / timbre) on the DJ handoff.

Code: `src/audio/tracks.ts` (patterns + kits), `src/audio/bus.ts` (mix, stems, spin). Feel knobs: `tuning.ts` (`djMinHold`, `djFadeOut` / `djFadeIn`, `arrangeRise`).

## How it plays

- First click unlocks audio (`Tone.start()`).
- A 16th-note loop fires kick / snare / hats / bass / lead / voice. The pad drones the track’s root.
- **Distance** (`musicHold`, peak-held `radius01`) opens the arrangement. Floor is a hush bed (pad + kick + a bit of bass) — never silence.
- **Speed** opens the filter, pushes gains, and nudges BPM a few percent. It does not pick the notes.
- Shatter ducks the mix and plays a heartbeat. Track does not change.
- Riding a **current** (band rim, or every 700 units past the last) after ~48s (`djMinHold`) **spins** the next track: duck + filter close → swap pattern + kit → fade in from the hush bed → stems rebuild over ~20s.

`?track=ember` forces a start. `?debug=1` + ♪ cycles with a hard cut (no DJ fade).

### Stem gates (`arrange01`)

| Stem | Opens at |
|---|---|
| Kick | 0.12 |
| Bass | 0.22 |
| Snare | 0.28 |
| Hats | 0.45 |
| Lead | 0.62 |
| Voice | 0.78 |

First song follows `musicHold`. After a spin, `arrange01` resets to 0.24 and climbs (`arrangeRise`).

## DJ set (spin order)

Neighbors stay close in BPM and key so the pad / tempo ramp doesn’t lurch. Wrap is Razor → Veil (set restart).

| # | Id | Label | BPM | Key | Bars | Kit | What you hear |
|---|---|---|---|---|---|---|---|
| 1 | `veil` | VEIL | 78 | D | 1 | glass | Sparse air. Soft kick, pink dust snare, FM bells when the lead opens. |
| 2 | `ember` | EMBER | 84 | D | 2 | reed | Warm dust, late kicks. Saw lead, triangle pad. |
| 3 | `ash` | ASH | 90 | A | 2 | tape | Trip-hop limp. Dull low kick, brown noise snare, sine-y hush. |
| 4 | `drift` | DRIFT | 92 | F | 1 | chorus | Slow float. Pulse bass, saw pad, triangle lead. |
| 5 | `tide` | TIDE | 100 | G | 2 | sub | Rolling dub. Huge C0 kick, brown snare, deep triangle bass. |
| 6 | `pulse` | PULSE | 110 | A | 1 | techno | Hypnotic four-feel. Tight square bass + square lead. |
| 7 | `quartz` | QUARTZ | 120 | G | 4 | crystal | Minimal floor, fill on bar 4. Tiny kick, FM chimes. |
| 8 | `lumen` | LUMEN | 124 | C | 2 | chip | Bright electro. Pulse bass, 8-bit squares. |
| 9 | `coil` | COIL | 126 | A | 2 | acid | 303 walk. Saw bass, high Q, a little grit. |
| 10 | `neon` | NEON | 128 | C | 1 | neon | Classic kit. Square bass, triangle lead, sine pad. |
| 11 | `halo` | HALO | 130 | E | 2 | skip | Two-step skip. Short clap, pluck lead. |
| 12 | `nudge` | NUDGE | 132 | F | 2 | pluck | Garage shuffle. Woody plucks, pulse bass. |
| 13 | `bloom` | BLOOM | 136 | D | 4 | bells | Broken / dreamy. AM shimmer lead, long sine pad. |
| 14 | `viper` | VIPER | 140 | E | 2 | half | Half-time snake. Sub kick, saw + grit. |
| 15 | `surge` | SURGE | 142 | E | 1 | rush | Dense drive. Aggressive saws, grit. |
| 16 | `razor` | RAZOR | 155 | G | 1 | steel | Industrial clip. Metallic hats, distorted square, FM stabs. |

## Kits

Same rack, retuned on spin (during the duck). Extra leads: FM, AM, Pluck. Bass can pick up a bit of distortion (`grit`).

| Kit | Kick | Snare | Bass | Lead | Pad | Grit |
|---|---|---|---|---|---|---|
| glass | Soft C1 | Pink, long | Triangle | FM bells | Sine | — |
| reed | D1, warm | White | Triangle | Saw | Triangle | hint |
| tape | Dull A0 | Brown | Sine | Triangle | Sine | hint |
| chorus | Medium C1 | Pink | Pulse | Triangle | Saw | — |
| sub | Huge C0 | Brown, short | Triangle, deep | Triangle | Sine | hint |
| techno | Punchy C1 | White, short | Square | Square | Sine | hint |
| crystal | Light G1 | Pink, short | Triangle | FM chimes | Sine | — |
| chip | Click C1 | White, tiny | Pulse | Square | Triangle | — |
| acid | Punch C1 | White | Saw, high Q | Square | Sine | yes |
| neon | Classic C1 | White | Square | Triangle | Sine | — |
| skip | Tight C1 | White clap | Triangle | Pluck | Triangle | — |
| pluck | D1, short | Pink | Pulse | Pluck | Triangle | hint |
| bells | Soft C1 | Pink | Triangle | AM | Sine | — |
| half | Heavy C0 | Brown | Saw | Saw | Saw | yes |
| rush | Tight C1 | White | Saw | Saw | Triangle | yes |
| steel | Click C1 | White, tiny | Square | FM | Saw | heavy |

## Adding a track

1. Add an id to `TRACK_IDS` **next to a neighbor** with nearby BPM and a related pad key (fifth / whole step).
2. Write `kick` / `snare` / `hat` (16ths, length `% 16 === 0`) and `bass` / `lead` the same length. `hit()` / `bars()` helpers are fine.
3. Give it a `kit` (reuse or add a row to `KITS`).
4. `?track=yourid` to audition; ride a current or ♪ to hear the handoff.

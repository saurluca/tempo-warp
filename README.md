# Tempo Warp

HUD-less velocity feel-demo. **Bun** + Vite + Three.js + Tone.js.

```bash
bun install
bun run dev      # http://127.0.0.1:5173
bun test
bun run build
bunx vercel     # deploy this folder
```

| Flag | Effect |
|---|---|
| `?debug=1` | Overlay + music track button |
| `?seed=123` | Deterministic obstacle field |
| `?track=veil\|ember\|ash\|…` | Force a music track (else random on load) |

**Music:** 16 tracks in DJ set order. Survive a track without getting hit to crossfade into the next. In debug, click the ♪ button to cycle. Kits and mix notes: [music.md](music.md).

| # | Track | BPM | Key | What you hear |
|---|---|---|---|---|
| 1 | `veil` | 78 | D | Sparse air. Soft kick, pink dust snare, FM bells. |
| 2 | `ember` | 84 | D | Warm dust, late kicks. Saw lead. |
| 3 | `ash` | 90 | A | Trip-hop limp. Dull low kick, brown noise snare. |
| 4 | `drift` | 92 | F | Slow float. Pulse bass, triangle lead. |
| 5 | `tide` | 100 | G | Rolling dub. Huge kick, deep triangle bass. |
| 6 | `pulse` | 110 | A | Hypnotic four-feel. Tight square bass + lead. |
| 7 | `quartz` | 120 | G | Minimal floor, fill on bar 4. FM chimes. |
| 8 | `lumen` | 124 | C | Bright electro. Pulse bass, 8-bit squares. |
| 9 | `coil` | 126 | A | 303 walk. Saw bass, a little grit. |
| 10 | `neon` | 128 | C | Classic kit. Square bass, triangle lead. |
| 11 | `halo` | 130 | E | Two-step skip. Short clap, pluck lead. |
| 12 | `nudge` | 132 | F | Garage shuffle. Woody plucks, pulse bass. |
| 13 | `bloom` | 136 | D | Broken / dreamy. AM shimmer lead. |
| 14 | `viper` | 140 | E | Half-time snake. Sub kick, saw + grit. |
| 15 | `surge` | 142 | E | Dense drive. Aggressive saws, grit. |
| 16 | `razor` | 155 | G | Industrial clip. Metallic hats, FM stabs. |

**Play:** move pointer to aim · hold to spool throttle · release to coast · hit = shatter hush.

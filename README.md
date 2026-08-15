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
| `?debug=1` | Overlay + music track + hide-grid buttons |
| `?seed=123` | Deterministic obstacle field |
| `?track=neon\|drift\|surge\|pulse\|veil\|razor` | Force a music track (else random on load) |

**Music:** six beat tracks (NEON / DRIFT / SURGE / PULSE / VEIL / RAZOR). Layers and filter open with speed; shatter ducks to hush. In debug, click the ♪ button to cycle.

**Play:** move pointer to aim · hold to spool throttle · release to coast · hit = shatter hush.

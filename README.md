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
| `?debug=1` | Overlay + clickable music track button |
| `?seed=123` | Deterministic obstacle field |
| `?track=neon\|drift\|surge` | Force a music track (else random on load) |

**Music:** three beat tracks (NEON / DRIFT / SURGE). Layers and filter open with speed; shatter ducks to hush. In debug, click the ♪ button to cycle.

**Play:** move pointer to aim · hold to spool throttle · release to coast · hit = shatter hush.

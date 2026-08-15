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
| `?track=veil\|ember\|ash\|…` | Force a music track (else random on load) |

**Music:** 16 tracks in DJ set order (VEIL → … → RAZOR). New songs are 2–4 bar loops; riding a current crossfades into the next and rebuilds stems. In debug, click the ♪ button to cycle.

**Play:** move pointer to aim · hold to spool throttle · release to coast · hit = shatter hush.

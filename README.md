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
| `?debug=1` | FPS / throttle / obstacles overlay |
| `?seed=123` | Deterministic obstacle field |
| `?audio=proc` | Brighter procedural audio bed |

**Play:** move pointer to aim · hold to spool throttle · release to coast · hit = shatter hush.

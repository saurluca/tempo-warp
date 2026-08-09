# Tempo Warp — Build roadmap

Web-only feel demo. Host on Vercel from this folder. Use **Bun**.

Design source: [BRIEF.md](./BRIEF.md) · Practices: [DEV.md](./DEV.md)

---

## Locked decisions

| Topic | Choice |
|---|---|
| Dimension | 2.5D top-down (Three.js) |
| Style | Neon wire / glow, cool hush → warm surge |
| Graphics | Code primitives + light shaders |
| Music | Tone.js layered bed; `?audio=proc` alternate |
| Controls | Pointer chase; **hold** spools throttle (car-like coast) |
| Obstacles | Sparse + large; density rises with speed |
| Fail | Hard shatter → hush |
| Deploy | `tempo-warp/` static Vite → Vercel |

---

## Phase 0 status

**Done**
- [x] Vite + Bun + Three.js + Tone.js scaffold
- [x] Pointer aim + hold-to-throttle + coast
- [x] `speed01` bus → color, stretch, warp, audio, spawns
- [x] Seeded sparse obstacles + movers + ground warp
- [x] Hard shatter + diegetic feedback + burst
- [x] `?debug=1` · `?seed=` · `?audio=proc`
- [x] Vitest for world curves + throttle feel

**Next**
- [ ] Vercel production deploy
- [ ] Silent sandbox / organic gate (Phase 1)
- [ ] Optional real CC stem files

---

## Commands

```bash
bun install
bun run dev      # http://127.0.0.1:5173
bun test
bun run build
bunx vercel      # from tempo-warp/
```

---

## Out of scope until feel is proven

Density/Light axes, story, HUD/text tutorials, score chase, React shell, ads.

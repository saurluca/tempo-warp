# Tempo Warp — Dev practices (before / during build)

Habits that pay off for a feel-driven WebGL toy. Adopt these when scaffolding starts.

---

## 1. Separate “feel numbers” from rendering

Put all tunable constants in one module (e.g. `src/tuning.ts`):

- accel, drag, boost multiplier, max speed  
- shatter recovery time  
- speed → obstacle density curve  
- speed → stem gains  
- color hush → surge stops  

**Why:** 90% of iteration is sliding numbers, not rewriting Three.js. Never bury magic numbers inside `animate()`.

---

## 2. Pure sim, thin view

| Layer | Owns | Must not own |
|---|---|---|
| `sim/` | position, velocity, speed01, collisions, spawn logic | meshes, Tone, DOM |
| `view/` | Three.js scene, materials, camera | game rules |
| `audio/` | stem gains, procedural bus | when to shatter (sim tells it) |

Sim should be unit-testable without WebGL (`vitest` on `speed01 → density`). Fixes “I tweaked a shader and broke boost.”

---

## 3. Fixed timestep for gameplay, render can interpolate

- Simulate at e.g. 60 Hz fixed `dt`  
- Render with whatever frame the browser gives  

**Why:** Boost/shatter feel stays stable when FPS dips; important for Vercel traffic on weak laptops.

---

## 4. One `speed01` bus

Normalize velocity to `0..1` once per tick. Everything else (warmth, warp, music, spawn rate) reads **only** that. No parallel “intensity” variables that drift out of sync.

---

## 5. Audio unlock + mute path on day one

Browsers block sound until a gesture. Pattern:

1. First `pointerdown` → `Tone.start()` + start loops  
2. Hard shatter / hush only changes **gains**, doesn’t restart the graph every hit  
3. Optional `M` mute later — not Phase 0 HUD, but keep a `muted` flag in audio module  

Also keep the **procedural Tone path** behind a URL flag (`?audio=proc`) so stem vs code-gen is one reload, not a branch mess.

---

## 6. Debug overlay behind a flag (not a HUD)

`?debug=1` → show speed01, boost, FPS, collider outlines.  
Ship build: flag off. This is how you tune without violating zero-text design.

---

## 7. Seeded spawns

`mulberry32(seed)` (or similar) for obstacle placement. Log seed on load; `?seed=123` to reproduce “that unfair cluster.” Essential once movers (D9-B) exist.

---

## 8. Performance budget (write it on the wall)

Phase 0 targets:

- Desktop Chrome: **60 fps** in boost with warp on  
- Mid laptop: **≥45 fps**  
- Cap particles / avoid full-screen blurs until feel is done  
- Prefer few meshes + shader on ground over hundreds of objects  

If FPS drops: cut warp first, never cut input responsiveness.

---

## 9. Repo / Vercel hygiene

- App root = `tempo-warp/` (package.json here)  
- `.gitignore`: `node_modules`, `dist`, `.vercel`  
- Scripts: `dev`, `build`, `preview`  
- Deploy preview URLs for every feel experiment you care about (“was hush better yesterday?”)  
- Don’t commit giant raw stem WAVs if you can use compressed AAC/OGG under `public/audio/` + LICENSE note  

---

## 10. Playtest ritual (cheap)

After each meaningful feel change:

1. 60 seconds slow only  
2. 60 seconds hold-boost until shatter  
3. One “cold” run the next day without changing code  

If (3) feels worse, revert tuning — not the architecture.

---

## 11. AI-friendly file rules

When generating code with AI:

- Prefer small files: `player.ts`, `obstacles.ts`, `audioBus.ts`, `tuning.ts`  
- No God-object `main.ts` past ~150 lines — `main` only wires modules  
- Comment *intent* on curves (`// ease-out so early boost feels timid`), not what the line does  

---

## 12. Optional Cursor rule (nice later)

A short project rule: “no HUD/text in gameplay; all intensity from speed01; tuning in tuning.ts only.” Stops future sessions from “helpfully” adding a score or tutorial.

---

## Setup checklist when scaffold starts

- [ ] `tuning.ts` + `speed01`  
- [ ] `sim/` vs `view/` vs `audio/`  
- [ ] Fixed timestep  
- [ ] `?debug=1` + `?seed=` + `?audio=proc`  
- [ ] Vitest for 1–2 curve functions  
- [ ] `.gitignore` + Vercel from `tempo-warp/`  
- [ ] CC stem license file next to audio  

These are boring on day one and priceless on day ten.

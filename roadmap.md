# Tempo Warp — Roadmap

Web-first. Prove the feel before adding theme, content, or secondary difficulty axes.

**Locked for v1:** Velocity as the S-DDA axis · zero HUD · zero text · browser target.

See [BRIEF.md](./BRIEF.md) for design pillars and systems.

---

## Phase 0 — Vertical slice (this week)

Prove one sentence in the browser:

> Boost → world + music intensify → hit → shatter into hush → recover.

- [ ] Scaffold **Vite + TypeScript + Three.js** (or Pixi if flat 2D)
- [ ] Fullscreen canvas, keyboard/pointer: move + boost
- [ ] Player shape with velocity
- [ ] Boost stretches shape and raises speed
- [ ] Obstacles denser / harder as speed rises
- [ ] On hit: velocity → ~0, music drops to hush stem
- [ ] Slow zone stays safe until the player boosts again
- [ ] Record a ~30s clip — if it feels like “I am the difficulty slider,” continue

**Exit criteria:** Fun for you in a short loop. If not, retune — do not add content.

---

## Phase 1 — Silent onboarding

Still no words, prompts, or button diagrams.

- [ ] Enclosed safe sandbox at start
- [ ] One reactive object that teaches the verb by accident
- [ ] One organic gate that requires a short boost/commit to cross

**Exit criteria:** A new player crosses the gate without asking what to do.

---

## Phase 2 — Diegetic feedback

- [ ] Health = shape integrity / color / softness (not a bar)
- [ ] Flow = layered music (bass → melody → harmony with speed)
- [ ] Hurt / fail = desaturate, soften, filter highs → hush / heartbeat

**Exit criteria:** You can read state without any numbers or labels.

---

## Phase 3 — Playtest

- [ ] 3–5 people, watch silently
- [ ] Note every confusion; fix with environment, not tooltips
- [ ] Trim anything that needs explanation

**Exit criteria:** Someone plays ~5 minutes without asking “what do I do?”

---

## Phase 4 — Public demo

- [ ] Ship free web build (itch.io and/or own domain)
- [ ] Optional tip jar
- [ ] Collect one question: “Did you feel in control of difficulty?”

**Exit criteria:** Link you can send; no account required to try.

---

## Phase 5 — After the feel is proven (later)

Do **not** start these before Phase 3 passes.

- [ ] Secondary S-DDA axis: Density and/or Light
- [ ] Light theme / fiction (still no tutorial text)
- [ ] Cosmetic packs / OST (monetization that doesn’t sell difficulty)
- [ ] Mobile / touch controls pass
- [ ] Performance pass (mid-tier laptops + phones)

---

## Out of scope until later

- Traditional levels / score chase as the main loop
- Text tutorials, HUD, settings walls before first boost
- Selling “easy mode” or pay-to-skip difficulty
- Density/Light as primary before Velocity feels right

---

## Suggested order of work (checklist)

1. Scaffold web project  
2. Boost / hush feel loop  
3. Sandbox + organic gate  
4. Body + audio as HUD  
5. Playtest  
6. Public demo  
7. Only then: extra axes, theme, cosmetics  

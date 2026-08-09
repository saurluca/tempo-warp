# Game Brief — Tempo Warp (WIP title)

HUD-less, zero-text game where **how you move** is how you set difficulty. Design language inherited from *fl0w*, theme stripped out so the systems can stand alone.

---

## One-liner

Control a shifting shape in a reactive expanse. Go slow → calm and safe. Push forward → world, music, and geometry escalate with you. Fail → velocity shatters, world hush, recover at your own pace.

---

## The important questions (game edition)

Like a startup’s problem / solution / audience / money, a game needs a short set of load-bearing answers. These are the ones that matter here:

| Question | Answer (from the conversation) |
|---|---|
| **Player fantasy** — What does the player *feel* like? | Being in flow: a kinetic body that is also the UI; intuition over instruction. |
| **Core loop** — What do you repeatedly do? | Move → world reacts → risk rises with commitment → succeed or shatter → recover slow → commit again. |
| **Hook** — What’s uniquely yours in 5 seconds? | You *are* the difficulty slider. No menus: speed / space / light tune challenge through play. |
| **Win / lose / progress** | No traditional “levels.” Progress = deeper into denser / faster / darker zones; failure = snap back to a safe slow state, not a game-over screen. |
| **Onboarding** | Zero text, zero prompts. Accidental discovery + organic gatekeepers teach rules by environment. |
| **Controls (v1)** | Pointer aim; **hold** spools throttle (car-like accel + coast on release). |
| **Feedback / UI** | Diegetic only: body deformation, color, burst, music richness = health, skill, danger. |
| **Target player** | People who liked *fl0w* / *Flower* / *Journey* / *THUMPER*-adjacent sensory games; players who hate tutorials and HUDs. |
| **Comps** | *fl0w* (self-directed difficulty + diegetic body), plus modern “systems teach without words” design. |
| **Scope / MVP** | One axis of S-DDA + one avatar feedback channel + one silent sandbox room that teaches the verb. |
| **Open product decision** | Secondary axes (Density / Light) after Velocity feels right; theme deferred. |

**Decided:** Web-first · Velocity as v1 S-DDA axis. Monetization after the feel is proven (see roadmap).

---

## Design pillars

1. **Trust the player** — Never explain; make the easiest interaction the correct lesson.
2. **Self-tuned difficulty (S-DDA)** — Difficulty is a physical/spatial state the player chooses by where/how they go.
3. **Zero-text onboarding** — Affordances, sandboxes, organic gates. No button diagrams.
4. **Diegetic UI** — The avatar and audio *are* the HUD.

---

## Core systems

### 1. Spatial Dynamic Difficulty (S-DDA)

Difficulty is not a menu setting. It is mapped to a physical axis the player can see and enter/leave.

| Axis | Safe state | Hard state | Player control |
|---|---|---|---|
| **Velocity** | Slow = calm, predictable world | Fast = deforming space, more enemies/obstacles, hotter music | Stop pushing → world decelerates with you |
| **Density** | Open empty space | Chaotic hubs / storms (high risk, high reward) | Look ahead; choose whether to enter |
| **Light** | Bright = readable, forgiving | Shadow = hidden threats + needed resources | Enter darkness only when ready |

*fl0w* baseline: depth (surface safe / deep dangerous). Evolution: pick one (or blend later) of the three axes above.

**Recommended default for a first prototype:** **Velocity** — it matches the written concept summary (boost stretches shape, warps geometry, music tempo rises; fail → shatter into slow safe zone). Density and Light are strong secondary axes once velocity feels right.

### 2. Zero-text onboarding

**Accidental Discovery Sandbox**

- Start in a safe enclosed space.
- Only one meaningful input that changes state.
- Place a reactive object next to the player so the first press *accidentally* teaches the verb (sound + visual flair).

**Organic Gatekeeper (negative space barriers)**

- No locked doors / key prompts.
- Barrier only yields if the player has already practiced the mechanic (e.g. must be large/heavy enough to cross a current → grow by absorbing in the start room).

### 3. Diegetic UI (player = HUD)

| Signal | Healthy / flowing | Hurt / failing |
|---|---|---|
| Body | Pristine, glowing, rigid | Translucent, soft, slow, fragmented |
| Vision | Clear, saturated | Desaturated, blurred (*fl0w*-style) |
| Audio | Music adds bass / melody / harmony | Highs filter out → muffled heartbeat tension |

---

## Concept sketch (assembled)

- Avatar: kinetic, shifting shape.
- World: endless reactive expanse.
- No HUD, no text.
- Slow movement = quiet safe world.
- Boost = shape stretches, music intensifies, geometry warps into high-speed courses.
- Hit / fail = velocity shatters, ambient hush, slip into slow recovery zone at your own pace.

---

## Decisions

1. **Primary S-DDA axis (v1):** Velocity. Density / Light later.
2. **Platform:** Web (Vite + Bun + Three.js + Tone.js → Vercel).
3. **Style:** Neon, cool hush → warm surge; code-drawn primitives.
4. **Still open:** Theme / fiction (deferred), session length, business model (tip jar / OST / cosmetics after demo).

---

## Suggested MVP (smallest playable that proves the philosophy)

1. One verb (e.g. move + boost).
2. Velocity-linked world intensity + music.
3. Diegetic damage (shape integrity + audio drop).
4. One silent sandbox that teaches the verb by accident.
5. One organic gate that requires using that verb well.

If that feels right without a single word on screen, the design language works. Theme and secondary axes come after.

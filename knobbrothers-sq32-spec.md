# Knobbrothers SQ-32 — Product Spec

Browser-based step sequencer. No install, no account required.

---

## Stack

React 19 + Vite, plain CSS, no TypeScript.

---

## Current State (README baseline)

- 12 channels, 4/8/16/32 steps per pattern
- Per-channel: sample, volume, pan, swing, color
- Global swing + per-channel swing override
- Velocity editor (per-step, 1–127)
- Solo (radio-style) / Mute per channel
- MP3 export (offline render, respects solo/mute)
- Custom WAV sample upload per channel
- Light/Dark mode (persisted)

**Missing (to be built):**
- No save/load
- No undo
- Single pattern only (no song mode)
- No sample library

---

## Freemium Model

| Feature | Free | Pro |
|---|---|---|
| Sequencer core (12ch, 32 steps) | ✓ | ✓ |
| MP3 export | ✓ | ✓ |
| Save/load JSON (local) | ✓ | ✓ |
| Basic sample kits by genre | ✓ | ✓ |
| Song mode (pattern queue) | ✓ | ✓ |
| Shareable link (read-only) | ✓ | ✓ |
| WAV upload | ✓ | ✓ |
| WAV export (lossless) | — | ✓ |
| Stems export (per channel) | — | ✓ |
| MIDI export (.mid file) | — | ✓ |
| Cloud save (unlimited) | — | ✓ |
| Premium kits by genre | — | ✓ |
| Live collaboration | — | ✓ |
| Loop Layering Recorder | — | ✓ |

---

## Features — Priority Order

### 🔴 Critical (pre-launch)

**Save / Load patterns**
- Free: export/import JSON locally
- Pro: cloud save (unlimited slots)
- This is the freemium anchor — users who save come back

**Song Mode (pattern queue)**
- Simple ordered queue: A → B → C → ...
- User creates multiple patterns and chains them
- No complex arranger — a flat list is enough
- Trap, house, dub all depend on pattern variation

**Built-in sample library**
- Curated kits per genre: hip-hop, house, garage, dub
- Free: basic kits. Pro: premium kits
- Reduces abandonment on first visit

**Undo / Redo**
- 10 levels of history minimum
- Applies to step toggles and channel edits

---

### 🟡 Important (post-launch free)

**Step probability**
- Each step has a % chance of firing (0–100%)
- Makes patterns feel alive, not robotic
- Essential for dub and hip-hop feels

**Retriggering / Roll**
- Each step can retrigger 2x, 4x, 8x within its time slot
- Trap hi-hats and house fills depend on this

**Shareable link**
- Serialize full pattern state into URL
- Free: read-only link
- Pro: editable link (live collaboration)

---

### 🔵 Pro v1

**WAV export**
- Raw audio buffer + header — no external deps, native in browser
- Hours of work, not days

**Stems export**
- One WAV file per channel
- User imports into Ableton / FL Studio / Logic

**MIDI export (.mid)**
- Generate and download a `.mid` file
- No Web MIDI API, no hardware — just a file download
- Use `midi-writer-js` or equivalent
- User imports into any DAW

**Cloud save**
- Requires auth (account system)
- Unlimited pattern slots for Pro users

**Premium sample kits**
- Expanded kits per genre (hip-hop, house, garage, dub)

**Live collaboration**
- Shareable URL opens same session in another browser
- Two or more users edit simultaneously
- Cursors identified by color per user
- Requires WebSocket backend

**Loop Layering Recorder**
- See full spec below

---

## Loop Layering Recorder — Full Spec

Pro-only feature. Lets users build a full track live, layer by layer, without leaving the performance flow.

### Behavior

1. User activates Record Mode — loop starts playing
2. At the end of each complete loop, current state is automatically frozen as a new pattern (A, B, C...)
3. Each new pattern **inherits everything from the previous pattern** + edits made live during that loop
4. Patterns are added automatically to the Song Mode queue in creation order
5. User can keep editing live indefinitely — each loop generates a new snapshot

### States

| State | Behavior |
|---|---|
| Idle | Sequencer plays normally, no capture |
| Recording | Each loop end freezes current state as new pattern (with inheritance) |
| Playback | Song Mode plays the generated queue in sequence |

### Use cases

- **Live performance:** build a track from scratch in front of an audience, starting with just a kick and adding elements each loop
- **Studio:** capture beat variations in real time without stopping playback
- **Teaching:** demonstrate how a beat evolves layer by layer

### Reference

Similar to Ableton Live's Session Record + Overdub, but integrated directly into the step sequencer. Does not exist in any browser sequencer today.

---

## Export Strategy

| Format | Tier | Use case |
|---|---|---|
| MP3 | Free | Share on socials, quick reference |
| WAV | Pro | DAW import, lossless quality |
| Stems (WAV per channel) | Pro | Per-channel mixing in Ableton / FL |
| MIDI (.mid) | Pro | Import into any DAW as MIDI data |

---

## Mobile

Layout is inherently horizontal and dense. Required adaptations:

- Horizontal scroll per channel row (no compression)
- Tap-hold to open step options (velocity, probability) — replaces hover
- Larger Mute and Solo buttons (most-used controls during live performance)
- Default to landscape orientation on mobile

---

## Roadmap

| Phase | Deliverables |
|---|---|
| **Launch** | Save/load JSON · Built-in kits by genre · Song Mode (basic) · Undo/Redo |
| **Post-launch Free** | Step probability · Retriggering/Roll · Shareable read-only link |
| **Pro v1** | Live collaboration · Premium kits · Cloud save · WAV + Stems · MIDI export · Loop Layering Recorder |

---

## Out of Scope

Do not build these now:

- **MIDI input** — complex, small niche in the browser, distracts from core
- **Polyrhythm per channel** — UX and implementation cost not justified at this stage
- **Piano roll / melodic notes** — changes the product scope entirely
- **Per-channel effects (reverb, delay)** — Web Audio API supports it, but scope explodes fast
- **Complex song mode (full arranger)** — a flat pattern queue solves 90% of cases

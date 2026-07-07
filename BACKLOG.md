# Beat Sequencer — Backlog

## ✅ Done

### MC-WEB 808 Redesign (Feb 2026)
- Max 12 channels enforced in reducer and Add Channel button
- Channel label width: 180px (matched to playhead-row padding-left: 181px in Transport.css)
- Single panel toggle — `controlsOpen` drives both params + velocity (combined slot)
- Solo button left of Mute in `.channel-label`; radio-style, click again to unsolo; solo wins over mute; export respects solo; silenced channels get `.is-solo-silenced` class
- Mute button right of Solo; delete button moved into ChannelControls
- Sample popover — inline popover with select + upload; `useEffect mousedown` for outside-click close
- LENGTH buttons — segmented 4/8/16/32 (teal active = `var(--playhead)`); step 4 handled by `resizeStepArrays`
- ExportPanel passed as `exportSlot` prop to Transport (no longer in header)
- `velocityPanel` slot prop removed from ChannelRow; `onRemoveChannel` removed from ChannelRow props

### Phase 2 — Content & Song Structure (Mar 2026)
- **Built-in sample library** — `public/kits.json` with 5 kits (808 Classic, Minimal, Trap, Dub, Garage). KITS button in Transport opens `KitBrowser.jsx` with genre filter tabs.
- **Song Mode** — Multi-pattern state: `patterns[]`, `currentPatternIdx`, `arrangement[]`, `songMode`. Pattern tabs row with add/duplicate/delete/rename. `ArrangementPanel` for ordering patterns. Clock advances pattern at loop end when song mode is active. BPM/swing/stepCount are now per-pattern.

### Phase 1 — Infrastructure & Persistence (Mar 2026)
- **Central clock refactor** — Extracted scheduler/RAF loop from `useAudioEngine` into standalone `useClock.js`. Exposes `nextBarTime()` for future quantized scheduling (Backing Track, Launchpad). `useAudioEngine` is now a clock consumer.
- **Save / Load JSON** — Export pattern as `.sq32` file; import via file picker. Auto-save to `localStorage` on every state change (debounced 1s); session restored on page load with toast.
- **Undo / Redo** — History middleware around `useSequencer` reducer. 20-level stack. Snapshots composition actions (TOGGLE_STEP, SET_VELOCITY, UPDATE_CHANNEL, ADD/REMOVE_CHANNEL, etc.). Cmd+Z / Cmd+Shift+Z keybindings + Transport buttons.

### CSS Style Passes (Feb–Mar 2026)
- `step-btn` styling (active/inactive, playhead highlight)
- `ch-separator` channel row separators
- `vel-toggle-bar` velocity panel toggle
- CSS variables: `--active` (orange), `--playhead` (teal/cyan), `--bg`, `--surface`, `--surface2`, `--border`, `--text`, `--text-dim`, `--muted-color`, `--danger`

### Core Sequencer (baseline)
- 12 channels, 4/8/16/32 steps per pattern
- Per-channel: sample, volume, pan, swing, color
- Global swing + per-channel swing override
- Velocity editor (per-step, 1–127)
- Solo (radio-style) / Mute per channel
- MP3 export (offline render, respects solo/mute)
- Custom WAV sample upload per channel
- Light/Dark mode (persisted)

---

## 🔄 In Progress
<!-- Currently being worked on -->

---

## 📋 Backlog

### 🔴 Critical — Pre-launch *(from knobbrothers-sq32-spec.md, 2026-03-03)*

- ~~**Save / Load patterns**~~ ✅ Done (Mar 2026)
- ~~**Song Mode (pattern queue)**~~ ✅ Done (Mar 2026)
- ~~**Built-in sample library**~~ ✅ Done (Mar 2026)
- ~~**Undo / Redo**~~ ✅ Done (Mar 2026)

---

### 🟡 Important — Post-launch Free *(from knobbrothers-sq32-spec.md, 2026-03-03)*

- **Step probability** — Each step has a % chance of firing (0–100%). Makes patterns feel alive, not robotic. Essential for dub and hip-hop feels.
- **Retriggering / Roll** — Each step can retrigger 2×, 4×, 8× within its time slot. Trap hi-hats and house fills depend on this.
- **Shareable link** — Serialize full pattern state into URL. Free: read-only link; Pro: editable link (live collaboration).
- ~~**Central clock refactor**~~ ✅ Done (Mar 2026)

---

### 🟢 Post-launch Free v2 *(from knobbrothers-sq32-spec.md, 2026-03-03)*

- **Backing Track Loops** — Separate panel. User uploads WAV files and triggers loops in sync with the sequencer grid. Playback is not time-stretched (original tempo). Triggers quantized to next beat or bar via the central clock. Independent volume control. Free tier. Implementation: `AudioBufferSourceNode` fired at correct `AudioContext` time; calculate next bar boundary from clock and schedule there. **Requires central clock refactor first.** Complexity: low-medium.

---

### 🔵 Pro v1 *(from knobbrothers-sq32-spec.md, 2026-03-03)*

- **WAV export** — Raw audio buffer + header, no external deps, native in browser.
- **Stems export** — One WAV file per channel. User imports into Ableton / FL Studio / Logic.
- **MIDI export (.mid)** — Generate and download a `.mid` file. Use `midi-writer-js` or equivalent. No Web MIDI API required — just a file download.
- **Cloud save** — Requires auth (account system). Unlimited pattern slots for Pro users.
- **Premium sample kits** — Expanded kits per genre (hip-hop, house, garage, dub).
- **Live collaboration** — Shareable URL opens same session in another browser. Multiple users edit simultaneously; cursors identified by color. Requires WebSocket backend.
- **Loop Layering Recorder** — Pro-only. Record mode auto-freezes each loop as a new pattern with inheritance from the previous. Patterns auto-queued into Song Mode. Live performance / studio capture use case. Similar to Ableton Session Record + Overdub — does not exist in any browser sequencer today.
- **Launchpad — play live** — Separate panel of touchable pads mapped to samples. Triggered via `touchstart` (not `click`) for acceptable mobile latency. No recording, just real-time playback. **Requires central clock refactor.** Complexity: low.

---

### 🔵 Pro v2 *(from knobbrothers-sq32-spec.md, 2026-03-03)*

- **Launchpad — record with quantize to grid** — Captures tap timestamp via `AudioContext.currentTime`, calculates nearest step in the grid, applies quantize threshold (e.g. 50%) to snap to previous vs next step, writes directly into the sequencer pattern in real time. **Requires central clock refactor + Launchpad play live first.** Complexity: high — quantize engine is the real challenge, not the UI.

---

### 📱 Mobile *(from knobbrothers-sq32-spec.md, 2026-03-03)*

- Horizontal scroll per channel row (no layout compression)
- Tap-hold to open step options (velocity, probability) — replaces hover
- Larger Mute and Solo buttons (most-used controls during live performance)
- Default to landscape orientation on mobile

---

### 🚫 Out of Scope — Do Not Build
- MIDI input — complex, small niche in browser
- Polyrhythm per channel — UX and implementation cost not justified
- Piano roll / melodic notes — changes product scope entirely
- Per-channel effects (reverb, delay) — scope explodes fast
- Complex song mode (full arranger) — flat pattern queue solves 90% of cases

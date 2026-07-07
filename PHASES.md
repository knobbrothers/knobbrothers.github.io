# SQ-32 — Implementation Phases

Three phases ordered by dependency and launch impact.

---

## Phase 1 — Infrastructure & Persistence
**Goal:** Production-ready data layer. Users can save their work and nothing breaks when the clock is shared later.

### 1A · Central Clock Refactor

**Why first:** Clock is currently embedded inside `useAudioEngine.js`. Backing Track and Launchpad (Phase 3) need to share the same clock. Extract now while the codebase is simple.

**What changes:**
- Create `src/hooks/useClock.js` — owns `AudioContext`, `nextNoteTimeRef`, `currentStepRef`, tick interval, lookahead scheduler
- Exposes: `{ ctx, nextBarTime(bars), stepDuration, currentStep, start, stop }`
- `useAudioEngine.js` becomes a clock consumer — import `useClock`, remove internal clock logic
- App.jsx wires clock into both useAudioEngine and (later) backing track

**Files touched:** `useAudioEngine.js`, `App.jsx` · **New file:** `useClock.js`

---

### 1B · Save / Load JSON

**Why:** Freemium anchor. Users who can save their work come back.

**What changes:**
- **Export:** Serialize `state` (channels, bpm, swing, stepCount, arrangement) to JSON → trigger file download (`.sq32` extension)
- **Import:** File picker accepts `.sq32` / `.json` → `replaceAllChannels()` + restore bpm/swing/stepCount
- **Auto-save:** Debounced `localStorage.setItem('sq32-autosave', JSON.stringify(state))` on state change; restore on page load with a toast "Session restored"
- Custom sample audio blobs are referenced by filename only — warn user if sample file is missing on load

**Files touched:** `App.jsx`, `Transport.jsx` (save/load buttons in toolbar) · **New file:** `src/lib/serialize.js`

---

### 1C · Undo / Redo

**What changes:**
- Wrap `useSequencer` reducer with a history middleware: keep a `past[]` stack and `future[]` stack (max 20 snapshots)
- Only snapshot on: `TOGGLE_STEP`, `SET_VELOCITY`, `UPDATE_CHANNEL`, `ADD_CHANNEL`, `REMOVE_CHANNEL`
- Skip: `SET_PLAYING`, `SET_CURRENT_STEP` (runtime state, not composition)
- Keyboard: `Cmd/Ctrl+Z` = undo, `Cmd/Ctrl+Shift+Z` = redo; also Undo/Redo buttons in Transport
- Expose `{ canUndo, canRedo, undo, redo }` from `useSequencer`

**Files touched:** `useSequencer.js`, `Transport.jsx`

---

## Phase 2 — Content & Song Structure
**Goal:** Users can build real tracks. Multiple patterns. A sample library to reduce day-one abandonment.

### 2A · Built-in Sample Library

**What changes:**
- Add curated WAV samples to `public/samples/` organized by genre: `hip-hop/`, `house/`, `garage/`, `dub/`
- Add `public/kits.json` manifest: `[{ id, name, genre, files: [{name, path}] }]`
- Kit browser UI: a "Kits" button in Transport opens a panel listing genres → kits → one-click load
- Loading a kit calls existing `loadKit()` but reads from static paths instead of user file upload

**Files touched:** `Transport.jsx` · **New file:** `src/components/KitBrowser.jsx`, `public/kits.json`, sample WAV files

---

### 2B · Song Mode (Pattern Queue)

**What changes — state:**
```
// useSequencer state becomes:
{
  patterns: [ { id, name, channels, bpm, swing, stepCount }, ... ],
  currentPatternIdx: 0,
  arrangement: [ patternId, patternId, ... ],   // flat ordered queue
  songMode: false,
  playing: false,
  currentStep: -1,
}
```

- All existing actions scope to `patterns[currentPatternIdx]`
- New actions: `ADD_PATTERN`, `DUPLICATE_PATTERN`, `DELETE_PATTERN`, `SET_CURRENT_PATTERN`, `REORDER_ARRANGEMENT`, `TOGGLE_SONG_MODE`
- Pattern switcher UI: tab row above the sequencer grid (A, B, C... + "+" button)
- Song Mode toggle in Transport; when on, clock auto-advances to next pattern in arrangement at loop end
- Save/load (Phase 1B) must be updated to serialize `patterns[]` + `arrangement[]`

**Files touched:** `useSequencer.js`, `useAudioEngine.js` (advance pattern at loop end), `App.jsx`, `Transport.jsx` · **New file:** `src/components/PatternTabs.jsx`, `src/components/ArrangementPanel.jsx`

---

## Phase 3 — Expression & Live Performance
**Goal:** Patterns feel alive. First live performance features unlocked by the central clock (Phase 1A).

### 3A · Step Probability

**What changes:**
- Add `probability: Array(stepCount).fill(100)` to channel shape (default 100 = always fires)
- In `useClock.js` tick (or useAudioEngine): `if (Math.random() * 100 > ch.probability[step]) skip`
- UI: probability row in the velocity panel (same toggle pattern as velocity); range 0–100%; shown as a bar per step

**Files touched:** `useSequencer.js`, `useAudioEngine.js`, `VelocityPanel.jsx` (or new `ProbabilityPanel.jsx`)

---

### 3B · Retriggering / Roll

**What changes:**
- Add `roll: Array(stepCount).fill(1)` to channel shape (1 = off; 2, 4, 8 = subdivisions)
- In tick: when `roll[step] > 1`, divide `stepDuration` by roll value and schedule N `AudioBufferSourceNode` nodes at equal intervals within the step window, using lookahead `baseTime + (i * stepDuration / roll)`
- UI: per-step roll selector (1 / 2 / 4 / 8) — small segmented control or right-click context menu on step button

**Files touched:** `useSequencer.js`, `useAudioEngine.js`, `StepGrid.jsx`

---

### 3C · Backing Track Loops

**Requires:** Central clock (Phase 1A) with `nextBarTime(n)` implemented.

**What changes:**
- New reducer state: `backingTracks: [{ id, name, objectUrl, volume, active, looping }]`
- New actions: `ADD_BACKING_TRACK`, `REMOVE_BACKING_TRACK`, `UPDATE_BACKING_TRACK`
- Playback: when clock fires each bar boundary, check `active` backing tracks → schedule `AudioBufferSourceNode` at `nextBarTime(1)` (quantized to next bar)
- Panel: collapsible "Backing Tracks" section below the channel grid; upload WAV, volume knob, active toggle per slot
- Independent of solo/mute (backing tracks always play if active)

**Files touched:** `App.jsx`, `useAudioEngine.js` (or new `useBackingTrack.js`), `useClock.js` (expose `nextBarTime`) · **New file:** `src/components/BackingTrackPanel.jsx`

---

### 3D · Shareable Link

**What changes:**
- `src/lib/serialize.js` (from Phase 1B): add `encodeForUrl(state)` → base64url JSON of patterns + arrangement (excluding audio blobs — referenced by kit name or filename only)
- Share button in Transport → writes to `window.location.hash` → copies URL to clipboard
- On page load: if `location.hash` contains encoded state, offer "Load shared pattern?" prompt before auto-restore
- Custom uploaded samples: excluded from share (warn user); kit samples: included by kit ID reference

**Files touched:** `Transport.jsx`, `src/lib/serialize.js`

---

## Phase Summary

| Phase | Items | Unlocks |
|---|---|---|
| **1 — Infrastructure** | Clock refactor · Save/Load · Undo | Backing Track, Launchpad, everything else |
| **2 — Structure** | Sample library · Song Mode | Real tracks, day-1 retention |
| **3 — Expression** | Probability · Roll · Backing Track · Share | Live performance, virality |

## BACKLOG Status After Phases

After Phase 3, the remaining backlog will be:
- WAV export, Stems export, MIDI export (Pro v1)
- Cloud save, Live collaboration (Pro v1 — requires backend)
- Launchpad play live, Launchpad record+quantize (Pro v1/v2)
- Loop Layering Recorder (Pro v1)
- Mobile adaptations

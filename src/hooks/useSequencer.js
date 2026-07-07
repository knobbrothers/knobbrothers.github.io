import { useReducer, useCallback } from 'react'

// ─── Channel factory ────────────────────────────────────────────────────────

let _nextChannelId = 12  // starts after the 12 default channels (ids 0–11)

function makeChannel(id, name, sample, volume = 0.8, stepCount = 16) {
  return {
    id,
    name,
    sample,
    volume,
    pan:          0,
    swing:        0,
    muted:        false,
    solo:         false,
    steps:        Array(stepCount).fill(false),
    velocity:     Array(stepCount).fill(100),
    probability:  Array(stepCount).fill(100),
    roll:         Array(stepCount).fill(1),
  }
}

const STEP_COUNT = 16

const DEFAULT_CHANNELS = [
  { name: 'Kick',         sample: 'kick.wav',         volume: 0.85 },
  { name: 'Snare',        sample: 'snap.wav',         volume: 0.80 },
  { name: 'Hi-Hat Cl.',   sample: 'hihat-closed.wav', volume: 0.75 },
  { name: 'Hi-Hat Op.',   sample: 'hihat-open.wav',   volume: 0.70 },
  { name: 'Hi-Hat Op. 2', sample: 'hihat-open-2.wav', volume: 0.65 },
  { name: 'Clap',         sample: 'clap.wav',         volume: 0.80 },
  { name: 'Tambourine',   sample: 'tambourine.wav',   volume: 0.65 },
  { name: 'Perc 1',       sample: 'perc-1.wav',       volume: 0.75 },
  { name: 'Perc 2',       sample: 'perc-2.wav',       volume: 0.70 },
  { name: 'Bass',         sample: 'bass.wav',         volume: 0.80 },
  { name: 'Chord',        sample: 'chord.wav',        volume: 0.70 },
  { name: 'FX',           sample: 'fx.wav',           volume: 0.65 },
].map((ch, i) => makeChannel(i, ch.name, ch.sample, ch.volume, STEP_COUNT))

// Global channel fields — changes propagate to ALL patterns
const GLOBAL_CHANNEL_FIELDS = ['sample', 'name', 'volume', 'pan', 'swing']

// ─── Pattern factory ────────────────────────────────────────────────────────

let _nextPatternId = 1  // starts at 1 since only pattern A (id 0) is pre-allocated

function makePattern(id, name, channels, stepCount = STEP_COUNT, bpm = 120, swing = 0) {
  return { id, name, channels, stepCount, bpm, swing }
}

function makeBlankPattern(id, name) {
  const channels = DEFAULT_CHANNELS.map(ch => ({
    ...makeChannel(ch.id, ch.name, ch.sample, ch.volume, STEP_COUNT),
    pan: ch.pan, swing: ch.swing,
  }))
  return makePattern(id, name, channels, STEP_COUNT, 120, 0)
}

// ─── Backing track ID counter ───────────────────────────────────────────────

let _nextBackingTrackId = 0

// ─── Initial state ──────────────────────────────────────────────────────────

const initialState = {
  patterns: [
    makePattern(0, 'A', DEFAULT_CHANNELS),
  ],
  currentPatternIdx: 0,
  playingPatternIdx: 0,     // tracks which pattern audio is on (song mode only)
  songMode:          false,
  playing:           false,
  currentStep:       -1,
  backingTracks:     [],    // global: { id, name, objectUrl, volume, active }
  projectName:       'Default',
  masterVolume:      1.0,   // global: not in undo history
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resizeStepArrays(channels, newCount) {
  return channels.map(ch => {
    if (ch.steps.length === newCount) return ch
    const steps       = Array(newCount).fill(false).map((_, i) => ch.steps[i]           ?? false)
    const velocity    = Array(newCount).fill(100).map((_, i)   => ch.velocity[i]        ?? 100)
    const probability = Array(newCount).fill(100).map((_, i)   => ch.probability?.[i]   ?? 100)
    const roll        = Array(newCount).fill(1).map((_, i)     => ch.roll?.[i]           ?? 1)
    return { ...ch, steps, velocity, probability, roll }
  })
}

// Immutably patch fields of the current pattern
function patchCurrentPattern(state, patch) {
  const patterns = state.patterns.map((p, i) =>
    i === state.currentPatternIdx ? { ...p, ...patch } : p
  )
  return { ...state, patterns }
}

// Returns current pattern (convenience)
function current(state) {
  return state.patterns[state.currentPatternIdx]
}

// ─── Reducer ────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    // ── Step / velocity / probability / roll — scoped to current pattern ──────

    case 'TOGGLE_STEP': {
      const { channelId, stepIndex } = action
      return patchCurrentPattern(state, {
        channels: current(state).channels.map(ch => {
          if (ch.id !== channelId) return ch
          const steps = [...ch.steps]
          steps[stepIndex] = !steps[stepIndex]
          return { ...ch, steps }
        }),
      })
    }

    case 'SET_VELOCITY': {
      const { channelId, stepIndex, value } = action
      return patchCurrentPattern(state, {
        channels: current(state).channels.map(ch => {
          if (ch.id !== channelId) return ch
          const velocity = [...ch.velocity]
          velocity[stepIndex] = Math.max(1, Math.min(127, value))
          return { ...ch, velocity }
        }),
      })
    }

    case 'SET_PROBABILITY': {
      const { channelId, stepIndex, value } = action
      return patchCurrentPattern(state, {
        channels: current(state).channels.map(ch => {
          if (ch.id !== channelId) return ch
          const probability = [...(ch.probability ?? Array(ch.steps.length).fill(100))]
          probability[stepIndex] = Math.max(0, Math.min(100, value))
          return { ...ch, probability }
        }),
      })
    }

    case 'SET_ROLL': {
      const { channelId, stepIndex, value } = action
      return patchCurrentPattern(state, {
        channels: current(state).channels.map(ch => {
          if (ch.id !== channelId) return ch
          const roll = [...(ch.roll ?? Array(ch.steps.length).fill(1))]
          roll[stepIndex] = value
          return { ...ch, roll }
        }),
      })
    }

    case 'UPDATE_CHANNEL': {
      const { channelId, patch } = action
      // Split patch into global fields (propagate to all patterns) and local
      const globalPatch = {}, localPatch = {}
      for (const [k, v] of Object.entries(patch)) {
        GLOBAL_CHANNEL_FIELDS.includes(k) ? (globalPatch[k] = v) : (localPatch[k] = v)
      }

      // Find channel index by ID in current pattern
      const cidx = current(state).channels.findIndex(ch => ch.id === channelId)
      if (cidx === -1) return state

      return {
        ...state,
        patterns: state.patterns.map((pat, pi) => ({
          ...pat,
          channels: pat.channels.map((ch, ci) => {
            if (ci !== cidx) return ch
            const combined = pi === state.currentPatternIdx
              ? { ...globalPatch, ...localPatch }
              : globalPatch
            return Object.keys(combined).length ? { ...ch, ...combined } : ch
          }),
        })),
      }
    }

    case 'ADD_CHANNEL': {
      if (current(state).channels.length >= 12) return state
      const newId  = _nextChannelId++
      const name   = action.name   ?? 'Channel'
      const sample = action.sample ?? 'kick.wav'
      const volume = action.volume ?? 0.8
      return {
        ...state,
        patterns: state.patterns.map(pat => ({
          ...pat,
          channels: [...pat.channels, makeChannel(newId, name, sample, volume, pat.stepCount)],
        })),
      }
    }

    case 'SOLO_CHANNEL': {
      const { channelId } = action
      const target  = current(state).channels.find(ch => ch.id === channelId)
      const newSolo = !target?.solo
      return patchCurrentPattern(state, {
        channels: current(state).channels.map(ch => ({
          ...ch,
          solo: ch.id === channelId ? newSolo : false,
        })),
      })
    }

    case 'REMOVE_CHANNEL':
      return {
        ...state,
        patterns: state.patterns.map(pat => ({
          ...pat,
          channels: pat.channels.filter(ch => ch.id !== action.channelId),
        })),
      }

    case 'DUPLICATE_CHANNEL': {
      if (current(state).channels.length >= 12) return state
      const srcIdx = current(state).channels.findIndex(ch => ch.id === action.channelId)
      if (srcIdx === -1) return state
      const newId = _nextChannelId++
      // Clone the source channel (incl. steps/velocity/probability/roll) in
      // every pattern so the copy carries its programmed data, not a blank grid.
      return {
        ...state,
        patterns: state.patterns.map(pat => {
          const src = pat.channels[srcIdx]
          if (!src) return pat
          const copy = {
            ...src,
            id:          newId,
            name:        `${src.name} (copy)`,
            solo:        false,
            steps:       [...src.steps],
            velocity:    [...src.velocity],
            probability: [...(src.probability ?? src.steps.map(() => 100))],
            roll:        [...(src.roll ?? src.steps.map(() => 1))],
          }
          const channels = [...pat.channels]
          channels.splice(srcIdx + 1, 0, copy)
          return { ...pat, channels }
        }),
      }
    }

    case 'SET_BPM':
      return patchCurrentPattern(state, {
        bpm: Math.max(60, Math.min(200, action.value)),
      })

    case 'SET_SWING':
      return {
        ...state,
        patterns: state.patterns.map(pat => ({
          ...pat,
          swing: Math.max(0, Math.min(1, action.value)),
        })),
      }

    case 'SET_STEP_COUNT': {
      const newCount = action.value
      return patchCurrentPattern(state, {
        stepCount: newCount,
        channels:  resizeStepArrays(current(state).channels, newCount),
      })
    }

    // ── Global / runtime ──────────────────────────────────────────────────

    case 'SET_PLAYING': {
      const next = { ...state, playing: action.value }
      // On stop OR when starting in pattern mode: snap playingPatternIdx to selected tab
      if (!action.value || !state.songMode) {
        next.playingPatternIdx = state.currentPatternIdx
      }
      return next
    }

    case 'SET_CURRENT_STEP':
      // Bail out on redundant updates — fired from a rAF loop during playback,
      // and historyReducer skips the re-render when state is unchanged.
      if (state.currentStep === action.value) return state
      return { ...state, currentStep: action.value }

    case 'TOGGLE_SONG_MODE': {
      const next = { ...state, songMode: !state.songMode }
      if (state.songMode) {
        // leaving song mode → snap playingPatternIdx back to current tab
        next.playingPatternIdx = state.currentPatternIdx
      }
      return next
    }

    // ── Pattern management ────────────────────────────────────────────────

    case 'SET_CURRENT_PATTERN': {
      const idx = Math.max(0, Math.min(state.patterns.length - 1, action.idx))
      // In pattern mode (or stopped), playback follows the selected tab
      const playingPatternIdx = (!state.songMode || !state.playing)
        ? idx
        : state.playingPatternIdx
      return { ...state, currentPatternIdx: idx, playingPatternIdx }
    }

    // Advance to next pattern in tab order (called at song-mode loop end)
    case 'ADVANCE_SONG_PATTERN': {
      if (!state.songMode || state.patterns.length <= 1) return state
      return {
        ...state,
        playingPatternIdx: (state.playingPatternIdx + 1) % state.patterns.length,
      }
    }

    case 'REORDER_CHANNELS': {
      const { fromIdx, insertBefore } = action
      return {
        ...state,
        patterns: state.patterns.map(p => {
          const chs = [...p.channels]
          const [moved] = chs.splice(fromIdx, 1)
          const to = insertBefore > fromIdx ? insertBefore - 1 : insertBefore
          chs.splice(to, 0, moved)
          return { ...p, channels: chs }
        }),
      }
    }

    case 'REORDER_PATTERNS': {
      const { fromIdx, toIdx } = action
      const patterns = [...state.patterns]
      const [moved] = patterns.splice(fromIdx, 1)
      patterns.splice(toIdx, 0, moved)
      let next = state.currentPatternIdx
      if (fromIdx === next) next = toIdx
      else if (fromIdx < next && toIdx >= next) next--
      else if (fromIdx > next && toIdx <= next) next++
      return { ...state, patterns, currentPatternIdx: next }
    }

    // ── Backing tracks (global, not snapshotted in undo history) ─────────

    case 'ADD_BACKING_TRACK': {
      const newTrack = {
        id:        _nextBackingTrackId++,
        name:      action.name,
        objectUrl: action.objectUrl,
        volume:    0.8,
        active:    true,
      }
      return { ...state, backingTracks: [...state.backingTracks, newTrack] }
    }

    case 'REMOVE_BACKING_TRACK':
      return {
        ...state,
        backingTracks: state.backingTracks.filter(t => t.id !== action.id),
      }

    case 'UPDATE_BACKING_TRACK':
      return {
        ...state,
        backingTracks: state.backingTracks.map(t =>
          t.id === action.id ? { ...t, ...action.patch } : t
        ),
      }

    case 'SET_MASTER_VOLUME':
      return { ...state, masterVolume: Math.max(0, Math.min(1, action.value)) }

    case 'ADD_PATTERN': {
      if (state.patterns.length >= 4) return state
      const NAMES = ['A', 'B', 'C', 'D']
      const newId   = _nextPatternId++
      const newName = NAMES[state.patterns.length] ?? `P${newId}`
      // Copy channel structure from first pattern (names, samples, volume, pan, swing; blank steps)
      const templateChannels = state.patterns[0]?.channels ?? []
      const channels = templateChannels.map(ch =>
        makeChannel(ch.id, ch.name, ch.sample, ch.volume, STEP_COUNT)
      )
      const newPattern = makePattern(newId, newName, channels, STEP_COUNT, 120, 0)
      return { ...state, patterns: [...state.patterns, newPattern] }
    }

    case 'REMOVE_PATTERN': {
      if (state.patterns.length <= 1) return state
      const removedPos = state.patterns.findIndex(p => p.id === action.patternId)
      if (removedPos === -1) return state
      const patterns = state.patterns.filter(p => p.id !== action.patternId)
      // Shift indices that sat after the removed pattern so playback keeps its
      // place instead of snapping back to pattern A mid-song.
      const shift = (idx) =>
        Math.min(idx > removedPos ? idx - 1 : idx, patterns.length - 1)
      return {
        ...state,
        patterns,
        currentPatternIdx: shift(state.currentPatternIdx),
        playingPatternIdx: shift(state.playingPatternIdx),
      }
    }

    case 'RESET_STATE': {
      _nextChannelId = action.patterns[0]?.channels.length ?? 0
      _nextPatternId = action.patterns.length
      _nextBackingTrackId = 0
      return { ...initialState, patterns: action.patterns, projectName: action.projectName ?? 'Default' }
    }

    // ── Load serialised state ─────────────────────────────────────────────

    case 'LOAD_STATE': {
      const data = action.data

      // New format: has patterns array
      if (Array.isArray(data.patterns)) {
        _nextChannelId = Math.max(...data.patterns.map(p => p.channels.length), 6)
        const NAMES = ['A', 'B', 'C', 'D']
        // Load up to 4 patterns; dynamic count (no forced padding)
        const patterns = data.patterns.slice(0, 4).map((p, i) => ({
          ...p,
          id: i,
          name: NAMES[i] ?? p.name,
          channels: p.channels.map((ch, ci) => ({
            ...makeChannel(ci, ch.name, ch.sample, ch.volume ?? 0.8, p.stepCount ?? STEP_COUNT),
            pan:         ch.pan         ?? 0,
            swing:       ch.swing       ?? 0,
            muted:       ch.muted       ?? false,
            steps:       ch.steps       ?? Array(p.stepCount ?? STEP_COUNT).fill(false),
            velocity:    ch.velocity    ?? Array(p.stepCount ?? STEP_COUNT).fill(100),
            probability: ch.probability ?? Array(p.stepCount ?? STEP_COUNT).fill(100),
            roll:        ch.roll        ?? Array(p.stepCount ?? STEP_COUNT).fill(1),
          })),
        }))
        _nextPatternId = patterns.length
        return {
          ...state,
          patterns: patterns.length > 0 ? patterns : [makeBlankPattern(0, 'A')],
          currentPatternIdx: 0,
          songMode: false,
          projectName: data.projectName ?? state.projectName,
          masterVolume: data.masterVolume ?? state.masterVolume,
        }
      }

      // Legacy format: flat channels/bpm/swing/stepCount at top level
      const { bpm, swing, stepCount, channels } = data
      _nextChannelId = channels.length
      const sc = stepCount ?? STEP_COUNT
      const legacyPattern = {
        ...state.patterns[0],
        bpm:       bpm   ?? state.patterns[0].bpm,
        swing:     swing ?? state.patterns[0].swing,
        stepCount: sc,
        channels:  channels.map((ch, i) => ({
          ...makeChannel(i, ch.name, ch.sample, ch.volume ?? 0.8, sc),
          pan:         ch.pan         ?? 0,
          swing:       ch.swing       ?? 0,
          muted:       ch.muted       ?? false,
          steps:       (ch.steps?.length === sc) ? ch.steps    : Array(sc).fill(false).map((_, j) => ch.steps?.[j]    ?? false),
          velocity:    (ch.velocity?.length === sc) ? ch.velocity : Array(sc).fill(100).map((_, j) => ch.velocity?.[j] ?? 100),
          probability: ch.probability ?? Array(sc).fill(100),
          roll:        ch.roll        ?? Array(sc).fill(1),
        })),
      }
      return {
        ...state,
        patterns: [
          legacyPattern,
          makeBlankPattern(1, 'B'),
          makeBlankPattern(2, 'C'),
          makeBlankPattern(3, 'D'),
        ],
        currentPatternIdx: 0,
        masterVolume: data.masterVolume ?? state.masterVolume,
      }
    }

    default:
      return state
  }
}

// ─── History middleware ─────────────────────────────────────────────────────

const MAX_HISTORY = 20

const UNDOABLE = new Set([
  'TOGGLE_STEP', 'SET_VELOCITY', 'UPDATE_CHANNEL',
  'ADD_CHANNEL', 'REMOVE_CHANNEL', 'SET_STEP_COUNT',
  'SET_BPM', 'SET_SWING', 'DUPLICATE_CHANNEL',
  'SET_PROBABILITY', 'SET_ROLL',
  'REORDER_CHANNELS',
])

function historyReducer(history, action) {
  // Loading a project (autosave restore, file, or share link) starts a fresh
  // history — you can't undo "past" a load back into the previous session.
  if (action.type === 'RESET_STATE' || action.type === 'LOAD_STATE') {
    return { past: [], present: reducer(history.present, action), future: [] }
  }

  if (action.type === 'UNDO') {
    if (!history.past.length) return history
    const previous = history.past[history.past.length - 1]
    return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] }
  }

  if (action.type === 'REDO') {
    if (!history.future.length) return history
    const next = history.future[0]
    return { past: [...history.past, history.present].slice(-MAX_HISTORY), present: next, future: history.future.slice(1) }
  }

  const newPresent = reducer(history.present, action)
  if (newPresent === history.present) return history

  if (UNDOABLE.has(action.type)) {
    return { past: [...history.past, history.present].slice(-MAX_HISTORY), present: newPresent, future: [] }
  }

  return { ...history, present: newPresent }
}

const initialHistory = { past: [], present: initialState, future: [] }

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSequencer() {
  const [history, dispatch] = useReducer(historyReducer, initialHistory)
  const raw = history.present

  // Flatten active pattern fields to the top level so all existing
  // consumers (useAudioEngine, components) see the same API as before.
  const activePattern = raw.patterns[raw.currentPatternIdx]
  const state = {
    // From active pattern — same fields as before:
    channels:          activePattern.channels,
    bpm:               activePattern.bpm,
    swing:             activePattern.swing,
    stepCount:         activePattern.stepCount,
    // Global runtime:
    playing:           raw.playing,
    currentStep:       raw.currentStep,
    // Song mode extras (new):
    patterns:          raw.patterns,
    currentPatternIdx: raw.currentPatternIdx,
    playingPatternIdx: raw.playingPatternIdx,
    songMode:          raw.songMode,
    // Backing tracks (global):
    backingTracks:     raw.backingTracks,
    // Project metadata:
    projectName:       raw.projectName ?? 'Default',
    // Master volume (global, non-undoable):
    masterVolume:      raw.masterVolume ?? 1.0,
  }

  // ── Existing callbacks (unchanged API) ───────────────────────────────────
  const toggleStep       = useCallback((channelId, stepIndex) => dispatch({ type: 'TOGGLE_STEP',       channelId, stepIndex }), [])
  const setVelocity      = useCallback((channelId, stepIndex, value) => dispatch({ type: 'SET_VELOCITY', channelId, stepIndex, value }), [])
  const setProbability   = useCallback((channelId, stepIndex, value) => dispatch({ type: 'SET_PROBABILITY', channelId, stepIndex, value }), [])
  const setRoll          = useCallback((channelId, stepIndex, value) => dispatch({ type: 'SET_ROLL', channelId, stepIndex, value }), [])
  const updateChannel    = useCallback((channelId, patch) => dispatch({ type: 'UPDATE_CHANNEL',    channelId, patch }), [])
  const addChannel            = useCallback(() => dispatch({ type: 'ADD_CHANNEL' }), [])
  const addChannelWithSample  = useCallback((name, sample, volume = 0.8) =>
    dispatch({ type: 'ADD_CHANNEL', name, sample, volume }), [])
  const removeChannel    = useCallback((channelId) => dispatch({ type: 'REMOVE_CHANNEL',    channelId }), [])
  const duplicateChannel = useCallback((channelId) => dispatch({ type: 'DUPLICATE_CHANNEL', channelId }), [])
  const setBpm           = useCallback((value) => dispatch({ type: 'SET_BPM',   value: Number(value) }), [])
  const setSwing         = useCallback((value) => dispatch({ type: 'SET_SWING', value: Number(value) }), [])
  const setStepCount     = useCallback((value) => dispatch({ type: 'SET_STEP_COUNT', value: Number(value) }), [])
  const setPlaying       = useCallback((value) => dispatch({ type: 'SET_PLAYING',      value }), [])
  const setCurrentStep   = useCallback((value) => dispatch({ type: 'SET_CURRENT_STEP', value }), [])
  const soloChannel      = useCallback((channelId) => dispatch({ type: 'SOLO_CHANNEL',      channelId }), [])
  const loadState        = useCallback((data) => dispatch({ type: 'LOAD_STATE', data }), [])
  const undo             = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const redo             = useCallback(() => dispatch({ type: 'REDO' }), [])

  // ── Song mode callbacks ───────────────────────────────────────────────────
  const setCurrentPattern  = useCallback((idx) => dispatch({ type: 'SET_CURRENT_PATTERN', idx }), [])
  const toggleSongMode     = useCallback(() => dispatch({ type: 'TOGGLE_SONG_MODE' }), [])
  const advanceSongPattern = useCallback(() => dispatch({ type: 'ADVANCE_SONG_PATTERN' }), [])
  const reorderPatterns    = useCallback((fromIdx, toIdx) => dispatch({ type: 'REORDER_PATTERNS', fromIdx, toIdx }), [])
  const reorderChannels    = useCallback((fromIdx, insertBefore) => dispatch({ type: 'REORDER_CHANNELS', fromIdx, insertBefore }), [])

  // ── New project ───────────────────────────────────────────────────────────
  const newProject = useCallback((kit, stepCount = 16, projectName = 'Default') => {
    const channels = kit
      ? kit.channels.map((kc, ci) =>
          makeChannel(ci, kc.name, kc.sample, kc.volume ?? 0.8, stepCount)
        )
      : DEFAULT_CHANNELS.map(ch => makeChannel(ch.id, ch.name, ch.sample, ch.volume, stepCount))
    const patterns = [makePattern(0, 'A', channels, stepCount, 120, 0)]
    dispatch({ type: 'RESET_STATE', patterns, projectName })
  }, [])

  // ── Backing track callbacks ───────────────────────────────────────────────
  const addBackingTrack    = useCallback((name, objectUrl) => dispatch({ type: 'ADD_BACKING_TRACK', name, objectUrl }), [])
  const removeBackingTrack = useCallback((id) => dispatch({ type: 'REMOVE_BACKING_TRACK', id }), [])
  const updateBackingTrack = useCallback((id, patch) => dispatch({ type: 'UPDATE_BACKING_TRACK', id, patch }), [])

  // ── Master volume ─────────────────────────────────────────────────────────
  const setMasterVolume = useCallback((value) => dispatch({ type: 'SET_MASTER_VOLUME', value }), [])

  // ── Dynamic pattern management ────────────────────────────────────────────
  const addPattern    = useCallback(() => dispatch({ type: 'ADD_PATTERN' }), [])
  const removePattern = useCallback((patternId) => dispatch({ type: 'REMOVE_PATTERN', patternId }), [])

  return {
    state,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    // Existing:
    toggleStep, setVelocity, updateChannel, addChannel, removeChannel, duplicateChannel,
    setBpm, setSwing, setStepCount, setPlaying, setCurrentStep,
    soloChannel, loadState, undo, redo,
    // Probability + roll:
    setProbability, setRoll,
    // Song mode:
    setCurrentPattern, toggleSongMode, advanceSongPattern, reorderPatterns, reorderChannels, newProject,
    // Backing tracks:
    addBackingTrack, removeBackingTrack, updateBackingTrack,
    // Drag-drop:
    addChannelWithSample,
    // Master volume:
    setMasterVolume,
    // Dynamic patterns:
    addPattern, removePattern,
  }
}

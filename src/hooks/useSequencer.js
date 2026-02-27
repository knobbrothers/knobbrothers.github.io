import { useReducer, useCallback } from 'react'

// ─── Default channels ──────────────────────────────────────────────────────

const STEP_COUNT = 16

const DEFAULT_CHANNELS = [
  { name: 'Kick',         sample: 'kick.wav',         volume: 0.85 },
  { name: 'Snare',        sample: 'snare.wav',         volume: 0.8  },
  { name: 'Hi-Hat Cl.',   sample: 'hihat-closed.wav',  volume: 0.75 },
  { name: 'Hi-Hat Op.',   sample: 'hihat-open.wav',    volume: 0.7  },
  { name: 'Clap',         sample: 'clap.wav',          volume: 0.8  },
  { name: 'Tom',          sample: 'tom.wav',           volume: 0.75 },
].map((ch, i) => makeChannel(i, ch.name, ch.sample, ch.volume, STEP_COUNT))

let _nextId = DEFAULT_CHANNELS.length

function makeChannel(id, name, sample, volume = 0.8, stepCount = 16) {
  return {
    id,
    name,
    sample,
    volume,
    pan: 0,          // -1.0 to 1.0
    swing: 0,        // 0.0 to 1.0 (per-channel swing override; 0 = use global)
    muted: false,
    solo: false,
    velocityOpen: false,
    controlsOpen: false,
    steps: Array(stepCount).fill(false),
    velocity: Array(stepCount).fill(100), // 1–127
  }
}

// ─── Initial state ─────────────────────────────────────────────────────────

const initialState = {
  channels: DEFAULT_CHANNELS,
  bpm: 120,
  swing: 0,       // global swing 0.0–1.0
  stepCount: STEP_COUNT,
  playing: false,
  currentStep: -1,
}

// ─── Reducer ───────────────────────────────────────────────────────────────

function resizeStepArrays(channels, newCount) {
  return channels.map(ch => {
    if (ch.steps.length === newCount) return ch
    const steps = Array(newCount).fill(false).map((_, i) => ch.steps[i] ?? false)
    const velocity = Array(newCount).fill(100).map((_, i) => ch.velocity[i] ?? 100)
    return { ...ch, steps, velocity }
  })
}

function reducer(state, action) {
  switch (action.type) {

    case 'TOGGLE_STEP': {
      const { channelId, stepIndex } = action
      return {
        ...state,
        channels: state.channels.map(ch => {
          if (ch.id !== channelId) return ch
          const steps = [...ch.steps]
          steps[stepIndex] = !steps[stepIndex]
          return { ...ch, steps }
        }),
      }
    }

    case 'SET_VELOCITY': {
      const { channelId, stepIndex, value } = action
      return {
        ...state,
        channels: state.channels.map(ch => {
          if (ch.id !== channelId) return ch
          const velocity = [...ch.velocity]
          velocity[stepIndex] = Math.max(1, Math.min(127, value))
          return { ...ch, velocity }
        }),
      }
    }

    case 'UPDATE_CHANNEL': {
      const { channelId, patch } = action
      return {
        ...state,
        channels: state.channels.map(ch =>
          ch.id === channelId ? { ...ch, ...patch } : ch
        ),
      }
    }

    case 'ADD_CHANNEL': {
      if (state.channels.length >= 12) return state
      const id = _nextId++
      const ch = makeChannel(id, 'Channel', 'kick.wav', 0.8, state.stepCount)
      return { ...state, channels: [...state.channels, ch] }
    }

    case 'SOLO_CHANNEL': {
      const { channelId } = action
      const target = state.channels.find(ch => ch.id === channelId)
      const newSolo = !target?.solo
      return {
        ...state,
        channels: state.channels.map(ch => ({
          ...ch,
          solo: ch.id === channelId ? newSolo : false,
        })),
      }
    }

    case 'REMOVE_CHANNEL': {
      return {
        ...state,
        channels: state.channels.filter(ch => ch.id !== action.channelId),
      }
    }

    case 'SET_BPM':
      return { ...state, bpm: Math.max(60, Math.min(200, action.value)) }

    case 'SET_SWING':
      return { ...state, swing: Math.max(0, Math.min(1, action.value)) }

    case 'SET_STEP_COUNT': {
      const newCount = action.value
      return {
        ...state,
        stepCount: newCount,
        channels: resizeStepArrays(state.channels, newCount),
      }
    }

    case 'SET_PLAYING':
      return { ...state, playing: action.value }

    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.value }

    default:
      return state
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSequencer() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const toggleStep = useCallback((channelId, stepIndex) =>
    dispatch({ type: 'TOGGLE_STEP', channelId, stepIndex }), [])

  const setVelocity = useCallback((channelId, stepIndex, value) =>
    dispatch({ type: 'SET_VELOCITY', channelId, stepIndex, value }), [])

  const updateChannel = useCallback((channelId, patch) =>
    dispatch({ type: 'UPDATE_CHANNEL', channelId, patch }), [])

  const addChannel = useCallback(() =>
    dispatch({ type: 'ADD_CHANNEL' }), [])

  const removeChannel = useCallback((channelId) =>
    dispatch({ type: 'REMOVE_CHANNEL', channelId }), [])

  const setBpm = useCallback((value) =>
    dispatch({ type: 'SET_BPM', value: Number(value) }), [])

  const setSwing = useCallback((value) =>
    dispatch({ type: 'SET_SWING', value: Number(value) }), [])

  const setStepCount = useCallback((value) =>
    dispatch({ type: 'SET_STEP_COUNT', value: Number(value) }), [])

  const setPlaying = useCallback((value) =>
    dispatch({ type: 'SET_PLAYING', value }), [])

  const setCurrentStep = useCallback((value) =>
    dispatch({ type: 'SET_CURRENT_STEP', value }), [])

  const soloChannel = useCallback((channelId) =>
    dispatch({ type: 'SOLO_CHANNEL', channelId }), [])

  return {
    state,
    toggleStep,
    setVelocity,
    updateChannel,
    addChannel,
    removeChannel,
    setBpm,
    setSwing,
    setStepCount,
    setPlaying,
    setCurrentStep,
    soloChannel,
  }
}

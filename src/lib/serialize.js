// ─── Pattern serialization ──────────────────────────────────────────────────
// Converts sequencer state to/from a portable JSON format (.sq32 files).
// Only composition data is saved — UI state (velocityOpen, controlsOpen, solo)
// and custom sample blobs are excluded.

const FORMAT_VERSION = 1

function serializeChannel(ch) {
  return {
    name:        ch.name,
    sample:      ch.sample,
    volume:      ch.volume,
    pan:         ch.pan,
    swing:       ch.swing,
    muted:       ch.muted,
    steps:       ch.steps,
    velocity:    ch.velocity,
    probability: ch.probability,
    roll:        ch.roll,
  }
}

// Single source of truth for the persisted payload — shared by file save,
// autosave, and share links so their schemas can't drift apart.
function buildPayload(state) {
  return {
    version:      FORMAT_VERSION,
    projectName:  state.projectName ?? 'Default',
    masterVolume: state.masterVolume ?? 1.0,
    patterns: state.patterns.map(p => ({
      id:        p.id,
      name:      p.name,
      bpm:       p.bpm,
      swing:     p.swing,
      stepCount: p.stepCount,
      channels:  p.channels.map(serializeChannel),
    })),
  }
}

export function serializeState(state) {
  return JSON.stringify(buildPayload(state), null, 2)
}

export function deserializeState(json, fallbackFilename = '') {
  const data = JSON.parse(json)
  if (!data.version) throw new Error('Invalid pattern file')

  // Derive projectName: use saved value, else derive from filename
  let projectName = data.projectName
  if (!projectName && fallbackFilename) {
    const base = fallbackFilename.replace(/\.sq32$/i, '').replace(/\.json$/i, '')
    // Ignore auto-generated names like 'sq32-1234567890'
    projectName = /^sq32-\d+$/.test(base) ? 'Default' : base
  }
  projectName = projectName || 'Default'

  // New multi-pattern format
  if (Array.isArray(data.patterns)) {
    return { patterns: data.patterns, projectName, masterVolume: data.masterVolume }
  }

  // Legacy single-pattern format
  if (Array.isArray(data.channels)) {
    return {
      bpm:          data.bpm       ?? 120,
      swing:        data.swing     ?? 0,
      stepCount:    data.stepCount ?? 16,
      channels:     data.channels,
      projectName,
      masterVolume: data.masterVolume,
    }
  }

  throw new Error('Invalid pattern file')
}

export function downloadPatternFile(state) {
  const json = serializeState(state)
  const slug = (state.projectName || 'Default')
    .replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '-') || 'project'
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${slug}.sq32`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── URL encoding for shareable links ──────────────────────────────────────

export function encodeForUrl(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(buildPayload(state)))))
}

export function decodeFromUrl(hash) {
  const cleaned = hash.replace(/^#/, '')
  return JSON.parse(decodeURIComponent(escape(atob(cleaned))))
}

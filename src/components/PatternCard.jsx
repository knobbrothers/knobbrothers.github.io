import './PatternCard.css'

export function PatternCard({ pattern, isActive, isPlaying, stepCount, onClick, onRemove }) {
  // Build merged mini step preview: a step is "on" if ANY channel has it active
  const count = pattern.stepCount ?? stepCount ?? 16
  const merged = Array(count).fill(false)
  pattern.channels.forEach(ch => {
    ch.steps.forEach((on, i) => {
      if (on && i < count) merged[i] = true
    })
  })

  // Group into beat groups of 4
  const groups = []
  for (let i = 0; i < merged.length; i += 4) {
    groups.push({ start: i, steps: merged.slice(i, i + 4) })
  }

  return (
    <div
      className={[
        'pattern-card',
        isActive  ? 'active'  : '',
        isPlaying ? 'playing' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <div className="pc-header">
        <span className="pc-name">{pattern.name}</span>
        <div className="pc-meta">
          <span className="pc-bpm">{pattern.bpm} BPM</span>
          <span className="pc-steps">{pattern.stepCount} steps</span>
        </div>
        {onRemove && (
          <button
            className="pc-remove"
            onClick={e => { e.stopPropagation(); onRemove() }}
            title="Remove pattern"
            aria-label="Remove pattern"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Mini step grid */}
      <div className="pc-grid">
        {groups.map(({ steps }, gi) => (
          <div key={gi} className="pc-group">
            {steps.map((on, j) => (
              <div
                key={j}
                className={`pc-step${on ? ' active' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>

      {isPlaying && <div className="pc-playing-badge">▶ PLAYING</div>}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <polyline points="2,3 11,3"/>
      <path d="M4 3V2h5v1"/>
      <rect x="3" y="4" width="7" height="7" rx="1"/>
    </svg>
  )
}

import './Transport.css'

export function Transport({
  bpm,
  swing,
  stepCount,
  playing,
  currentStep,
  onPlayStop,
  onBpmChange,
  onSwingChange,
  onStepCountChange,
  exportSlot,
}) {
  function handleBpmInput(e) {
    const v = Number(e.target.value)
    if (!isNaN(v) && v >= 60 && v <= 200) onBpmChange(v)
  }

  function handleBpmKey(e) {
    if (e.key === 'ArrowUp')   onBpmChange(Math.min(200, bpm + 1))
    if (e.key === 'ArrowDown') onBpmChange(Math.max(60,  bpm - 1))
  }

  function handleSwing(e) {
    onSwingChange(Number(e.target.value) / 100)
  }

  return (
    <div className="transport">
      <div className="transport-controls">

        {/* Left group: play + bpm */}
        <div className="transport-left">
          <button
            className={`play-btn ${playing ? 'playing' : 'stopped'}`}
            onClick={onPlayStop}
            aria-label={playing ? 'Stop' : 'Play'}
          >
            {playing ? (
              <>
                <StopIcon />
                STOP
              </>
            ) : (
              <>
                <PlayIcon />
                PLAY
              </>
            )}
          </button>

          <div className="ctrl-group bpm-group">
            <span className="ctrl-label">BPM</span>
            <span className="bpm-divider">|</span>
            <input
              type="number"
              className="bpm-input"
              min={60}
              max={200}
              value={bpm}
              onChange={handleBpmInput}
              onKeyDown={handleBpmKey}
              aria-label="BPM value"
            />
          </div>
        </div>

        {/* Right group: swing + length + export */}
        <div className="transport-right">
          <div className="ctrl-group swing-group">
            <span className="ctrl-label">SWING</span>
            <input
              type="range"
              className="ctrl-slider swing-slider"
              min={0}
              max={100}
              value={Math.round(swing * 100)}
              onChange={handleSwing}
              aria-label="Global swing"
            />
            <span className="ctrl-value">{Math.round(swing * 100)}%</span>
          </div>

          <div className="ctrl-group length-group">
            <span className="ctrl-label">LENGTH</span>
            {[4, 8, 16, 32].map(n => (
              <button
                key={n}
                className={`length-btn${stepCount === n ? ' active' : ''}`}
                onClick={() => onStepCountChange(n)}
                aria-pressed={stepCount === n}
              >{n}</button>
            ))}
          </div>

          <div className="transport-export">{exportSlot}</div>
        </div>

      </div>

      {/* Playhead indicator row */}
      <div className="playhead-row" aria-hidden="true">
        {Array.from({ length: stepCount }, (_, i) => (
          <div
            key={i}
            className={[
              'playhead-pip',
              i === currentStep ? 'active' : '',
              i % 4 === 0 ? 'beat-start' : '',
            ].join(' ').trim()}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="currentColor" aria-hidden="true">
      <path d="M2 1.5l9 5-9 5V1.5z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" rx="1" />
    </svg>
  )
}

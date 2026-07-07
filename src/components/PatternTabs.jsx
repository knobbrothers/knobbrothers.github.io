import { useRef, useState } from 'react'
import './PatternTabs.css'

export function PatternTabs({
  patterns,
  currentIdx,
  onSelect,
  songMode,
  onReorder,
  onToggleSongMode,
  playingPatternIdx,
  playing,
  onPlayStop,
  bpm,
  onBpmChange,
  stepCount,
  onSetStepCount,
  masterVolume,
  onSetMasterVolume,
  swing,
  onSetSwing,
  onAddPattern,
}) {
  const dragSrc = useRef(null)
  const [bpmDraft, setBpmDraft] = useState(null)

  function handleBpmFocus() {
    setBpmDraft(String(bpm))
  }

  function handleBpmChange(e) {
    setBpmDraft(e.target.value)
  }

  function handleBpmCommit() {
    const v = Number(bpmDraft)
    if (!isNaN(v) && v >= 60 && v <= 200) onBpmChange(v)
    setBpmDraft(null)
  }

  function handleBpmKey(e) {
    if (e.key === 'Enter')  { e.target.blur(); return }
    if (e.key === 'Escape') { setBpmDraft(null); e.target.blur(); return }
    if (bpmDraft === null) {
      if (e.key === 'ArrowUp')   onBpmChange(Math.min(200, bpm + 1))
      if (e.key === 'ArrowDown') onBpmChange(Math.max(60,  bpm - 1))
    }
  }

  return (
    <div className="pattern-bar">
      {/* Play + BPM */}
      <div className="transport-center-box">
        <button
          className={`play-btn${playing ? ' playing' : ''}`}
          onClick={onPlayStop}
          aria-label={playing ? 'Stop' : 'Play'}
        >
          {playing ? <StopIcon /> : <PlayIcon />}
        </button>

        <div className="t-bpm-pill">
          <div className="t-bpm-label-pill">
            <span className="t-label">BPM</span>
          </div>
          <div className="t-bpm-value-pill">
            <input
              type="number"
              className="bpm-input"
              min={60}
              max={200}
              value={bpmDraft !== null ? bpmDraft : bpm}
              onFocus={handleBpmFocus}
              onChange={handleBpmChange}
              onBlur={handleBpmCommit}
              onKeyDown={handleBpmKey}
              aria-label="BPM value"
            />
          </div>
        </div>
      </div>

      {/* Pattern / Song toggle */}
      <div className="pattern-mode-seg">
        <button
          className={`pattern-mode-btn${!songMode ? ' active' : ''}`}
          onClick={() => songMode && onToggleSongMode()}
        >Pattern</button>
        <button
          className={`pattern-mode-btn${songMode ? ' active' : ''}`}
          onClick={() => !songMode && onToggleSongMode()}
        >Song</button>
      </div>

      {/* Pattern tabs */}
      <div className="pattern-tabs-scroll">
        {patterns.map((p, i) => {
          const isPlaying = songMode && playing && i === playingPatternIdx
          return (
            <div
              key={p.id}
              className={[
                'pattern-tab',
                i === currentIdx ? 'active' : '',
                isPlaying        ? 'playing' : '',
                songMode         ? 'draggable' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelect(i)}
              draggable={songMode}
              onDragStart={() => { dragSrc.current = i }}
              onDragOver={e => { if (songMode) e.preventDefault() }}
              onDrop={e => {
                e.preventDefault()
                if (songMode && dragSrc.current !== null && dragSrc.current !== i) {
                  onReorder(dragSrc.current, i)
                  dragSrc.current = null
                }
              }}
            >
              <span className="pattern-tab-name">{p.name}</span>
            </div>
          )
        })}
        {/* Add pattern slot — always show if < 4 patterns */}
        {patterns.length < 4 && (
          <button
            className="pattern-tab-add"
            onClick={onAddPattern}
            title="Add pattern"
            aria-label="Add pattern"
          >
            +
          </button>
        )}
      </div>

      {/* Right controls: Steps + Master + Swing */}
      <div className="pattern-bar-right">
        <div className="steps-pill">
          <div className="steps-pill-label">Steps</div>
          <div className="steps-pill-select-wrap">
            <select
              className="steps-select"
              value={stepCount}
              onChange={e => onSetStepCount(Number(e.target.value))}
            >
              {[...new Set([12, 16, 24, 32, stepCount])]
                .sort((a, b) => a - b)
                .map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="pb-group">
          <div className="pb-info">
            <span className="pb-label">Master</span>
            <span className="pb-value">{Math.round((masterVolume ?? 1) * 100)}</span>
          </div>
          <input
            type="range"
            className="pb-slider"
            style={{ '--val': `${Math.round((masterVolume ?? 1) * 100)}%` }}
            min={0}
            max={100}
            value={Math.round((masterVolume ?? 1) * 100)}
            onChange={e => onSetMasterVolume(Number(e.target.value) / 100)}
            aria-label="Master volume"
          />
        </div>

        <div className="pb-group">
          <div className="pb-info">
            <span className="pb-label">Swing</span>
            <span className="pb-value">{Math.round(swing * 100)}%</span>
          </div>
          <input
            type="range"
            className="pb-slider"
            style={{ '--val': `${Math.round(swing * 100)}%` }}
            min={0}
            max={100}
            value={Math.round(swing * 100)}
            onChange={e => onSetSwing(Number(e.target.value) / 100)}
            aria-label="Global swing"
          />
        </div>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" fill="currentColor" aria-hidden="true">
      <path d="M2 1.5l9 5-9 5V1.5z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" rx="1" />
    </svg>
  )
}

import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { StepGrid } from './StepGrid'
import './ChannelRow.css'

const ROLL_OPTIONS = [1, 2, 4, 8]

export function ChannelRow({
  channel,
  stepCount,
  currentStep,
  onToggleStep,
  onUpdateChannel,
  onSetVelocity,
  onSetProbability,
  onSetRoll,
  onRemoveChannel,
  onUploadSample,
  hasSolo,
  onSoloChannel,
  isDragging,
  onChannelDragStart,
  onChannelDragOver,
  onChannelDrop,
  onChannelDragEnd,
  isExpanded,
  onToggleExpand,
  onDuplicateChannel,
  onCopyChannel,
  onPasteChannel,
}) {
  const fileInputRef  = useRef(null)
  const dragAllowed   = useRef(false)
  const [ctxOpen, setCtxOpen] = useState(false)
  const ctxRef = useRef(null)

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxOpen) return
    function onDown(e) {
      if (ctxRef.current && !ctxRef.current.contains(e.target)) setCtxOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [ctxOpen])

  function handleNameBlur(e) {
    const trimmed = e.target.value.trim()
    onUpdateChannel(channel.id, { name: trimmed || channel.name })
  }

  function handleNameKey(e) {
    if (e.key === 'Enter') e.target.blur()
    if (e.key === 'Escape') {
      e.target.value = channel.name
      e.target.blur()
    }
  }

  function toggleMute() {
    onUpdateChannel(channel.id, { muted: !channel.muted })
  }

  const isSoloSilenced = hasSolo && !channel.solo

  // ── Slider configs for expansion panel bottom bar ─────────────────────────
  const ctrlSliders = [
    { label: 'VOL',   key: 'volume', min: 0,    max: 100, val: Math.round((channel.volume ?? 1) * 100), toState: v => v / 100, unit: '' },
    { label: 'SWING', key: 'swing', min: 0,     max: 100, val: Math.round((channel.swing  ?? 0) * 100), toState: v => v / 100, unit: '%' },
    { label: 'PAN',   key: 'pan',   min: -100,  max: 100, val: Math.round((channel.pan    ?? 0) * 100), toState: v => v / 100, unit: '' },
  ]

  return (
    <div
      className={[
        'channel-row',
        channel.muted ? 'is-muted' : '',
        isSoloSilenced ? 'is-solo-silenced' : '',
        isDragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      draggable
      onDragStart={e => {
        if (!dragAllowed.current) { e.preventDefault(); return }
        onChannelDragStart()
      }}
      onDragOver={onChannelDragOver}
      onDrop={onChannelDrop}
      onDragEnd={() => { dragAllowed.current = false; onChannelDragEnd() }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="channel-header">
        {/* Drag handle */}
        <div
          className="ch-drag-handle"
          onMouseDown={() => { dragAllowed.current = true }}
          onMouseUp={() => { dragAllowed.current = false }}
          aria-hidden="true"
        >
          <DragHandleIcon />
        </div>

        {/* Solo button */}
        <button
          className={`ch-icon-btn solo-btn${channel.solo ? ' soloed' : ''}`}
          onClick={() => onSoloChannel(channel.id)}
          title={channel.solo ? 'Unsolo' : 'Solo'}
          aria-label={channel.solo ? 'Unsolo channel' : 'Solo channel'}
          aria-pressed={channel.solo}
        >
          S
        </button>

        {/* Mute button */}
        <button
          className={`ch-icon-btn mute-btn${channel.muted ? ' muted' : ''}`}
          onClick={toggleMute}
          title={channel.muted ? 'Unmute' : 'Mute'}
          aria-label={channel.muted ? 'Unmute channel' : 'Mute channel'}
          aria-pressed={channel.muted}
        >
          <i className="fa-solid fa-volume-xmark" aria-hidden="true" />
        </button>

        {/* Channel name */}
        <div className="ch-name-wrap">
          <input
            className="ch-name"
            type="text"
            defaultValue={channel.name}
            key={channel.name}
            maxLength={24}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKey}
            aria-label="Channel name"
          />
        </div>

        {/* Right actions */}
        <div className="ch-right-actions">
          {/* Expand toggle */}
          <button
            className={`ch-icon-btn ch-icon-btn--lg${isExpanded ? ' soloed' : ''}`}
            onClick={onToggleExpand}
            title={isExpanded ? 'Collapse' : 'Expand'}
            aria-label={isExpanded ? 'Collapse channel' : 'Expand channel'}
          >
            <i className="fa-solid fa-chart-simple" aria-hidden="true" />
          </button>

          {/* Context menu */}
          <div ref={ctxRef} className="ch-ctx-wrap">
            <button
              className={`ch-icon-btn ch-icon-btn--lg${ctxOpen ? ' soloed' : ''}`}
              onClick={() => setCtxOpen(v => !v)}
              title="More options"
              aria-label="Channel options"
            >
              <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />
            </button>
            {ctxOpen && (
              <div className="ch-ctx-menu">
                <button className="ch-ctx-item" onClick={() => { onDuplicateChannel(); setCtxOpen(false) }}>
                  <DupIcon /> Duplicate
                </button>
                <div className="ch-ctx-sep" />
                <button className="ch-ctx-item" onClick={() => { onCopyChannel(); setCtxOpen(false) }}>
                  <CopyIcon /> Copy
                </button>
                <button
                  className="ch-ctx-item"
                  onClick={() => { if (onPasteChannel) { onPasteChannel(); setCtxOpen(false) } }}
                  disabled={!onPasteChannel}
                  style={{ opacity: onPasteChannel ? 1 : 0.4 }}
                >
                  <PasteIcon /> Paste
                </button>
                <div className="ch-ctx-sep" />
                <button className="ch-ctx-item" onClick={() => { fileInputRef.current?.click(); setCtxOpen(false) }}>
                  <UploadIcon /> Upload Sample
                </button>
                <div className="ch-ctx-sep" />
                <button className="ch-ctx-item danger" onClick={() => { onRemoveChannel(channel.id); setCtxOpen(false) }}>
                  <i className="fa-solid fa-trash" aria-hidden="true" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Step grid ────────────────────────────────────────────────────── */}
      <div className="ch-grid-card">
        <StepGrid
          channel={channel}
          stepCount={stepCount}
          currentStep={currentStep}
          onToggleStep={onToggleStep}
          onSetRoll={onSetRoll}
        />
      </div>

      {/* ── Expansion toggle bar ──────────────────────────────────────────── */}
      <button
        className="ch-expand-bar"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>

      {/* ── Expansion panel ───────────────────────────────────────────────── */}
      <div className={`ch-expand-wrap${isExpanded ? ' open' : ''}`}>
        <div className="ch-expand-inner">
          {/* Sub-rows: Velocity, Probability, Roll */}
          <SubRows
            channel={channel}
            onSetVelocity={onSetVelocity}
            onSetProbability={onSetProbability}
            onSetRoll={onSetRoll}
          />

          {/* Bottom controls bar */}
          <div className="ch-controls-bar">
            {ctrlSliders.map(s => (
              <div key={s.key} className="ch-ctrl-group">
                <span className="ch-ctrl-label">{s.label}</span>
                <span className="ch-ctrl-value">{s.val}{s.unit}</span>
                <input
                  type="range"
                  className="ch-ctrl-slider"
                  min={s.min}
                  max={s.max}
                  value={s.val}
                  onChange={e => onUpdateChannel(channel.id, { [s.key]: s.toState(Number(e.target.value)) })}
                  aria-label={s.label}
                />
              </div>
            ))}
            <div className="ch-controls-bar-actions">
              <button
                className="ch-ctrl-pill-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload sample"
                aria-label="Upload sample"
              >
                <UploadIcon /> Upload
              </button>
              <button
                className="ch-ctrl-pill-btn danger"
                onClick={() => onRemoveChannel(channel.id)}
                title="Delete channel"
                aria-label="Delete channel"
              >
                <i className="fa-solid fa-trash" aria-hidden="true" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept=".wav,.mp3,audio/*"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onUploadSample(channel.id, f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Sub-rows component ──────────────────────────────────────────────────────

function SubRows({ channel, onSetVelocity, onSetProbability, onSetRoll }) {
  const steps       = channel.steps
  const velocity    = channel.velocity    ?? Array(steps.length).fill(100)
  const probability = channel.probability ?? Array(steps.length).fill(100)
  const roll        = channel.roll        ?? Array(steps.length).fill(1)

  // Build beat groups matching StepGrid
  const groups = []
  for (let i = 0; i < steps.length; i += 4) {
    groups.push({ start: i, items: steps.slice(i, i + 4) })
  }

  return (
    <div className="ch-subrows">
      <SubRow label="VEL" groups={groups} render={(i, active) => (
        <DragCell
          value={velocity[i]}
          active={active}
          onDrag={v => onSetVelocity(channel.id, i, Math.max(1, Math.min(127, Math.round(v * 127))))}
          display={v => Math.round(v * 127)}
          normalize={v => v / 127}
        />
      )} />
      <SubRow label="PROB" groups={groups} render={(i, active) => (
        <DragCell
          value={probability[i]}
          active={active}
          onDrag={v => onSetProbability(channel.id, i, Math.max(0, Math.min(100, Math.round(v * 100))))}
          display={v => Math.round(v * 100) + '%'}
          normalize={v => v / 100}
        />
      )} />
      <SubRow label="ROLL" groups={groups} render={(i, active) => (
        <RollCell
          value={roll[i] ?? 1}
          active={active}
          onChange={v => onSetRoll(channel.id, i, v)}
        />
      )} />
    </div>
  )
}

function SubRow({ label, groups, render }) {
  return (
    <div className="ch-subrow">
      <span className="ch-subrow-label">{label}</span>
      <div className="ch-subrow-steps">
        {groups.map(({ start, items }, gi) => (
          <div key={gi} className="ch-subrow-group">
            {items.map((active, j) => (
              <div key={j} style={{ flex: 1 }}>
                {render(start + j, active)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function DragCell({ value, active, onDrag, display, normalize }) {
  const draggingRef = useRef(false)
  const startYRef   = useRef(0)
  const startValRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [rect, setRect] = useState(null)   // cell bounds for the floating value bubble

  // Pointer Events unify mouse + touch + pen; setPointerCapture keeps move/up
  // events flowing to the cell even when the finger drifts off it. Combined with
  // `touch-action: none` on the cell (CSS), the drag never scrolls the page.
  const handlePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    startYRef.current   = e.clientY
    startValRef.current = value
    setRect(e.currentTarget.getBoundingClientRect())
    setDragging(true)
  }, [value])

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return
    const delta = (startYRef.current - e.clientY) / 100
    const newNorm = Math.max(0, Math.min(1, normalize(startValRef.current) + delta))
    onDrag(newNorm)
  }, [onDrag, normalize])

  const endDrag = useCallback(() => {
    draggingRef.current = false
    setDragging(false)
    setRect(null)
  }, [])

  return (
    <>
      <div
        className={`ch-subrow-cell${!active ? ' inactive' : ''}${dragging ? ' dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {active ? display(normalize(value)) : '–'}
      </div>
      {dragging && rect && createPortal(
        <div
          className="ch-drag-bubble"
          style={{ left: rect.left + rect.width / 2, top: rect.top }}
        >
          {display(normalize(value))}
        </div>,
        document.body
      )}
    </>
  )
}

function RollCell({ value, active, onChange }) {
  function handleClick() {
    if (!active) return
    const idx = ROLL_OPTIONS.indexOf(value)
    const next = ROLL_OPTIONS[(idx + 1) % ROLL_OPTIONS.length]
    onChange(next)
  }

  return (
    <div
      className={`ch-subrow-cell roll-cell${!active ? ' inactive' : value > 1 ? ' active-roll' : ''}`}
      onClick={handleClick}
      title={active ? 'Click to cycle roll' : undefined}
    >
      {active ? `×${value}` : '–'}
    </div>
  )
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 1v8M3 4l3-3 3 3"/>
      <path d="M1 10h10"/>
    </svg>
  )
}

function DragHandleIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/>
      <circle cx="3" cy="7"   r="1.2"/><circle cx="7" cy="7"   r="1.2"/>
      <circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/>
    </svg>
  )
}

function DupIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1"/>
      <path d="M2 8V2h6"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1"/>
      <path d="M2 8V2h6"/>
    </svg>
  )
}

function PasteIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="8" height="8" rx="1"/>
      <path d="M4 3V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1"/>
    </svg>
  )
}

import { useRef, useCallback } from 'react'
import './VelocityPanel.css'

export function VelocityPanel({ channel, onSetVelocity }) {
  const containerRef = useRef(null)
  const draggingRef  = useRef(false)
  const activeColRef = useRef(null) // tracks which column index is being dragged

  // ── Coordinate helpers ───────────────────────────────────────────────────

  function getStepFromX(clientX) {
    const rect = containerRef.current.getBoundingClientRect()
    const relX = (clientX - rect.left) / rect.width
    const idx  = Math.floor(relX * channel.steps.length)
    return Math.max(0, Math.min(channel.steps.length - 1, idx))
  }

  function getVelocityFromY(clientY) {
    const rect = containerRef.current.getBoundingClientRect()
    const relY = (clientY - rect.top) / rect.height
    return Math.max(1, Math.min(127, Math.round((1 - relY) * 127)))
  }

  // ── Mouse drag ───────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    draggingRef.current = true

    const step = getStepFromX(e.clientX)
    const vel  = getVelocityFromY(e.clientY)
    activeColRef.current = step
    onSetVelocity(channel.id, step, vel)

    function onMove(e) {
      if (!draggingRef.current) return
      const step = getStepFromX(e.clientX)
      const vel  = getVelocityFromY(e.clientY)
      activeColRef.current = step
      onSetVelocity(channel.id, step, vel)
    }

    function onUp() {
      draggingRef.current  = false
      activeColRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }, [channel.id, channel.steps.length, onSetVelocity])

  // ── Touch drag ───────────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    draggingRef.current = true

    const step = getStepFromX(touch.clientX)
    const vel  = getVelocityFromY(touch.clientY)
    activeColRef.current = step
    onSetVelocity(channel.id, step, vel)

    function onMove(e) {
      if (!draggingRef.current) return
      const touch = e.touches[0]
      const step  = getStepFromX(touch.clientX)
      const vel   = getVelocityFromY(touch.clientY)
      activeColRef.current = step
      onSetVelocity(channel.id, step, vel)
    }

    function onEnd() {
      draggingRef.current  = false
      activeColRef.current = null
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend',  onEnd)
    }

    document.addEventListener('touchmove', onMove, { passive: true })
    document.addEventListener('touchend',  onEnd)
  }, [channel.id, channel.steps.length, onSetVelocity])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="velocity-section">
    <div className="velocity-header">
      <span className="velocity-label">VELOCITY</span>
    </div>
    <div
      ref={containerRef}
      className="velocity-panel"
      style={{ '--step-count': channel.steps.length }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      aria-label={`Velocity for ${channel.name}`}
    >
      {channel.steps.map((active, i) => {
        const pct = (channel.velocity[i] / 127) * 100

        return (
          <div
            key={i}
            className={[
              'vel-col',
              !active              ? 'inactive'   : '',
              i % 4 === 0          ? 'beat-start' : '',
              activeColRef.current === i && draggingRef.current ? 'dragging' : '',
            ].filter(Boolean).join(' ')}
          >
            <div
              className="vel-bar"
              style={{ height: `${pct}%` }}
            />
            <span className="vel-value">{channel.velocity[i]}</span>
          </div>
        )
      })}
    </div>
    </div>
  )
}

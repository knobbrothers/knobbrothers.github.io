import React, { useState, useEffect, useRef } from 'react'
import './StepGrid.css'

const ROLL_OPTIONS = [1, 2, 4, 8]

function StepGridInner({ channel, currentStep, onToggleStep, onSetRoll }) {
  const [rollMenu, setRollMenu] = useState(null) // { channelId, stepIdx, x, y } | null
  const menuRef = useRef(null)
  const dragRef = useRef({ active: false, value: false })

  useEffect(() => {
    const stop = () => { dragRef.current.active = false }
    window.addEventListener('mouseup', stop)
    return () => window.removeEventListener('mouseup', stop)
  }, [])

  // Close roll menu on outside mousedown
  useEffect(() => {
    if (!rollMenu) return
    function onDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setRollMenu(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [rollMenu])

  function handleContextMenu(e, stepIdx) {
    e.preventDefault()
    setRollMenu({ channelId: channel.id, stepIdx, x: e.clientX, y: e.clientY })
  }

  function handleSetRoll(value) {
    if (rollMenu) {
      onSetRoll?.(rollMenu.channelId, rollMenu.stepIdx, value)
      setRollMenu(null)
    }
  }

  const roll = channel.roll ?? []

  // Group steps into chunks of 4
  const groups = []
  for (let i = 0; i < channel.steps.length; i += 4) {
    groups.push({ startIndex: i, steps: channel.steps.slice(i, i + 4) })
  }

  return (
    <>
      <div className="step-grid">
        {groups.map(({ startIndex, steps }, gi) => (
          <div key={gi} className={`step-group${gi % 2 === 1 ? ' step-group-alt' : ''}`}>
            {steps.map((active, j) => {
              const i         = startIndex + j
              const isCurrent = i === currentStep
              const rollVal   = roll[i] ?? 1
              const classes   = [
                'step-btn',
                active    ? 'active'  : '',
                isCurrent ? 'current' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={i}
                  className={classes}
                  onMouseDown={e => {
                    e.preventDefault()
                    dragRef.current = { active: true, value: !active }
                    onToggleStep(channel.id, i)
                  }}
                  onMouseEnter={() => {
                    if (!dragRef.current.active) return
                    if (active !== dragRef.current.value) onToggleStep(channel.id, i)
                  }}
                  onContextMenu={e => handleContextMenu(e, i)}
                  draggable={false}
                  aria-label={`Step ${i + 1} ${active ? 'on' : 'off'}`}
                  aria-pressed={active}
                >
                  {rollVal > 1 && (
                    <span className="roll-badge" aria-hidden="true">×{rollVal}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Roll context menu — rendered in a portal-like fixed overlay */}
      {rollMenu && (
        <div
          ref={menuRef}
          className="roll-menu"
          style={{ left: rollMenu.x, top: rollMenu.y }}
        >
          {ROLL_OPTIONS.map(v => {
            const currentRoll = roll[rollMenu.stepIdx] ?? 1
            return (
              <button
                key={v}
                className={`roll-menu-btn${currentRoll === v ? ' active' : ''}`}
                onClick={() => handleSetRoll(v)}
              >
                ×{v}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

export const StepGrid = React.memo(StepGridInner)

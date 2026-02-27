import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { SAMPLE_NAMES } from '../constants'
import './ChannelControls.css'

export function ChannelControls({ channel, onUpdateChannel, onRemoveChannel, customSamples = [], onUploadSample }) {
  const fileInputRef = useRef(null)
  const sampleBtnRef = useRef(null)
  const samplePopoverRef = useRef(null)
  const [sampleOpen, setSampleOpen] = useState(false)
  const [popoverAnchor, setPopoverAnchor] = useState(null)

  function handleVolume(e) {
    onUpdateChannel(channel.id, { volume: Number(e.target.value) / 100 })
  }

  function handlePan(e) {
    onUpdateChannel(channel.id, { pan: Number(e.target.value) / 100 })
  }

  function handleSwing(e) {
    onUpdateChannel(channel.id, { swing: Number(e.target.value) / 100 })
  }

  function handleSample(e) {
    onUpdateChannel(channel.id, { sample: e.target.value })
    setSampleOpen(false)
  }

  function toggleSample() {
    if (sampleOpen) {
      setSampleOpen(false)
    } else {
      if (sampleBtnRef.current) {
        const rect = sampleBtnRef.current.getBoundingClientRect()
        setPopoverAnchor({ top: rect.top, left: rect.left })
      }
      setSampleOpen(true)
    }
  }

  // Close on outside click — checks both the button and the portal popover
  useEffect(() => {
    if (!sampleOpen) return

    function handleOutsideClick(e) {
      if (
        !sampleBtnRef.current?.contains(e.target) &&
        !samplePopoverRef.current?.contains(e.target)
      ) {
        setSampleOpen(false)
      }
    }

    // setTimeout skips the click that opened the popover;
    // 'click' (not 'mousedown') fires after native <select> change
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [sampleOpen])

  return (
    <div className="channel-controls">
      <div className="params-row">

        {/* VOL */}
        <div className="param-ctrl">
          <span className="param-label">VOL</span>
          <span className="param-value">{Math.round(channel.volume * 100)}</span>
          <input type="range" className="param-slider" min={0} max={100}
            value={Math.round(channel.volume * 100)} onChange={handleVolume}
            aria-label="Volume" />
        </div>

        {/* PAN */}
        <div className="param-ctrl">
          <span className="param-label">PAN</span>
          <span className="param-value">{Math.round(channel.pan * 100)}</span>
          <input type="range" className="param-slider pan-slider" min={-100} max={100}
            value={Math.round(channel.pan * 100)} onChange={handlePan}
            aria-label="Pan" />
        </div>

        {/* SWING */}
        <div className="param-ctrl">
          <span className="param-label">SWING</span>
          <span className="param-value">{Math.round(channel.swing * 100)}%</span>
          <input type="range" className="param-slider" min={0} max={100}
            value={Math.round(channel.swing * 100)} onChange={handleSwing}
            aria-label="Channel swing" />
        </div>

        <div className="params-divider" />

        {/* Sample button + portal popover */}
        <div className="sample-ctrl">
          <button ref={sampleBtnRef} className="sample-btn" onClick={toggleSample}>
            <UploadIcon /> Sample
          </button>

          {/* Always mounted so onChange fires even if the popover closes mid-dialog */}
          <input type="file" accept=".wav,.mp3,audio/*" style={{ display: 'none' }} ref={fileInputRef}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) onUploadSample(channel.id, f)
              e.target.value = ''
              setSampleOpen(false)
            }} />

          {/* Portal — renders outside overflow:hidden ancestors so it's never clipped */}
          {sampleOpen && popoverAnchor && createPortal(
            <div
              ref={samplePopoverRef}
              className="sample-popover"
              style={{
                position: 'fixed',
                top: popoverAnchor.top,
                left: popoverAnchor.left,
                transform: 'translateY(calc(-100% - 6px))',
              }}
            >
              <select className="sample-select" value={channel.sample} onChange={handleSample}>
                {customSamples.map(s => (
                  <option key={s.name} value={s.name}>{s.name.replace(/\.(wav|mp3)$/i, '')} ★</option>
                ))}
                {SAMPLE_NAMES.map(name => (
                  <option key={name} value={name}>{name.replace('.wav', '')}</option>
                ))}
              </select>
              <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
                <UploadIcon /> Upload
              </button>
            </div>,
            document.body
          )}
        </div>

        {/* Delete */}
        <button className="icon-btn danger" onClick={() => onRemoveChannel(channel.id)}
          title="Delete channel" aria-label="Delete channel">
          <DeleteIcon />
        </button>

      </div>
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

function DeleteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <polyline points="2,3 11,3"/>
      <path d="M4 3V2h5v1"/>
      <rect x="3" y="4" width="7" height="7" rx="1"/>
      <line x1="5.5" y1="6.5" x2="5.5" y2="9"/>
      <line x1="7.5" y1="6.5" x2="7.5" y2="9"/>
    </svg>
  )
}

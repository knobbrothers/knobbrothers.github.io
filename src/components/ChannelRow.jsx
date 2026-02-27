import { useRef } from 'react'

const CHANNEL_COLORS = [
  '#e87c1a', // orange   (ch 0 — matches app accent)
  '#ff4757', // red coral
  '#ffd43b', // yellow
  '#a9e34b', // lime
  '#38d9a9', // mint
  '#00b4d8', // cyan     (matches playhead)
  '#4dabf7', // sky blue
  '#748ffc', // periwinkle
  '#9d4edd', // purple
  '#da77f2', // lavender
  '#f783ac', // pink
  '#ff6b81', // rose
]
import { StepGrid } from './StepGrid'
import './ChannelRow.css'

export function ChannelRow({
  channel,
  stepCount,
  currentStep,
  onToggleStep,
  onUpdateChannel,
  hasSolo,
  onSoloChannel,
  controlsPanel,
}) {
  const nameRef = useRef(null)

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

  function toggleControls() {
    onUpdateChannel(channel.id, { controlsOpen: !channel.controlsOpen })
  }

  const isSoloSilenced = hasSolo && !channel.solo

  return (
    <div
      className={[
        'channel-row',
        channel.muted ? 'is-muted' : '',
        isSoloSilenced ? 'is-solo-silenced' : '',
      ].filter(Boolean).join(' ')}
      style={{ '--ch-color': CHANNEL_COLORS[channel.id % CHANNEL_COLORS.length] }}
    >
      <div className="channel-main">

        {/* Left label panel */}
        <div className="channel-label">
          <button
            className={`icon-btn solo-btn${channel.solo ? ' soloed' : ''}`}
            onClick={() => onSoloChannel(channel.id)}
            title={channel.solo ? 'Unsolo' : 'Solo'}
            aria-label={channel.solo ? 'Unsolo channel' : 'Solo channel'}
            aria-pressed={channel.solo}
          >
            S
          </button>

          <button
            className={`icon-btn mute-btn${channel.muted ? ' muted' : ''}`}
            onClick={toggleMute}
            title={channel.muted ? 'Unmute' : 'Mute'}
            aria-label={channel.muted ? 'Unmute channel' : 'Mute channel'}
            aria-pressed={channel.muted}
          >
            {channel.muted ? <MuteOnIcon /> : <MuteOffIcon />}
          </button>

          <input
            ref={nameRef}
            className="channel-name"
            type="text"
            defaultValue={channel.name}
            key={channel.name}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKey}
            aria-label="Channel name"
          />
        </div>

        {/* Step grid */}
        <div className="step-grid-scroll">
          <StepGrid
            channel={channel}
            stepCount={stepCount}
            currentStep={currentStep}
            onToggleStep={onToggleStep}
          />
        </div>

      </div>

      {/* Show/Hide Params & Velocity toggle bar */}
      <button
        className="params-toggle-bar"
        onClick={toggleControls}
        aria-expanded={channel.controlsOpen}
      >
        <SliderIcon />
        {channel.controlsOpen ? 'HIDE PARAMS & VELOCITY' : 'SHOW PARAMS & VELOCITY'}
      </button>

      {/* Collapsible combined panel */}
      {controlsPanel && (
        <div className={`channel-panel-wrap${channel.controlsOpen ? ' open' : ''}`}>
          <div className="channel-panel-inner">
            <div className="channel-panel">{controlsPanel}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function MuteOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M2 5h2l3-3v10L4 9H2V5zm8.5 2a3 3 0 0 0-1.5-2.6v5.2A3 3 0 0 0 10.5 7z"/>
    </svg>
  )
}

function MuteOnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M2 5h2l3-3v10L4 9H2V5z"/>
      <line x1="9" y1="5" x2="13" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="13" y1="5" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function SliderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="4"  cy="4"  r="1.5"/>
      <line x1="1"  y1="4"  x2="2.5" y2="4"/>
      <line x1="5.5" y1="4"  x2="13" y2="4"/>
      <circle cx="10" cy="10" r="1.5"/>
      <line x1="1"  y1="10" x2="8.5" y2="10"/>
      <line x1="11.5" y1="10" x2="13" y2="10"/>
    </svg>
  )
}

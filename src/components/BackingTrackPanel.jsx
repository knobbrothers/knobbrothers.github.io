import { useRef } from 'react'
import './BackingTrackPanel.css'

export function BackingTrackPanel({
  backingTracks,
  onAdd,
  onRemove,
  onUpdate,
}) {
  const fileInputRef = useRef(null)

  function handleFiles(e) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const objectUrl = URL.createObjectURL(file)
      const name      = file.name.replace(/\.[^.]+$/, '')
      onAdd(name, objectUrl)
    })
    e.target.value = ''
  }

  return (
    <div className="backing-panel">
      <div className="backing-panel-header">
        <span className="backing-panel-title">BACKING TRACKS</span>
        <button
          className="backing-add-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Add WAV backing track"
        >
          + ADD
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".wav,audio/wav"
          multiple
          style={{ display: 'none' }}
          onChange={handleFiles}
        />
      </div>

      {backingTracks.length === 0 && (
        <p className="backing-empty">No backing tracks. Click + ADD to upload a WAV loop.</p>
      )}

      <div className="backing-track-list">
        {backingTracks.map(track => (
          <div key={track.id} className={`backing-track${track.active ? '' : ' inactive'}`}>
            <button
              className={`backing-active-btn${track.active ? ' on' : ''}`}
              onClick={() => onUpdate(track.id, { active: !track.active })}
              title={track.active ? 'Deactivate' : 'Activate'}
              aria-pressed={track.active}
            >
              {track.active ? '●' : '○'}
            </button>

            <span className="backing-name" title={track.name}>{track.name}</span>

            <div className="backing-vol-wrap">
              <span className="backing-vol-label">VOL</span>
              <input
                type="range"
                className="backing-vol-slider"
                min={0}
                max={100}
                value={Math.round(track.volume * 100)}
                onChange={e => onUpdate(track.id, { volume: Number(e.target.value) / 100 })}
                aria-label={`Volume for ${track.name}`}
              />
              <span className="backing-vol-value">{Math.round(track.volume * 100)}%</span>
            </div>

            <button
              className="backing-remove-btn"
              onClick={() => {
                URL.revokeObjectURL(track.objectUrl)
                onRemove(track.id)
              }}
              title="Remove backing track"
              aria-label={`Remove ${track.name}`}
            >
              <i className="fa-solid fa-trash" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

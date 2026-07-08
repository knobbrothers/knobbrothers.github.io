import './PatternCard.css'

export function PatternCard({
  pattern, isActive, isPlaying, onClick, onRemove,
  draggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragging,
}) {
  return (
    <div
      className={[
        'pattern-card',
        isActive   ? 'active'   : '',
        isPlaying  ? 'playing'  : '',
        isDragging ? 'dragging' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
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
            <i className="fa-solid fa-trash" aria-hidden="true" />
          </button>
        )}
      </div>

      {isPlaying && <div className="pc-playing-badge">▶ PLAYING</div>}
    </div>
  )
}

import './StepGrid.css'

export function StepGrid({ channel, stepCount, currentStep, onToggleStep }) {
  return (
    <div
      className="step-grid"
      style={{ '--step-count': stepCount }}
    >
      {channel.steps.map((active, i) => {
        const isCurrent = i === currentStep
        const classes = [
          'step-btn',
          active    ? 'active'      : '',
          isCurrent ? 'current'     : '',
          i % 4 === 0 ? 'beat-start' : '',
          Math.floor(i / 4) % 2 === 1 ? 'beat-group-alt' : '',
        ].filter(Boolean).join(' ')

        return (
          <button
            key={i}
            className={classes}
            onClick={() => onToggleStep(channel.id, i)}
            aria-label={`Step ${i + 1} ${active ? 'on' : 'off'}`}
            aria-pressed={active}
          />
        )
      })}
    </div>
  )
}

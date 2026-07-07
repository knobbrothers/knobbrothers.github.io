import './HelpModal.css'

export default function HelpModal({ onClose }) {
  return (
    <div className="help-backdrop" onMouseDown={onClose}>
      <div className="help-card" onMouseDown={e => e.stopPropagation()}>
        <div className="help-header">
          <span className="help-title">How it works</span>
          <button className="help-close" onClick={onClose}>✕</button>
        </div>
        <div className="help-body">

          <section className="help-section">
            <h3>Getting started</h3>
            <p>Sq32 is a browser-based step sequencer. Add channels, assign samples to each, then hit Play. Each row is one drum or instrument track.</p>
          </section>

          <section className="help-section">
            <h3>Keyboard shortcuts</h3>
            <ul>
              <li><kbd>Space</kbd> — Play / Stop</li>
              <li><kbd>Cmd Z</kbd> — Undo</li>
              <li><kbd>Cmd Shift Z</kbd> — Redo</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>Step controls</h3>
            <p>Click a step to toggle it on or off. Right-click a step to set roll (×2, ×4, ×8 subdivisions). Expand a channel with the ≣ button to drag velocity and probability per step.</p>
          </section>

          <section className="help-section">
            <h3>Patterns & Song mode</h3>
            <p>Create up to 4 independent patterns (A–D) using the + button in the pattern bar. Switch to Song mode to arrange patterns in sequence for playback or export.</p>
          </section>

        </div>
      </div>
    </div>
  )
}

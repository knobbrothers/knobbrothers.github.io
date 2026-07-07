import { useState } from 'react'
import './NewProjectModal.css'

export function NewProjectModal({ onConfirm, onCancel }) {
  const [name, setName]           = useState('')
  const [stepCount, setStepCount] = useState(16)
  const [kitId, setKitId]         = useState('default')

  function handleSubmit(e) {
    e.preventDefault()
    const kit = kitId === 'empty' ? { channels: [] } : null
    onConfirm({ name: name.trim() || 'My First Loop', stepCount, kit })
  }

  return (
    <div className="npm-backdrop" onMouseDown={onCancel}>
      <form className="npm-card" onMouseDown={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="npm-title">New Project</h2>
        <label className="npm-label">
          Project Name
          <input
            className="npm-input"
            type="text"
            placeholder="My First Loop"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={64}
            autoFocus
          />
        </label>
        <label className="npm-label">
          Steps
          <select className="npm-select" value={stepCount} onChange={e => setStepCount(Number(e.target.value))}>
            {[4, 8, 16, 32].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="npm-label">
          Drum Kit
          <select className="npm-select" value={kitId} onChange={e => setKitId(e.target.value)}>
            <option value="default">Default Kit</option>
            <option value="empty">Empty — no channels</option>
          </select>
        </label>
        <div className="npm-actions">
          <button type="button" className="npm-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="npm-btn npm-btn--primary">Create</button>
        </div>
      </form>
    </div>
  )
}

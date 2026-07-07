import { useRef, useState, useEffect } from 'react'
import { ExportPanel } from './ExportPanel'
import logoSvg from '../assets/img/knobrothers-sq32-logo.svg'
import './Transport.css'

export function Transport({
  onSave,
  onLoad,
  onShare,
  onHelp,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  patterns,
  onNew,
}) {
  const loadInputRef = useRef(null)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [exportOpen, setExportOpen]     = useState(false)

  return (
    <div className="transport">
      <div className="transport-logo">
        <img src={logoSvg} alt="KnobBrothers SQ-32" className="transport-logo-img" />
      </div>

      <div className="transport-actions">
        {/* Hidden file input */}
        <input
          type="file"
          ref={loadInputRef}
          accept=".sq32,.json"
          style={{ display: 'none' }}
          onChange={e => {
            if (e.target.files?.[0]) onLoad(e.target.files[0])
            e.target.value = ''
          }}
        />

        <div className="t-toolbar-pill">
          {/* FILE menu */}
          <DropdownMenu
            label="FILES"
            open={fileMenuOpen}
            onToggle={() => setFileMenuOpen(v => !v)}
            onClose={() => setFileMenuOpen(false)}
          >
            <button
              className="t-dropdown-item"
              onClick={() => { setFileMenuOpen(false); onNew() }}
            >
              <NewIcon /> New
            </button>
            <button className="t-dropdown-item" onClick={() => { onSave(); setFileMenuOpen(false) }}>
              <SaveIcon /> Save
            </button>
            <button className="t-dropdown-item" onClick={() => { loadInputRef.current?.click(); setFileMenuOpen(false) }}>
              <FolderIcon /> Load
            </button>
            <div className="t-submenu-sep" />
            <button
              className="t-dropdown-item"
              onClick={() => { setExportOpen(true); setFileMenuOpen(false) }}
            >
              <DownloadIcon /> Export MP3…
            </button>
          </DropdownMenu>

          {/* Undo / Redo */}
          <button
            className="t-action-btn t-icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Cmd+Z)"
            aria-label="Undo"
          >
            <UndoIcon />
          </button>
          <button
            className="t-action-btn t-icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Cmd+Shift+Z)"
            aria-label="Redo"
          >
            <RedoIcon />
          </button>

          {/* Share */}
          <button
            className="t-action-btn t-icon-btn"
            onClick={onShare}
            title="Copy shareable link"
            aria-label="Share pattern link"
          >
            <ShareIcon />
          </button>

          {/* Help */}
          <button
            className="t-action-btn t-icon-btn"
            onClick={onHelp}
            title="Help"
            aria-label="Help"
          >?</button>
        </div>

        <ExportPanel
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          onExport={onExport}
          patterns={patterns}
        />
      </div>
    </div>
  )
}

// ─── Dropdown menu helper ───────────────────────────────────────────────────

function DropdownMenu({ label, open, onToggle, onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose])

  return (
    <div ref={ref} className="t-dropdown-wrap">
      <button
        className={`t-action-btn${open ? ' active' : ''}`}
        onClick={onToggle}
      >
        {label}
      </button>
      {open && (
        <div className="t-dropdown">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function SaveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" rx="1"/>
      <path d="M3 1v3h5V1"/>
      <rect x="3" y="7" width="6" height="4" rx="0.5"/>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 3.5C1 2.67 1.67 2 2.5 2H5l1.5 1.5H10.5C11.33 3.5 12 4.17 12 5v4.5C12 10.33 11.33 11 10.5 11h-8C1.67 11 1 10.33 1 9.5V3.5z"/>
    </svg>
  )
}

function UndoIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 4h6a4 4 0 0 1 0 8H4"/>
      <polyline points="1 1 1 4 4 4"/>
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4H6a4 4 0 0 0 0 8h3"/>
      <polyline points="12 1 12 4 9 4"/>
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="2.5" r="1.5"/>
      <circle cx="2.5" cy="6.5" r="1.5"/>
      <circle cx="10" cy="10.5" r="1.5"/>
      <line x1="4" y1="5.5" x2="8.5" y2="3.5"/>
      <line x1="4" y1="7.5" x2="8.5" y2="9.5"/>
    </svg>
  )
}

function NewIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" rx="1"/>
      <line x1="6" y1="4" x2="6" y2="8"/>
      <line x1="4" y1="6" x2="8" y2="6"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 1v7M4 6l2.5 2.5L9 6"/>
      <path d="M2 10h9"/>
    </svg>
  )
}

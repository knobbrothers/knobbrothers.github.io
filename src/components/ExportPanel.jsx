import { useState, useCallback } from 'react'
import './ExportPanel.css'

const BITRATES = [128, 192, 320]
const BAR_OPTIONS = [1, 2, 4, 8]

export function ExportPanel({ onExport }) {
  const [open,     setOpen]     = useState(false)
  const [bitrate,  setBitrate]  = useState(192)
  const [numBars,  setNumBars]  = useState(4)
  const [progress, setProgress] = useState(null)   // null = idle, 0–1 = rendering
  const [error,    setError]    = useState(null)

  const busy = progress !== null && progress < 1

  const handleExport = useCallback(async () => {
    setError(null)
    setProgress(0)
    try {
      await onExport({
        numBars,
        bitrate,
        onProgress: (p) => setProgress(p),
      })
      // Brief "done" flash before resetting
      setTimeout(() => {
        setProgress(null)
        setOpen(false)
      }, 800)
    } catch (err) {
      console.error('[export] failed:', err)
      setError('Export failed. See console for details.')
      setProgress(null)
    }
  }, [onExport, numBars, bitrate])

  return (
    <>
      {/* Trigger button — lives in the app header */}
      <button
        className="export-trigger-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Export MP3"
      >
        <DownloadIcon />
        Export MP3
      </button>

      {/* Modal */}
      {open && (
        <div
          className="export-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Export MP3"
          onClick={e => { if (e.target === e.currentTarget && !busy) setOpen(false) }}
        >
          <div className="export-modal">

            {/* Header */}
            <div className="export-modal-header">
              <span className="export-modal-title">Export MP3</span>
              <button
                className="export-close-btn"
                onClick={() => setOpen(false)}
                disabled={busy}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Bitrate */}
            <div className="export-option">
              <span className="export-option-label">Bitrate</span>
              <div className="bitrate-group">
                {BITRATES.map(br => (
                  <button
                    key={br}
                    className={`bitrate-pill${bitrate === br ? ' selected' : ''}`}
                    onClick={() => setBitrate(br)}
                    disabled={busy}
                    aria-pressed={bitrate === br}
                  >
                    {br} kbps
                  </button>
                ))}
              </div>
            </div>

            {/* Bar count */}
            <div className="export-option">
              <span className="export-option-label">Repetitions</span>
              <select
                className="export-select"
                value={numBars}
                onChange={e => setNumBars(Number(e.target.value))}
                disabled={busy}
                aria-label="Number of bars"
              >
                {BAR_OPTIONS.map(n => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'bar' : 'bars'}
                  </option>
                ))}
              </select>
            </div>

            {/* Progress */}
            {progress !== null && (
              <div className="export-progress-wrap">
                <div className="export-progress-bar-track">
                  <div
                    className="export-progress-bar-fill"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(progress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <span className="export-progress-label">
                  {progress >= 1
                    ? 'Done — downloading…'
                    : `Rendering… ${Math.round(progress * 100)}%`}
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <p style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>
            )}

            {/* Export button */}
            <button
              className="export-go-btn"
              onClick={handleExport}
              disabled={busy}
            >
              {busy ? 'Rendering…' : 'Export MP3'}
            </button>

          </div>
        </div>
      )}
    </>
  )
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 1v7M4 6l2.5 2.5L9 6"/>
      <path d="M2 10h9"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="1" y1="1" x2="11" y2="11"/>
      <line x1="11" y1="1" x2="1" y2="11"/>
    </svg>
  )
}

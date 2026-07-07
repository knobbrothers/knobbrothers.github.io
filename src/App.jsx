import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useSequencer } from './hooks/useSequencer'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useBackingTrack } from './hooks/useBackingTrack'
import { Transport } from './components/Transport'
import { ChannelRow } from './components/ChannelRow'
import { PatternTabs } from './components/PatternTabs'
import { PatternCard } from './components/PatternCard'
import { BackingTrackPanel } from './components/BackingTrackPanel'
import { NewProjectModal } from './components/NewProjectModal'
import HelpModal from './components/HelpModal'
import { serializeState, deserializeState, downloadPatternFile, encodeForUrl, decodeFromUrl } from './lib/serialize'
import './App.css'

function App() {
  const {
    state,
    canUndo,
    canRedo,
    setPlaying,
    setCurrentStep,
    setBpm,
    setSwing,
    setStepCount,
    toggleStep,
    setVelocity,
    setProbability,
    setRoll,
    updateChannel,
    removeChannel,
    duplicateChannel,
    addChannel,
    soloChannel,
    loadState,
    undo,
    redo,
    setCurrentPattern,
    toggleSongMode,
    advanceSongPattern,
    reorderPatterns,
    newProject,
    addBackingTrack,
    removeBackingTrack,
    updateBackingTrack,
    addChannelWithSample,
    reorderChannels,
    setMasterVolume,
    addPattern,
    removePattern,
  } = useSequencer()

  // ── Restore toast ────────────────────────────────────────────────────────
  const [restored, setRestored] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // ── Channel clipboard (copy/paste steps) ─────────────────────────────────
  const [channelClipboard, setChannelClipboard] = useState(null) // { steps, velocity, probability, roll }

  // ── Expanded channel (single-at-a-time) ──────────────────────────────────
  const [expandedChannelId, setExpandedChannelId] = useState(null)

  function handleToggleExpand(channelId) {
    setExpandedChannelId(prev => prev === channelId ? null : channelId)
  }

  // Auto-save to localStorage — debounced 1s after any persisted change.
  // Keyed on the fields serializeState actually saves, NOT the whole state:
  // playhead ticks replace `state` every step and would reset the debounce
  // forever, so autosave would never fire during playback.
  const autoSaveTimer = useRef(null)
  useEffect(() => {
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem('sq32-autosave', serializeState(state))
    }, 1000)
    return () => clearTimeout(autoSaveTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.patterns, state.projectName, state.masterVolume])

  // On mount: check URL hash for shared pattern, then restore auto-save
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.length > 1) {
      try {
        const data = decodeFromUrl(hash)
        if (window.confirm('Load shared pattern from link?')) {
          loadState(deserializeState(JSON.stringify(data)))
          window.location.hash = ''
          return
        }
      } catch {
        window.location.hash = ''
      }
    }

    const saved = localStorage.getItem('sq32-autosave')
    if (!saved) return
    try {
      loadState(deserializeState(saved))
      setRestored(true)
      setTimeout(() => setRestored(false), 3000)
    } catch { /* corrupt data — ignore */ }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const hasSolo = state.channels.some(ch => ch.solo)

  const [customSamples, setCustomSamples] = useState([])   // { name, objectUrl }[]

  // ── Drag-and-drop sample import ───────────────────────────────────────────
  const dragCounter = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  // ── Channel drag-to-reorder ────────────────────────────────────────────────
  const [draggingIdx, setDraggingIdx] = useState(null)
  const [dropInsert,  setDropInsert]  = useState(null)

  function handleChannelDragStart(idx) {
    setDraggingIdx(idx)
  }

  function handleChannelDragOver(e, idx) {
    e.preventDefault()
    if (draggingIdx === null || draggingIdx === idx) return
    const rect = e.currentTarget.getBoundingClientRect()
    const insertBefore = (e.clientY - rect.top) < rect.height / 2 ? idx : idx + 1
    setDropInsert(insertBefore)
  }

  function handleChannelDrop(e) {
    e.preventDefault()
    if (draggingIdx !== null && dropInsert !== null &&
        dropInsert !== draggingIdx && dropInsert !== draggingIdx + 1) {
      reorderChannels(draggingIdx, dropInsert)
    }
    setDraggingIdx(null)
    setDropInsert(null)
  }

  function handleChannelDragEnd() {
    setDraggingIdx(null)
    setDropInsert(null)
  }

  function handleFileDrop(files) {
    const audioFiles = Array.from(files).filter(f =>
      f.type.startsWith('audio/') || /\.(wav|mp3|ogg|flac|aiff?)$/i.test(f.name)
    )
    if (audioFiles.length === 0) return

    const remaining = 12 - state.channels.length
    if (remaining === 0) {
      alert('Channel limit of 12 reached. Remove a channel before adding more.')
      return
    }

    const toAdd = audioFiles.slice(0, remaining)
    toAdd.forEach(file => {
      const objectUrl = URL.createObjectURL(file)
      const name = file.name
      setCustomSamples(prev => [...prev.filter(s => s.name !== name), { name, objectUrl }])
      addChannelWithSample(name.replace(/\.[^.]+$/, ''), name, 0.8)
    })

    if (audioFiles.length > remaining) {
      alert(`Only ${remaining} file(s) added — channel limit of 12 reached.`)
    }
  }

  // ── Save / Load ──────────────────────────────────────────────────────────
  function handleSave() {
    downloadPatternFile(state)
  }

  function handleLoad(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        loadState(deserializeState(e.target.result, file.name))
      } catch {
        alert('Invalid or corrupted pattern file.')
      }
    }
    reader.readAsText(file)
  }

  // ── New project ──────────────────────────────────────────────────────────
  function handleNew() {
    if (!window.confirm('Start a new project? All unsaved changes will be lost.')) return
    setShowNewModal(true)
  }

  function handleNewConfirm({ name, stepCount, kit }) {
    setShowNewModal(false)
    state.backingTracks.forEach(t => {
      if (t.objectUrl?.startsWith('blob:')) URL.revokeObjectURL(t.objectUrl)
    })
    customSamples.forEach(s => {
      if (s.objectUrl?.startsWith('blob:')) URL.revokeObjectURL(s.objectUrl)
    })
    setCustomSamples([])
    localStorage.removeItem('sq32-autosave')
    newProject(kit, stepCount, name)
  }

  // ── Share ────────────────────────────────────────────────────────────────
  function handleShare() {
    const encoded = encodeForUrl(state)
    const url     = `${window.location.origin}${window.location.pathname}#${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2500)
    }).catch(() => {
      window.location.hash = encoded
    })
  }

  function addCustomSample(channelId, file) {
    const name = file.name
    const objectUrl = URL.createObjectURL(file)
    setCustomSamples(prev => {
      const filtered = prev.filter(s => s.name !== name)
      return [...filtered, { name, objectUrl }]
    })
    updateChannel(channelId, { sample: name, name: name.replace(/\.[^/.]+$/, '') })
  }

  // ── Duplicate channel ────────────────────────────────────────────────────
  function handleDuplicateChannel(channel) {
    if (state.channels.length >= 12) {
      alert('Channel limit of 12 reached.')
      return
    }
    duplicateChannel(channel.id)
  }

  // ── Channel copy/paste ───────────────────────────────────────────────────
  function handleCopyChannel(channel) {
    setChannelClipboard({
      steps:       [...channel.steps],
      velocity:    [...channel.velocity],
      probability: [...(channel.probability ?? channel.steps.map(() => 100))],
      roll:        [...(channel.roll ?? channel.steps.map(() => 1))],
    })
  }

  function handlePasteChannel(channel) {
    if (!channelClipboard) return
    const len = channel.steps.length
    channelClipboard.steps.forEach((active, i) => {
      if (i < len) {
        if (active !== channel.steps[i]) toggleStep(channel.id, i)
      }
    })
    channelClipboard.velocity.forEach((v, i) => {
      if (i < len) setVelocity(channel.id, i, v)
    })
    channelClipboard.probability.forEach((p, i) => {
      if (i < len) setProbability(channel.id, i, p)
    })
    channelClipboard.roll.forEach((r, i) => {
      if (i < len) setRoll(channel.id, i, r)
    })
  }

  const onLoopEnd = useCallback(() => {
    if (state.songMode) advanceSongPattern()
  }, [state.songMode, advanceSongPattern])

  const { initAudio, exportMp3, nextBarTime } = useAudioEngine({
    state,
    setCurrentStep,
    customSamples,
    onLoopEnd,
  })

  // Backing track loop engine
  useBackingTrack({
    backingTracks: state.backingTracks,
    playing:       state.playing,
    nextBarTime,
    getCtx:        initAudio,
  })

  function handlePlayStop() {
    initAudio()
    setPlaying(!state.playing)
  }

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ||
                      document.activeElement?.isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey) {
        if (inInput) return
        e.preventDefault()
        undo()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && e.shiftKey) {
        if (inInput) return
        e.preventDefault()
        redo()
        return
      }

      if (e.code !== 'Space') return
      if (inInput) return
      if (tag === 'BUTTON' && !document.activeElement?.classList.contains('step-btn')) return
      e.preventDefault()
      handlePlayStop()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // handlePlayStop is re-created each render but only reads state.playing,
    // which is already a dep — no need to re-subscribe on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing, undo, redo])

  const displayStep = (state.songMode && state.playing && state.currentPatternIdx !== state.playingPatternIdx)
    ? -1
    : state.currentStep

  return (
    <div className="app">
      {restored && <div className="restore-toast">Session restored</div>}
      {shareToast && <div className="restore-toast">Link copied!</div>}
      {showNewModal && (
        <NewProjectModal
          onConfirm={handleNewConfirm}
          onCancel={() => setShowNewModal(false)}
        />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <Transport
        onSave={handleSave}
        onLoad={handleLoad}
        onNew={handleNew}
        onShare={handleShare}
        onHelp={() => setShowHelp(true)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={exportMp3}
        patterns={state.patterns}
      />

      <div className="sticky-bar">
        <PatternTabs
          playing={state.playing}
          onPlayStop={handlePlayStop}
          bpm={state.bpm}
          onBpmChange={setBpm}
          patterns={state.patterns}
          currentIdx={state.currentPatternIdx}
          onSelect={setCurrentPattern}
          songMode={state.songMode}
          onReorder={reorderPatterns}
          onToggleSongMode={toggleSongMode}
          playingPatternIdx={state.playingPatternIdx}
          stepCount={state.stepCount}
          onSetStepCount={setStepCount}
          masterVolume={state.masterVolume}
          onSetMasterVolume={setMasterVolume}
          swing={state.swing}
          onSetSwing={setSwing}
          onAddPattern={addPattern}
        />

        {/* Playhead pips row */}
        <div className="steps-row">
          {Array.from({ length: state.stepCount }, (_, i) => (
            <div
              key={i}
              className={[
                'playhead-pip',
                i === state.currentStep ? 'active' : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>
      </div>

      <main
        className="app-body"
        onDragEnter={e => {
          if (!e.dataTransfer.types.includes('Files')) return
          dragCounter.current++
          setIsDragging(true)
        }}
        onDragOver={e => {
          if (!e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
        }}
        onDragLeave={e => {
          // Only count leaves that match a counted enter, so non-file drags
          // (text, DOM nodes) can't drive the counter negative and wedge the overlay.
          if (!e.dataTransfer.types.includes('Files')) return
          dragCounter.current = Math.max(0, dragCounter.current - 1)
          if (dragCounter.current === 0) setIsDragging(false)
        }}
        onDrop={e => {
          e.preventDefault()
          dragCounter.current = 0
          setIsDragging(false)
          handleFileDrop(e.dataTransfer.files)
        }}
      >
        {isDragging && (
          <div className="drag-overlay">
            <span className="drag-overlay-label">Drop audio files to add channels</span>
          </div>
        )}

        {/* Song mode: pattern card grid */}
        {state.songMode ? (
          <div className="song-view">
            {state.patterns.map((pattern, idx) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                isActive={idx === state.currentPatternIdx}
                isPlaying={state.playing && idx === state.playingPatternIdx}
                stepCount={pattern.stepCount}
                onClick={() => setCurrentPattern(idx)}
                onRemove={state.patterns.length > 1 ? () => removePattern(pattern.id) : null}
              />
            ))}
            {state.patterns.length < 4 && (
              <button className="pattern-card-create" onClick={addPattern}>
                <span className="pattern-card-create-label">
                  + Create Pattern {['A','B','C','D'][state.patterns.length]}
                </span>
              </button>
            )}
          </div>
        ) : (
          /* Pattern mode: channel rows */
          <>
            {state.channels.map((ch, idx) => (
              <Fragment key={ch.id}>
                {dropInsert === idx && <div className="channel-drop-indicator" />}
                <ChannelRow
                  channel={ch}
                  stepCount={state.stepCount}
                  currentStep={displayStep}
                  onToggleStep={toggleStep}
                  onUpdateChannel={updateChannel}
                  onSetVelocity={setVelocity}
                  onSetProbability={setProbability}
                  onSetRoll={setRoll}
                  onRemoveChannel={removeChannel}
                  onUploadSample={addCustomSample}
                  hasSolo={hasSolo}
                  onSoloChannel={soloChannel}
                  isDragging={draggingIdx === idx}
                  onChannelDragStart={() => handleChannelDragStart(idx)}
                  onChannelDragOver={e => handleChannelDragOver(e, idx)}
                  onChannelDrop={handleChannelDrop}
                  onChannelDragEnd={handleChannelDragEnd}
                  isExpanded={expandedChannelId === ch.id}
                  onToggleExpand={() => handleToggleExpand(ch.id)}
                  onDuplicateChannel={() => handleDuplicateChannel(ch)}
                  onCopyChannel={() => handleCopyChannel(ch)}
                  onPasteChannel={channelClipboard ? () => handlePasteChannel(ch) : null}
                />
              </Fragment>
            ))}
            {dropInsert === state.channels.length && <div className="channel-drop-indicator" />}

            <button
              className="add-channel-btn"
              onClick={addChannel}
              disabled={state.channels.length >= 12}
            >
              <PlusIcon /> ADD CHANNEL ({state.channels.length}/12)
            </button>
          </>
        )}
      </main>

      <BackingTrackPanel
        backingTracks={state.backingTracks}
        onAdd={addBackingTrack}
        onRemove={removeBackingTrack}
        onUpdate={updateBackingTrack}
      />
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="1" x2="6" y2="11"/>
      <line x1="1" y1="6" x2="11" y2="6"/>
    </svg>
  )
}

export default App

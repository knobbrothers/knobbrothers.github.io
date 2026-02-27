import { useState, useEffect } from 'react'
import { useSequencer } from './hooks/useSequencer'
import { useAudioEngine } from './hooks/useAudioEngine'
import { Transport } from './components/Transport'
import { ChannelRow } from './components/ChannelRow'
import { VelocityPanel } from './components/VelocityPanel'
import { ChannelControls } from './components/ChannelControls'
import { ExportPanel } from './components/ExportPanel'
import './App.css'

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('sq32-theme') || 'dark'
    document.documentElement.dataset.theme = saved
    return saved
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('sq32-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  const {
    state,
    setPlaying,
    setCurrentStep,
    setBpm,
    setSwing,
    setStepCount,
    toggleStep,
    setVelocity,
    updateChannel,
    removeChannel,
    addChannel,
    soloChannel,
  } = useSequencer()

  const hasSolo = state.channels.some(ch => ch.solo)

  const [customSamples, setCustomSamples] = useState([])   // { name, objectUrl }[]

  function addCustomSample(channelId, file) {
    const name = file.name
    const objectUrl = URL.createObjectURL(file)
    setCustomSamples(prev => {
      const filtered = prev.filter(s => s.name !== name)
      return [...filtered, { name, objectUrl }]
    })
    updateChannel(channelId, { sample: name })
  }

  const { initAudio, exportMp3 } = useAudioEngine({ state, setCurrentStep, customSamples })

  function handlePlayStop() {
    initAudio()
    setPlaying(!state.playing)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-logo-dot" aria-hidden="true" />
          <span className="app-logo-name">Knobbrothers <span className="app-logo-808">SQ-32</span></span>
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <Transport
        bpm={state.bpm}
        swing={state.swing}
        stepCount={state.stepCount}
        playing={state.playing}
        currentStep={state.currentStep}
        onPlayStop={handlePlayStop}
        onBpmChange={setBpm}
        onSwingChange={setSwing}
        onStepCountChange={setStepCount}
        exportSlot={<ExportPanel onExport={exportMp3} />}
      />

      <main className="app-body">
        {state.channels.map(ch => (
          <ChannelRow
            key={ch.id}
            channel={ch}
            stepCount={state.stepCount}
            currentStep={state.currentStep}
            onToggleStep={toggleStep}
            onUpdateChannel={updateChannel}
            hasSolo={hasSolo}
            onSoloChannel={soloChannel}
            controlsPanel={
              <>
                <ChannelControls
                  channel={ch}
                  onUpdateChannel={updateChannel}
                  onRemoveChannel={removeChannel}
                  customSamples={customSamples}
                  onUploadSample={addCustomSample}
                />
                <VelocityPanel channel={ch} onSetVelocity={setVelocity} />
              </>
            }
          />
        ))}

        <button
          className="add-channel-btn"
          onClick={addChannel}
          disabled={state.channels.length >= 12}
        >
          <PlusIcon /> ADD CHANNEL ({state.channels.length}/12)
        </button>
      </main>
    </div>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
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

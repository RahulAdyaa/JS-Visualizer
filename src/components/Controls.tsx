import { useEffect } from 'react'
import { useVisualizerStore } from '@/store/useVisualizerStore'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Zap,
} from 'lucide-react'

const SPEEDS = [
  { label: '0.5x', value: 2000 },
  { label: '1x', value: 1000 },
  { label: '2x', value: 500 },
  { label: '4x', value: 250 },
]

export default function Controls() {
  const executionSteps = useVisualizerStore((s) => s.executionSteps)
  const currentStepIndex = useVisualizerStore((s) => s.currentStepIndex)
  const isPlaying = useVisualizerStore((s) => s.isPlaying)
  const playbackSpeed = useVisualizerStore((s) => s.playbackSpeed)
  const isExecuting = useVisualizerStore((s) => s.isExecuting)
  const runCode = useVisualizerStore((s) => s.runCode)
  const nextStep = useVisualizerStore((s) => s.nextStep)
  const previousStep = useVisualizerStore((s) => s.previousStep)
  const play = useVisualizerStore((s) => s.play)
  const pause = useVisualizerStore((s) => s.pause)
  const reset = useVisualizerStore((s) => s.reset)
  const setPlaybackSpeed = useVisualizerStore((s) => s.setPlaybackSpeed)

  const hasSteps = executionSteps.length > 0
  const atStart = currentStepIndex <= 0
  const atEnd = currentStepIndex >= executionSteps.length - 1

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight' && hasSteps && !atEnd) {
        e.preventDefault()
        nextStep()
      } else if (e.key === 'ArrowLeft' && hasSteps && !atStart) {
        e.preventDefault()
        previousStep()
      } else if (e.key === ' ' && hasSteps) {
        e.preventDefault()
        isPlaying ? pause() : play()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [hasSteps, atStart, atEnd, isPlaying, nextStep, previousStep, play, pause])

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface)] border-t border-[var(--color-panel-border)]">
      {/* Run / Reset */}
      {!hasSteps ? (
        <button
          onClick={runCode}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          <Zap size={14} />
          {isExecuting ? 'Running...' : 'Run'}
        </button>
      ) : (
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      )}

      {/* Separator */}
      <div className="w-px h-6 bg-[var(--color-panel-border)] mx-1" />

      {/* Navigation */}
      <button
        onClick={previousStep}
        disabled={!hasSteps || atStart}
        className="p-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-30 text-gray-300 transition-colors"
        title="Previous step"
      >
        <SkipBack size={16} />
      </button>

      <button
        onClick={isPlaying ? pause : play}
        disabled={!hasSteps}
        className="p-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-30 text-gray-300 transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <button
        onClick={nextStep}
        disabled={!hasSteps || atEnd}
        className="p-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-30 text-gray-300 transition-colors"
        title="Next step"
      >
        <SkipForward size={16} />
      </button>

      {/* Step counter */}
      {hasSteps && (
        <div className="flex items-center gap-2 ml-1">
          <span className="text-xs text-gray-400 tabular-nums min-w-[80px]">
            Step {currentStepIndex + 1} / {executionSteps.length}
          </span>
          <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all duration-200"
              style={{ width: `${((currentStepIndex + 1) / executionSteps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Speed controls */}
      {hasSteps && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Speed:</span>
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              onClick={() => setPlaybackSpeed(s.value)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                playbackSpeed === s.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

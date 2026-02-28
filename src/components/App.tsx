import { useVisualizerStore } from '@/store/useVisualizerStore'
import CodeEditor from './CodeEditor'
import Controls from './Controls'
import CallStack from './CallStack'
import WebAPIs from './WebAPIs'
import { TaskQueue, MicrotaskQueue } from './Queues'
import EventLoop from './EventLoop'
import ConsoleOutput from './ConsoleOutput'
import StepDescription from './StepDescription'
import ExampleSelector from './ExampleSelector'
import { Zap } from 'lucide-react'

export default function App() {
  const executionSteps = useVisualizerStore((s) => s.executionSteps)
  const currentStepIndex = useVisualizerStore((s) => s.currentStepIndex)
  const error = useVisualizerStore((s) => s.error)

  const currentStep =
    executionSteps.length > 0 && currentStepIndex >= 0
      ? executionSteps[currentStepIndex] ?? null
      : null

  const hasVisualization = executionSteps.length > 0

  return (
    <div className="h-full flex flex-col bg-[var(--color-panel-bg)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-panel-border)]">
        <div className="flex items-center gap-2.5">
          <Zap size={18} className="text-cyan-400" />
          <h1 className="text-sm font-bold text-gray-100 tracking-wide">
            JS Visualizer
          </h1>
        </div>
        <ExampleSelector />
      </header>

      {/* Step description bar */}
      {currentStep && <StepDescription step={currentStep} />}

      {/* Error bar */}
      {error && !hasVisualization && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-800/30 text-xs text-red-300">
          <span className="font-semibold">Error (line {error.line}):</span>{' '}
          {error.message}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel - Code Editor */}
        <div className="flex flex-col w-[38%] min-w-[300px] border-r border-[var(--color-panel-border)]">
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeEditor />
          </div>
          <Controls />
        </div>

        {/* Right panel - Visualization */}
        <div className="flex-1 flex flex-col min-h-0">
          {hasVisualization ? (
            <div className="flex-1 grid grid-cols-3 grid-rows-[1fr_1fr_1fr] min-h-0">
              {/* Row 1: Call Stack | Web APIs | Event Loop */}
              <div className="border-b border-r border-[var(--color-panel-border)] min-h-0 overflow-hidden">
                <CallStack frames={currentStep?.callStack ?? []} />
              </div>
              <div className="border-b border-r border-[var(--color-panel-border)] min-h-0 overflow-hidden">
                <WebAPIs entries={currentStep?.webAPIs ?? []} />
              </div>
              <div className="border-b border-[var(--color-panel-border)] min-h-0 overflow-hidden">
                <EventLoop phase={currentStep?.eventLoopPhase ?? 'idle'} />
              </div>

              {/* Row 2: Task Queue | Microtask Queue (spans 2 cols) */}
              <div className="border-b border-r border-[var(--color-panel-border)] min-h-0 overflow-hidden col-span-1">
                <TaskQueue tasks={currentStep?.taskQueue ?? []} />
              </div>
              <div className="border-b border-[var(--color-panel-border)] min-h-0 overflow-hidden col-span-2">
                <MicrotaskQueue tasks={currentStep?.microtaskQueue ?? []} />
              </div>

              {/* Row 3: Console (spans all cols) */}
              <div className="min-h-0 overflow-hidden col-span-3">
                <ConsoleOutput messages={currentStep?.consoleOutput ?? []} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
                  <Zap size={28} className="text-gray-600" />
                </div>
                <h2 className="text-gray-400 text-lg font-medium mb-2">
                  JavaScript Code Visualizer
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Write or paste JavaScript code in the editor, then click{' '}
                  <span className="text-emerald-400 font-medium">Run</span> to see the
                  call stack, event loop, and async queues animate step by step.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center text-[10px] uppercase tracking-wider">
                  <span className="px-2 py-1 rounded bg-blue-900/20 text-blue-400 border border-blue-800/20">Call Stack</span>
                  <span className="px-2 py-1 rounded bg-amber-900/20 text-amber-400 border border-amber-800/20">Web APIs</span>
                  <span className="px-2 py-1 rounded bg-emerald-900/20 text-emerald-400 border border-emerald-800/20">Task Queue</span>
                  <span className="px-2 py-1 rounded bg-purple-900/20 text-purple-400 border border-purple-800/20">Microtasks</span>
                  <span className="px-2 py-1 rounded bg-cyan-900/20 text-cyan-400 border border-cyan-800/20">Event Loop</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

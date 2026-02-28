import { create } from 'zustand'
import type { ExecutionStep } from '@/engine/types'
import { parseCode } from '@/engine/parser'
import { interpret } from '@/engine/interpreter'

const DEFAULT_CODE = `function greet(name) {
  console.log("Hello, " + name + "!");
}

console.log("Start");
greet("World");
console.log("End");
`

interface VisualizerState {
  sourceCode: string
  executionSteps: ExecutionStep[]
  currentStepIndex: number
  isPlaying: boolean
  playbackSpeed: number
  error: { message: string; line: number; column: number } | null
  isExecuting: boolean

  setSourceCode: (code: string) => void
  runCode: () => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (index: number) => void
  play: () => void
  pause: () => void
  reset: () => void
  setPlaybackSpeed: (speed: number) => void
}

let playIntervalId: ReturnType<typeof setInterval> | null = null

export const useVisualizerStore = create<VisualizerState>((set, get) => ({
  sourceCode: DEFAULT_CODE,
  executionSteps: [],
  currentStepIndex: -1,
  isPlaying: false,
  playbackSpeed: 1000,
  error: null,
  isExecuting: false,

  setSourceCode: (code) => set({ sourceCode: code }),

  runCode: () => {
    const { sourceCode } = get()
    set({ isExecuting: true, error: null, isPlaying: false })

    if (playIntervalId) {
      clearInterval(playIntervalId)
      playIntervalId = null
    }

    const parseResult = parseCode(sourceCode)
    if (!parseResult.success) {
      set({
        isExecuting: false,
        error: parseResult.error,
        executionSteps: [],
        currentStepIndex: -1,
      })
      return
    }

    const result = interpret(parseResult.ast)

    set({
      isExecuting: false,
      executionSteps: result.steps,
      currentStepIndex: result.steps.length > 0 ? 0 : -1,
      error: result.error,
    })
  },

  nextStep: () => {
    const { currentStepIndex, executionSteps } = get()
    if (currentStepIndex < executionSteps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 })
    } else {
      // Reached end - stop playing
      const { isPlaying } = get()
      if (isPlaying) {
        get().pause()
      }
    }
  },

  previousStep: () => {
    const { currentStepIndex } = get()
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 })
    }
  },

  goToStep: (index) => {
    const { executionSteps } = get()
    if (index >= 0 && index < executionSteps.length) {
      set({ currentStepIndex: index })
    }
  },

  play: () => {
    const { executionSteps, currentStepIndex } = get()
    if (executionSteps.length === 0) return

    // If at end, restart
    if (currentStepIndex >= executionSteps.length - 1) {
      set({ currentStepIndex: 0 })
    }

    set({ isPlaying: true })

    if (playIntervalId) clearInterval(playIntervalId)

    playIntervalId = setInterval(() => {
      const state = get()
      if (state.currentStepIndex < state.executionSteps.length - 1) {
        set({ currentStepIndex: state.currentStepIndex + 1 })
      } else {
        state.pause()
      }
    }, get().playbackSpeed)
  },

  pause: () => {
    if (playIntervalId) {
      clearInterval(playIntervalId)
      playIntervalId = null
    }
    set({ isPlaying: false })
  },

  reset: () => {
    if (playIntervalId) {
      clearInterval(playIntervalId)
      playIntervalId = null
    }
    set({
      executionSteps: [],
      currentStepIndex: -1,
      isPlaying: false,
      error: null,
    })
  },

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed })
    const { isPlaying } = get()
    if (isPlaying) {
      // Restart interval with new speed
      get().pause()
      get().play()
    }
  },
}))

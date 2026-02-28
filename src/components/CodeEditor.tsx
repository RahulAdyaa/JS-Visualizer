import { useCallback, useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { EditorState, StateEffect, StateField, type Extension } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, foldGutter, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { Decoration, type DecorationSet } from '@codemirror/view'
import { useVisualizerStore } from '@/store/useVisualizerStore'

// Line highlight decoration
const highlightLineDecoration = Decoration.line({
  class: 'cm-activeLine-highlight',
})

const highlightLineEffect = StateEffect.define<number>()

const highlightLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(highlightLineEffect)) {
        const line = e.value
        if (line > 0 && line <= tr.state.doc.lines) {
          const lineStart = tr.state.doc.line(line).from
          return Decoration.set([highlightLineDecoration.range(lineStart)])
        }
        return Decoration.none
      }
    }
    return decorations
  },
  provide: (f) => EditorView.decorations.from(f),
})

export default function CodeEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const sourceCode = useVisualizerStore((s) => s.sourceCode)
  const setSourceCode = useVisualizerStore((s) => s.setSourceCode)
  const executionSteps = useVisualizerStore((s) => s.executionSteps)
  const currentStepIndex = useVisualizerStore((s) => s.currentStepIndex)
  const isExecuting = useVisualizerStore((s) => s.isExecuting)

  const currentLine = executionSteps.length > 0 && currentStepIndex >= 0
    ? executionSteps[currentStepIndex]?.line ?? 0
    : 0

  const isVisualizationActive = executionSteps.length > 0

  const onUpdate = useCallback(
    (update: { state: EditorState; docChanged: boolean }) => {
      if (update.docChanged) {
        setSourceCode(update.state.doc.toString())
      }
    },
    [setSourceCode],
  )

  // Create editor
  useEffect(() => {
    if (!containerRef.current) return

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      bracketMatching(),
      foldGutter(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      javascript(),
      oneDark,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      highlightLineField,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onUpdate({ state: update.state, docChanged: true })
        }
      }),
      EditorView.theme({
        '&': { height: '100%', background: 'transparent' },
        '.cm-content': { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '13.5px' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    ]

    const state = EditorState.create({
      doc: sourceCode,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update read-only state - handled via EditorView.editable
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: StateEffect.appendConfig.of(
        EditorView.editable.of(!(isVisualizationActive || isExecuting)),
      ),
    })
  }, [isVisualizationActive, isExecuting])

  // Sync code from store (e.g. example selected)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== sourceCode) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: sourceCode },
      })
    }
  }, [sourceCode])

  // Highlight current line
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: highlightLineEffect.of(currentLine),
    })
    // Scroll line into view
    if (currentLine > 0 && currentLine <= view.state.doc.lines) {
      const lineInfo = view.state.doc.line(currentLine)
      view.dispatch({
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
      })
    }
  }, [currentLine])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden" />
  )
}

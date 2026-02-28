import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StackFrame as StackFrameType } from '@/engine/types'

const HIDDEN_VARS = new Set(['undefined', 'NaN', 'Infinity'])

const StackFrameCard = memo(function StackFrameCard({ frame }: { frame: StackFrameType }) {
  const visibleVars = frame.variables.filter((v) => !HIDDEN_VARS.has(v.name))
  return (
    <div className="px-3 py-2 rounded-lg border border-blue-500/30 bg-blue-600/10 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-blue-300 text-sm">{frame.name}()</span>
        {frame.line > 0 && (
          <span className="text-[10px] text-blue-400/60 tabular-nums">line {frame.line}</span>
        )}
      </div>
      {frame.args.length > 0 && (
        <div className="mt-1 text-[11px] text-blue-200/70">
          {frame.args.map((a, i) => (
            <span key={i}>
              {i > 0 && ', '}
              <span className="text-blue-300/80">{a.name}</span>
              <span className="text-gray-500">=</span>
              <span className="text-amber-300/80">{a.value}</span>
            </span>
          ))}
        </div>
      )}
      {visibleVars.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {visibleVars.slice(0, 6).map((v, i) => (
            <div key={i} className="text-[11px] flex gap-1.5">
              <span className="text-gray-500">{v.kind}</span>
              <span className="text-blue-200/80">{v.name}</span>
              <span className="text-gray-600">=</span>
              <span className="text-emerald-300/80 truncate">{v.value}</span>
            </div>
          ))}
          {visibleVars.length > 6 && (
            <div className="text-[10px] text-gray-500">+{visibleVars.length - 6} more</div>
          )}
        </div>
      )}
    </div>
  )
})

export default function CallStack({ frames }: { frames: StackFrameType[] }) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider px-3 py-2 border-b border-[var(--color-panel-border)]">
        Call Stack
      </h3>
      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        <AnimatePresence mode="popLayout">
          {frames.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-600 text-center py-8"
            >
              Empty
            </motion.div>
          ) : (
            [...frames].reverse().map((frame) => (
              <motion.div
                key={frame.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                layout
              >
                <StackFrameCard frame={frame} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

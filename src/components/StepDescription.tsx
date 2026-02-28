import { motion } from 'framer-motion'
import type { ExecutionStep } from '@/engine/types'

export default function StepDescription({ step }: { step: ExecutionStep | null }) {
  if (!step) return null

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="px-3 py-2 text-xs text-cyan-300/80 bg-cyan-900/10 border-b border-[var(--color-panel-border)] flex items-center gap-2"
    >
      <span className="text-cyan-500/50 tabular-nums shrink-0">#{step.id}</span>
      <span className="truncate">{step.description}</span>
      {step.line > 0 && (
        <span className="text-gray-500 ml-auto shrink-0 tabular-nums">line {step.line}</span>
      )}
    </motion.div>
  )
}

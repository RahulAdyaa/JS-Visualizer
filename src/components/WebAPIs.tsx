import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WebAPIEntry } from '@/engine/types'
import { Clock, GitBranch } from 'lucide-react'

const WebAPICard = memo(function WebAPICard({ entry }: { entry: WebAPIEntry }) {
  const Icon = entry.type === 'Promise' ? GitBranch : Clock
  return (
    <div className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-600/10">
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-amber-400/70 shrink-0" />
        <span className="text-sm text-amber-200 truncate">{entry.label}</span>
      </div>
      {entry.delay !== null && (
        <div className="mt-1 text-[10px] text-amber-400/50">{entry.delay}ms</div>
      )}
    </div>
  )
})

export default function WebAPIs({ entries }: { entries: WebAPIEntry[] }) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider px-3 py-2 border-b border-[var(--color-panel-border)]">
        Web APIs
      </h3>
      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        <AnimatePresence mode="popLayout">
          {entries.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-600 text-center py-6"
            >
              No pending APIs
            </motion.div>
          ) : (
            entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                layout
              >
                <WebAPICard entry={entry} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

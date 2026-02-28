import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { QueueTask } from '@/engine/types'

const TaskItem = memo(function TaskItem({
  task,
  color,
}: {
  task: QueueTask
  color: 'green' | 'purple'
}) {
  const colors = {
    green: {
      bg: 'bg-emerald-600/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-200',
    },
    purple: {
      bg: 'bg-purple-600/10',
      border: 'border-purple-500/30',
      text: 'text-purple-200',
    },
  }
  const c = colors[color]
  return (
    <div className={`px-2.5 py-1.5 rounded-lg border ${c.border} ${c.bg} shrink-0`}>
      <span className={`text-xs ${c.text} whitespace-nowrap`}>{task.label}</span>
    </div>
  )
})

export function TaskQueue({ tasks }: { tasks: QueueTask[] }) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider px-3 py-2 border-b border-[var(--color-panel-border)]">
        Task Queue
        <span className="text-gray-600 normal-case font-normal ml-1">(Macrotasks)</span>
      </h3>
      <div className="flex-1 overflow-auto p-2">
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gray-600 w-full text-center py-4"
              >
                Empty
              </motion.div>
            ) : (
              tasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 30, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  layout
                >
                  <TaskItem task={task} color="green" />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export function MicrotaskQueue({ tasks }: { tasks: QueueTask[] }) {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider px-3 py-2 border-b border-[var(--color-panel-border)]">
        Microtask Queue
      </h3>
      <div className="flex-1 overflow-auto p-2">
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-gray-600 w-full text-center py-4"
              >
                Empty
              </motion.div>
            ) : (
              tasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 30, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  layout
                >
                  <TaskItem task={task} color="purple" />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

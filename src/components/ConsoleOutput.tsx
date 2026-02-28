import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ConsoleMessage } from '@/engine/types'

export default function ConsoleOutput({ messages }: { messages: ConsoleMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const levelColors: Record<string, string> = {
    log: 'text-green-300',
    info: 'text-blue-300',
    warn: 'text-yellow-300',
    error: 'text-red-400',
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider px-3 py-2 border-b border-[var(--color-panel-border)] flex items-center gap-2">
        Console
        {messages.length > 0 && (
          <span className="text-[10px] text-gray-500 font-normal">({messages.length})</span>
        )}
      </h3>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-2 font-mono text-[12px] leading-5 bg-gray-950/50"
      >
        <AnimatePresence>
          {messages.length === 0 ? (
            <div className="text-gray-600 text-center py-4 text-xs">No output</div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex items-start gap-2 py-0.5 ${levelColors[msg.level] ?? 'text-gray-300'}`}
              >
                <span className="text-gray-600 select-none shrink-0">&gt;</span>
                <span className="break-all">{msg.text}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

import { motion } from 'framer-motion'
import type { EventLoopPhase } from '@/engine/types'

const PHASES: Array<{ key: EventLoopPhase; label: string; color: string; glowColor: string }> = [
  { key: 'callStack', label: 'Call Stack', color: '#3b82f6', glowColor: 'rgba(59,130,246,0.4)' },
  { key: 'microtasks', label: 'Microtasks', color: '#a855f7', glowColor: 'rgba(168,85,247,0.4)' },
  { key: 'macrotasks', label: 'Macrotasks', color: '#10b981', glowColor: 'rgba(16,185,129,0.4)' },
  { key: 'idle', label: 'Idle', color: '#6b7280', glowColor: 'rgba(107,114,128,0.2)' },
]

export default function EventLoop({ phase }: { phase: EventLoopPhase }) {
  const activePhase = PHASES.find((p) => p.key === phase) ?? PHASES[3]!

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider px-3 py-2 border-b border-[var(--color-panel-border)]">
        Event Loop
      </h3>
      <div className="flex-1 flex items-center justify-center p-3">
        <div className="relative flex items-center justify-center">
          {/* Outer ring */}
          <motion.div
            className="w-28 h-28 rounded-full border-2 flex items-center justify-center"
            animate={{
              borderColor: activePhase.color,
              boxShadow: `0 0 20px ${activePhase.glowColor}, inset 0 0 20px ${activePhase.glowColor}`,
            }}
            transition={{ duration: 0.4 }}
          >
            {/* Inner label */}
            <motion.div
              className="text-center"
              animate={{ color: activePhase.color }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-[10px] uppercase tracking-widest opacity-60">Phase</div>
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-bold mt-0.5"
              >
                {activePhase.label}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Spinning arc indicator */}
          {phase !== 'idle' && (
            <motion.div
              className="absolute inset-0 w-28 h-28"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <svg viewBox="0 0 112 112" className="w-full h-full">
                <circle
                  cx="56"
                  cy="56"
                  r="53"
                  fill="none"
                  stroke={activePhase.color}
                  strokeWidth="2"
                  strokeDasharray="30 303"
                  strokeLinecap="round"
                  opacity={0.6}
                />
              </svg>
            </motion.div>
          )}
        </div>

        {/* Phase indicators */}
        <div className="ml-4 space-y-1.5">
          {PHASES.map((p) => (
            <motion.div
              key={p.key}
              className="flex items-center gap-2"
              animate={{ opacity: p.key === phase ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                animate={{
                  backgroundColor: p.color,
                  boxShadow: p.key === phase ? `0 0 8px ${p.glowColor}` : 'none',
                }}
              />
              <span className="text-[11px] text-gray-300">{p.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

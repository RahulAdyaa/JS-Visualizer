// ---- Value types used by the interpreter ----

export type RuntimeValue =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'undefined'; value: undefined }
  | { type: 'null'; value: null }
  | { type: 'function'; value: FunctionValue }
  | { type: 'object'; value: Record<string, RuntimeValue> }
  | { type: 'array'; value: RuntimeValue[] }

export interface FunctionValue {
  name: string
  params: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bodyNode: any // AST node
  closureScope: Scope
  isArrow: boolean
}

// ---- Scope chain ----

export interface Variable {
  name: string
  value: RuntimeValue
  kind: 'var' | 'let' | 'const'
}

export interface Scope {
  id: string
  name: string // 'Global', function name, 'Block'
  variables: Map<string, Variable>
  parent: Scope | null
}

// ---- Visualization state snapshots ----

export interface StackFrame {
  id: string
  name: string
  args: Array<{ name: string; value: string }>
  variables: Array<{ name: string; value: string; kind: string }>
  line: number
}

export type EventLoopPhase =
  | 'callStack'
  | 'microtasks'
  | 'macrotasks'
  | 'idle'

export interface WebAPIEntry {
  id: string
  type: 'setTimeout' | 'setInterval' | 'Promise'
  label: string
  delay: number | null // ms, null for promises
}

export interface QueueTask {
  id: string
  label: string
  type: 'macrotask' | 'microtask'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbackNode: any // AST node
  callbackScope: Scope
}

export interface ConsoleMessage {
  id: string
  level: 'log' | 'warn' | 'error' | 'info'
  text: string
}

export interface ExecutionStep {
  id: number
  line: number
  column: number
  callStack: StackFrame[]
  webAPIs: WebAPIEntry[]
  taskQueue: QueueTask[]
  microtaskQueue: QueueTask[]
  consoleOutput: ConsoleMessage[]
  eventLoopPhase: EventLoopPhase
  description: string
}

// ---- Parser result ----

export type ParseResult =
  | { success: true; ast: AcornProgram }
  | { success: false; error: { message: string; line: number; column: number } }

// Minimal typing for acorn AST nodes we use
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AcornNode = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AcornProgram = any

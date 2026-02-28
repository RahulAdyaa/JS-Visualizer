import type {
  AcornNode,
  ExecutionStep,
  StackFrame,
  WebAPIEntry,
  QueueTask,
  ConsoleMessage,
  EventLoopPhase,
  RuntimeValue,
  Scope,
  Variable,
  FunctionValue,
} from './types'
import {
  formatValue,
  makeUndefined,
  makeNumber,
  makeString,
  makeBool,
  makeNull,
  isTruthy,
  toNumber,
  toStringVal,
} from '@/utils/helpers'

const STEP_LIMIT = 10_000

let uid = 0
function nextId(): string {
  return String(++uid)
}

// ---- Interpreter error ----

class InterpreterError extends Error {
  line: number
  column: number
  constructor(message: string, line: number, column: number) {
    super(message)
    this.name = 'InterpreterError'
    this.line = line
    this.column = column
  }
}

class ReturnSignal {
  value: RuntimeValue
  constructor(value: RuntimeValue) {
    this.value = value
  }
}

class BreakSignal {}
class ContinueSignal {}

// ---- Scope helpers ----

function createScope(name: string, parent: Scope | null): Scope {
  return { id: nextId(), name, variables: new Map(), parent }
}

function declareVariable(scope: Scope, name: string, value: RuntimeValue, kind: Variable['kind']): void {
  scope.variables.set(name, { name, value, kind })
}

function lookupVariable(scope: Scope, name: string): Variable | null {
  let current: Scope | null = scope
  while (current) {
    const v = current.variables.get(name)
    if (v) return v
    current = current.parent
  }
  return null
}

function setVariable(scope: Scope, name: string, value: RuntimeValue): boolean {
  let current: Scope | null = scope
  while (current) {
    const v = current.variables.get(name)
    if (v) {
      if (v.kind === 'const') {
        throw new Error(`Assignment to constant variable '${name}'`)
      }
      v.value = value
      return true
    }
    current = current.parent
  }
  return false
}

// ---- Snapshot helpers ----

function snapshotScope(scope: Scope): Array<{ name: string; value: string; kind: string }> {
  const vars: Array<{ name: string; value: string; kind: string }> = []
  scope.variables.forEach((v) => {
    vars.push({ name: v.name, value: formatValue(v.value), kind: v.kind })
  })
  return vars
}

// ---- Main interpreter ----

export interface InterpreterResult {
  steps: ExecutionStep[]
  error: { message: string; line: number; column: number } | null
}

export function interpret(ast: AcornNode): InterpreterResult {
  uid = 0

  // Mutable runtime state
  const callStackFrames: Array<{ id: string; name: string; scope: Scope; line: number; args: Array<{ name: string; value: string }> }> = []
  const webAPIs: WebAPIEntry[] = []
  const taskQueue: QueueTask[] = []
  const microtaskQueue: QueueTask[] = []
  const consoleOutput: ConsoleMessage[] = []
  const steps: ExecutionStep[] = []
  let eventLoopPhase: EventLoopPhase = 'callStack'
  let stepCount = 0

  const globalScope = createScope('Global', null)

  // Inject built-in properties
  declareVariable(globalScope, 'undefined', makeUndefined(), 'const')
  declareVariable(globalScope, 'NaN', makeNumber(NaN), 'const')
  declareVariable(globalScope, 'Infinity', makeNumber(Infinity), 'const')

  // --- snapshot ---
  function emitStep(line: number, column: number, description: string): void {
    if (++stepCount > STEP_LIMIT) {
      throw new InterpreterError('Execution limit reached (possible infinite loop)', line, column)
    }

    const stackSnapshot: StackFrame[] = callStackFrames.map((f) => ({
      id: f.id,
      name: f.name,
      args: [...f.args],
      variables: snapshotScope(f.scope),
      line: f.line,
    }))

    const step: ExecutionStep = {
      id: stepCount,
      line,
      column,
      callStack: stackSnapshot,
      webAPIs: webAPIs.map((w) => ({ ...w })),
      taskQueue: taskQueue.map((t) => ({ ...t })),
      microtaskQueue: microtaskQueue.map((t) => ({ ...t })),
      consoleOutput: consoleOutput.map((c) => ({ ...c })),
      eventLoopPhase,
      description,
    }
    steps.push(step)
  }

  function loc(node: AcornNode): { line: number; col: number } {
    return { line: node.loc?.start?.line ?? 1, col: node.loc?.start?.column ?? 0 }
  }

  // ---- Evaluation ----

  function evaluate(node: AcornNode, scope: Scope): RuntimeValue {
    if (!node) return makeUndefined()

    switch (node.type) {
      case 'Program':
        return evalProgram(node, scope)
      case 'ExpressionStatement':
        return evaluate(node.expression, scope)
      case 'VariableDeclaration':
        return evalVariableDeclaration(node, scope)
      case 'FunctionDeclaration':
        return evalFunctionDeclaration(node, scope)
      case 'BlockStatement':
        return evalBlockStatement(node, scope)
      case 'ReturnStatement':
        return evalReturnStatement(node, scope)
      case 'IfStatement':
        return evalIfStatement(node, scope)
      case 'ForStatement':
        return evalForStatement(node, scope)
      case 'WhileStatement':
        return evalWhileStatement(node, scope)
      case 'DoWhileStatement':
        return evalDoWhileStatement(node, scope)
      case 'SwitchStatement':
        return evalSwitchStatement(node, scope)
      case 'CallExpression':
        return evalCallExpression(node, scope)
      case 'NewExpression':
        return evalNewExpression(node, scope)
      case 'MemberExpression':
        return evalMemberExpression(node, scope)
      case 'BinaryExpression':
        return evalBinaryExpression(node, scope)
      case 'LogicalExpression':
        return evalLogicalExpression(node, scope)
      case 'UnaryExpression':
        return evalUnaryExpression(node, scope)
      case 'UpdateExpression':
        return evalUpdateExpression(node, scope)
      case 'AssignmentExpression':
        return evalAssignment(node, scope)
      case 'ConditionalExpression':
        return evalConditionalExpression(node, scope)
      case 'SequenceExpression':
        return evalSequenceExpression(node, scope)
      case 'Identifier':
        return evalIdentifier(node, scope)
      case 'Literal':
        return evalLiteral(node)
      case 'TemplateLiteral':
        return evalTemplateLiteral(node, scope)
      case 'ArrayExpression':
        return evalArrayExpression(node, scope)
      case 'ObjectExpression':
        return evalObjectExpression(node, scope)
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return evalFunctionExpression(node, scope)
      case 'SpreadElement':
        // Simplified: treat as evaluating the argument
        return evaluate(node.argument, scope)
      case 'EmptyStatement':
        return makeUndefined()
      case 'BreakStatement':
        throw new BreakSignal()
      case 'ContinueStatement':
        throw new ContinueSignal()
      default: {
        const { line: l, col: c } = loc(node)
        throw new InterpreterError(`Unsupported syntax: ${node.type as string}`, l, c)
      }
    }
  }

  // ---- Node evaluators ----

  function evalProgram(node: AcornNode, scope: Scope): RuntimeValue {
    // Hoist function declarations
    for (const stmt of node.body) {
      if (stmt.type === 'FunctionDeclaration') {
        const fn = makeFunctionValue(stmt, scope)
        declareVariable(scope, stmt.id.name, fn, 'var')
      }
    }

    // Push global frame
    callStackFrames.push({
      id: nextId(),
      name: 'Global',
      scope,
      line: 1,
      args: [],
    })
    emitStep(1, 0, 'Start program execution')

    let result: RuntimeValue = makeUndefined()
    for (const stmt of node.body) {
      if (stmt.type === 'FunctionDeclaration') continue // already hoisted
      result = evaluate(stmt, scope)
    }

    // Pop global after sync code
    callStackFrames.pop()
    emitStep(node.loc?.end?.line ?? 1, 0, 'Global execution complete')

    return result
  }

  function evalVariableDeclaration(node: AcornNode, scope: Scope): RuntimeValue {
    const kind = node.kind as Variable['kind']
    for (const decl of node.declarations) {
      const name = decl.id.name as string
      const value = decl.init ? evaluate(decl.init, scope) : makeUndefined()
      declareVariable(scope, name, value, kind)

      // Update the top frame's scope reference
      const { line: l, col: c } = loc(node)
      emitStep(l, c, `Declare ${kind} ${name} = ${formatValue(value)}`)
    }
    return makeUndefined()
  }

  function evalFunctionDeclaration(node: AcornNode, scope: Scope): RuntimeValue {
    const fn = makeFunctionValue(node, scope)
    declareVariable(scope, node.id.name, fn, 'var')
    const { line: l, col: c } = loc(node)
    emitStep(l, c, `Declare function ${node.id.name as string}`)
    return makeUndefined()
  }

  function makeFunctionValue(node: AcornNode, closureScope: Scope): RuntimeValue {
    const params = (node.params as AcornNode[]).map((p: AcornNode) => {
      if (p.type === 'Identifier') return p.name as string
      if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier') return p.left.name as string
      return '?'
    })
    const fnVal: FunctionValue = {
      name: node.id?.name ?? '',
      params,
      bodyNode: node.body,
      closureScope,
      isArrow: node.type === 'ArrowFunctionExpression',
    }
    return { type: 'function', value: fnVal }
  }

  function evalBlockStatement(node: AcornNode, scope: Scope): RuntimeValue {
    const blockScope = createScope('Block', scope)
    let result: RuntimeValue = makeUndefined()
    for (const stmt of node.body) {
      result = evaluate(stmt, blockScope)
    }
    return result
  }

  function evalReturnStatement(node: AcornNode, scope: Scope): RuntimeValue {
    const value = node.argument ? evaluate(node.argument, scope) : makeUndefined()
    throw new ReturnSignal(value)
  }

  function evalIfStatement(node: AcornNode, scope: Scope): RuntimeValue {
    const { line: l, col: c } = loc(node)
    const test = evaluate(node.test, scope)
    emitStep(l, c, `if (${formatValue(test)}) => ${isTruthy(test)}`)
    if (isTruthy(test)) {
      return evaluate(node.consequent, scope)
    } else if (node.alternate) {
      return evaluate(node.alternate, scope)
    }
    return makeUndefined()
  }

  function evalForStatement(node: AcornNode, scope: Scope): RuntimeValue {
    const forScope = createScope('Block', scope)
    if (node.init) {
      evaluate(node.init, forScope)
    }
    let iterations = 0
    while (true) {
      if (++iterations > STEP_LIMIT) {
        const { line: l, col: c } = loc(node)
        throw new InterpreterError('Loop iteration limit reached', l, c)
      }
      if (node.test) {
        const test = evaluate(node.test, forScope)
        const { line: l, col: c } = loc(node)
        emitStep(l, c, `for loop condition: ${formatValue(test)}`)
        if (!isTruthy(test)) break
      }
      try {
        evaluate(node.body, forScope)
      } catch (e) {
        if (e instanceof BreakSignal) break
        if (e instanceof ContinueSignal) {
          if (node.update) evaluate(node.update, forScope)
          continue
        }
        throw e
      }
      if (node.update) evaluate(node.update, forScope)
    }
    return makeUndefined()
  }

  function evalWhileStatement(node: AcornNode, scope: Scope): RuntimeValue {
    let iterations = 0
    while (true) {
      if (++iterations > STEP_LIMIT) {
        const { line: l, col: c } = loc(node)
        throw new InterpreterError('Loop iteration limit reached', l, c)
      }
      const test = evaluate(node.test, scope)
      const { line: l, col: c } = loc(node)
      emitStep(l, c, `while condition: ${formatValue(test)}`)
      if (!isTruthy(test)) break
      try {
        evaluate(node.body, scope)
      } catch (e) {
        if (e instanceof BreakSignal) break
        if (e instanceof ContinueSignal) continue
        throw e
      }
    }
    return makeUndefined()
  }

  function evalDoWhileStatement(node: AcornNode, scope: Scope): RuntimeValue {
    let iterations = 0
    do {
      if (++iterations > STEP_LIMIT) {
        const { line: l, col: c } = loc(node)
        throw new InterpreterError('Loop iteration limit reached', l, c)
      }
      try {
        evaluate(node.body, scope)
      } catch (e) {
        if (e instanceof BreakSignal) break
        if (e instanceof ContinueSignal) { /* fall through to test */ }
        else throw e
      }
      const test = evaluate(node.test, scope)
      const { line: l, col: c } = loc(node)
      emitStep(l, c, `do-while condition: ${formatValue(test)}`)
      if (!isTruthy(test)) break
    } while (true)
    return makeUndefined()
  }

  function evalSwitchStatement(node: AcornNode, scope: Scope): RuntimeValue {
    const disc = evaluate(node.discriminant, scope)
    let matched = false
    for (const c of node.cases) {
      if (!matched && c.test) {
        const testVal = evaluate(c.test, scope)
        if (formatValue(disc) === formatValue(testVal)) {
          matched = true
        }
      }
      if (matched || !c.test) {
        if (!c.test) matched = true
        try {
          for (const stmt of c.consequent) {
            evaluate(stmt, scope)
          }
        } catch (e) {
          if (e instanceof BreakSignal) return makeUndefined()
          throw e
        }
      }
    }
    return makeUndefined()
  }

  // ---- Call expressions ----

  function evalCallExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const { line: l, col: c } = loc(node)

    // Detect special patterns: console.log, setTimeout, Promise
    if (node.callee.type === 'MemberExpression') {
      const obj = node.callee.object
      const prop = node.callee.property

      // console.log / .warn / .error
      if (obj.type === 'Identifier' && obj.name === 'console') {
        const method = prop.name as string
        const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
        const text = args.map((a) => toStringVal(a)).join(' ')
        const level = (method === 'warn' || method === 'error' || method === 'info') ? method : 'log' as ConsoleMessage['level']
        consoleOutput.push({ id: nextId(), level, text })
        emitStep(l, c, `console.${method}(${text})`)
        return makeUndefined()
      }

      // Promise.resolve().then(cb)
      if (obj.type === 'CallExpression' && obj.callee?.type === 'MemberExpression') {
        const innerObj = obj.callee.object
        const innerProp = obj.callee.property
        if (
          innerObj.type === 'Identifier' &&
          innerObj.name === 'Promise' &&
          (innerProp.name === 'resolve' || innerProp.name === 'reject') &&
          prop.name === 'then'
        ) {
          // Promise.resolve(val).then(cb)
          const callbackArg = node.arguments[0] as AcornNode | undefined
          if (callbackArg) {
            const cbVal = evaluate(callbackArg, scope)
            if (cbVal.type === 'function') {
              const resolveArgs = (obj.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
              const resolvedVal = resolveArgs[0] ?? makeUndefined()

              // Add to microtask queue
              microtaskQueue.push({
                id: nextId(),
                label: `Promise.${innerProp.name as string}.then(${cbVal.value.name || 'callback'})`,
                type: 'microtask',
                callbackNode: cbVal.value.bodyNode,
                callbackScope: createCallbackScope(cbVal.value, [resolvedVal]),
              })
              emitStep(l, c, `Promise.${innerProp.name as string}().then() - add to microtask queue`)
              return makeUndefined()
            }
          }
          emitStep(l, c, `Promise.${innerProp.name as string}().then()`)
          return makeUndefined()
        }
      }

      // someArray.push, .pop, .length etc
      const objVal = evaluate(obj, scope)
      const propName = node.callee.computed
        ? toStringVal(evaluate(prop, scope))
        : (prop.name as string)

      // Array methods
      if (objVal.type === 'array') {
        const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
        return evalArrayMethod(objVal, propName, args, l, c)
      }

      // Method call on object
      if (objVal.type === 'object') {
        const methodVal = objVal.value[propName]
        if (methodVal && methodVal.type === 'function') {
          const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
          return callFunction(methodVal.value, args, l, c)
        }
      }

      return makeUndefined()
    }

    // Direct function call
    if (node.callee.type === 'Identifier') {
      const name = node.callee.name as string

      // setTimeout(cb, delay)
      if (name === 'setTimeout' || name === 'setInterval') {
        const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
        const cb = args[0]
        const delay = args[1] ? toNumber(args[1]) : 0
        if (cb && cb.type === 'function') {
          const entry: WebAPIEntry = {
            id: nextId(),
            type: name as 'setTimeout' | 'setInterval',
            label: `${name}(${cb.value.name || 'callback'}, ${delay}ms)`,
            delay,
          }
          webAPIs.push(entry)
          emitStep(l, c, `${name}() - add to Web APIs (${delay}ms)`)

          // Immediately schedule: move from Web APIs to task queue
          const idx = webAPIs.indexOf(entry)
          if (idx !== -1) webAPIs.splice(idx, 1)
          taskQueue.push({
            id: nextId(),
            label: `${name} callback`,
            type: 'macrotask',
            callbackNode: cb.value.bodyNode,
            callbackScope: createCallbackScope(cb.value, []),
          })
          emitStep(l, c, `${name} timer complete - move to task queue`)
        }
        return makeNumber(parseInt(nextId()))
      }

      // new Promise or Promise.resolve
      if (name === 'Promise') {
        // This handles: new Promise(executor) via evalNewExpression
        // For direct call, treat as no-op
        return makeUndefined()
      }

      // Math functions
      if (name === 'parseInt') {
        const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
        const val = args[0] ? toStringVal(args[0]) : '0'
        const radix = args[1] ? toNumber(args[1]) : undefined
        return makeNumber(parseInt(val, radix))
      }
      if (name === 'parseFloat') {
        const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
        const val = args[0] ? toStringVal(args[0]) : '0'
        return makeNumber(parseFloat(val))
      }
      if (name === 'isNaN') {
        const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
        const val = args[0] ? toNumber(args[0]) : NaN
        return makeBool(isNaN(val))
      }

      // User function
      const varRef = lookupVariable(scope, name)
      if (!varRef) {
        throw new InterpreterError(`${name} is not defined`, l, c)
      }
      if (varRef.value.type !== 'function') {
        throw new InterpreterError(`${name} is not a function`, l, c)
      }

      const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
      return callFunction(varRef.value.value, args, l, c)
    }

    // Function expression call: (function(){})() or arrow
    const calleeVal = evaluate(node.callee, scope)
    if (calleeVal.type === 'function') {
      const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
      return callFunction(calleeVal.value, args, l, c)
    }

    throw new InterpreterError('Not a callable expression', l, c)
  }

  function evalNewExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const { line: l, col: c } = loc(node)

    if (node.callee.type === 'Identifier' && node.callee.name === 'Promise') {
      // new Promise((resolve, reject) => { ... })
      const executorNode = node.arguments[0] as AcornNode | undefined
      if (!executorNode) {
        emitStep(l, c, 'new Promise() - no executor')
        return makeUndefined()
      }

      const executorVal = evaluate(executorNode, scope)
      if (executorVal.type !== 'function') {
        throw new InterpreterError('Promise executor must be a function', l, c)
      }

      // Create resolve and reject functions
      let resolvedValue: RuntimeValue = makeUndefined()
      const promiseThenCallbacks: FunctionValue[] = []

      const resolveFunc: RuntimeValue = {
        type: 'function',
        value: {
          name: 'resolve',
          params: ['value'],
          bodyNode: null,
          closureScope: scope,
          isArrow: false,
        },
      }
      const rejectFunc: RuntimeValue = {
        type: 'function',
        value: {
          name: 'reject',
          params: ['reason'],
          bodyNode: null,
          closureScope: scope,
          isArrow: false,
        },
      }

      // Execute the executor synchronously
      emitStep(l, c, 'new Promise() - executing executor')
      const execScope = createScope(executorVal.value.name || 'Promise executor', executorVal.value.closureScope)

      // Bind resolve param
      if (executorVal.value.params[0]) {
        declareVariable(execScope, executorVal.value.params[0], resolveFunc, 'let')
      }
      if (executorVal.value.params[1]) {
        declareVariable(execScope, executorVal.value.params[1], rejectFunc, 'let')
      }

      // Execute body - intercept resolve/reject calls
      const origEvalCall = evalCallInExecutor.bind(null, (val: RuntimeValue) => {
        resolvedValue = val
        // When resolve is called, schedule .then callbacks as microtasks
        for (const thenCb of promiseThenCallbacks) {
          microtaskQueue.push({
            id: nextId(),
            label: `Promise.then(${thenCb.name || 'callback'})`,
            type: 'microtask',
            callbackNode: thenCb.bodyNode,
            callbackScope: createCallbackScope(thenCb, [resolvedValue]),
          })
        }
      })

      // Simple execution of the executor body
      const frameId = nextId()
      callStackFrames.push({
        id: frameId,
        name: 'Promise executor',
        scope: execScope,
        line: l,
        args: [],
      })
      emitStep(l, c, 'Push Promise executor to call stack')

      try {
        if (executorVal.value.bodyNode) {
          executeBodyWithResolve(executorVal.value.bodyNode, execScope, origEvalCall)
        }
      } catch (e) {
        if (e instanceof ReturnSignal) {
          // ignore return from executor
        } else {
          throw e
        }
      } finally {
        callStackFrames.pop()
        emitStep(l, c, 'Pop Promise executor from call stack')
      }

      // Return a pseudo-promise object that supports .then
      const promiseObj: RuntimeValue = {
        type: 'object',
        value: {
          __isPromise: makeBool(true),
          __resolvedValue: resolvedValue,
          __thenCallbacks: { type: 'array', value: [] },
        },
      }

      // Monkey-patch for .then chaining
      Object.defineProperty(promiseObj, '__promiseThenCallbacks', {
        value: promiseThenCallbacks,
        enumerable: false,
      })

      return promiseObj
    }

    // Generic new expression - create object
    const ctorVal = evaluate(node.callee, scope)
    if (ctorVal.type === 'function') {
      const args = (node.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
      const obj: RuntimeValue = { type: 'object', value: {} }
      const newScope = createScope(ctorVal.value.name || 'constructor', ctorVal.value.closureScope)
      for (let i = 0; i < ctorVal.value.params.length; i++) {
        declareVariable(newScope, ctorVal.value.params[i]!, args[i] ?? makeUndefined(), 'let')
      }
      try {
        if (ctorVal.value.bodyNode) {
          evaluate(ctorVal.value.bodyNode, newScope)
        }
      } catch (e) {
        if (!(e instanceof ReturnSignal)) throw e
      }
      return obj
    }

    throw new InterpreterError('Not a constructor', l, c)
  }

  function executeBodyWithResolve(
    body: AcornNode,
    scope: Scope,
    onResolve: (val: RuntimeValue) => void,
  ): void {
    // Walk the body; when we see a call to resolve(), invoke onResolve
    if (!body) return
    if (body.type === 'BlockStatement') {
      for (const stmt of body.body) {
        executeStmtWithResolve(stmt, scope, onResolve)
      }
    } else {
      evaluate(body, scope)
    }
  }

  function executeStmtWithResolve(
    stmt: AcornNode,
    scope: Scope,
    onResolve: (val: RuntimeValue) => void,
  ): void {
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
      const callee = stmt.expression.callee
      if (callee.type === 'Identifier') {
        const varRef = lookupVariable(scope, callee.name)
        if (varRef && varRef.value.type === 'function' && varRef.value.value.name === 'resolve') {
          const args = (stmt.expression.arguments as AcornNode[]).map((a: AcornNode) => evaluate(a, scope))
          onResolve(args[0] ?? makeUndefined())
          const { line: l, col: c } = loc(stmt)
          emitStep(l, c, `resolve(${args[0] ? formatValue(args[0]) : ''}) - schedule microtasks`)
          return
        }
        if (varRef && varRef.value.type === 'function' && varRef.value.value.name === 'reject') {
          const { line: l, col: c } = loc(stmt)
          emitStep(l, c, 'reject() called')
          return
        }
      }
    }
    evaluate(stmt, scope)
  }

  function evalCallInExecutor(_onResolve: (val: RuntimeValue) => void): void {
    // placeholder - resolution is handled inside executeStmtWithResolve
  }
  // Suppress unused warning
  void evalCallInExecutor

  function createCallbackScope(fn: FunctionValue, args: RuntimeValue[]): Scope {
    const cbScope = createScope(fn.name || 'callback', fn.closureScope)
    for (let i = 0; i < fn.params.length; i++) {
      declareVariable(cbScope, fn.params[i]!, args[i] ?? makeUndefined(), 'let')
    }
    return cbScope
  }

  function callFunction(fn: FunctionValue, args: RuntimeValue[], line: number, col: number): RuntimeValue {
    const fnScope = createScope(fn.name || 'anonymous', fn.closureScope)

    // Bind params
    const argSnapshots: Array<{ name: string; value: string }> = []
    for (let i = 0; i < fn.params.length; i++) {
      const val = args[i] ?? makeUndefined()
      declareVariable(fnScope, fn.params[i]!, val, 'let')
      argSnapshots.push({ name: fn.params[i]!, value: formatValue(val) })
    }

    // Push frame
    const frameId = nextId()
    callStackFrames.push({
      id: frameId,
      name: fn.name || 'anonymous',
      scope: fnScope,
      line,
      args: argSnapshots,
    })
    emitStep(line, col, `Call ${fn.name || 'anonymous'}(${args.map(formatValue).join(', ')})`)

    let result: RuntimeValue = makeUndefined()
    try {
      if (fn.bodyNode) {
        if (fn.bodyNode.type === 'BlockStatement') {
          // Hoist function declarations inside
          for (const stmt of fn.bodyNode.body) {
            if (stmt.type === 'FunctionDeclaration') {
              const innerFn = makeFunctionValue(stmt, fnScope)
              declareVariable(fnScope, stmt.id.name, innerFn, 'var')
            }
          }
          for (const stmt of fn.bodyNode.body) {
            if (stmt.type === 'FunctionDeclaration') continue
            evaluate(stmt, fnScope)
          }
        } else {
          // Arrow function with expression body
          result = evaluate(fn.bodyNode, fnScope)
        }
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        result = e.value
      } else {
        callStackFrames.pop()
        throw e
      }
    }

    callStackFrames.pop()
    emitStep(line, col, `Return from ${fn.name || 'anonymous'} => ${formatValue(result)}`)
    return result
  }

  // ---- Expression evaluators ----

  function evalArrayMethod(
    arrVal: RuntimeValue & { type: 'array' },
    method: string,
    args: RuntimeValue[],
    _line: number,
    _col: number,
  ): RuntimeValue {
    switch (method) {
      case 'push':
        arrVal.value.push(...args)
        return makeNumber(arrVal.value.length)
      case 'pop':
        return arrVal.value.pop() ?? makeUndefined()
      case 'shift':
        return arrVal.value.shift() ?? makeUndefined()
      case 'unshift':
        arrVal.value.unshift(...args)
        return makeNumber(arrVal.value.length)
      case 'length':
        return makeNumber(arrVal.value.length)
      case 'join': {
        const sep = args[0] ? toStringVal(args[0]) : ','
        return makeString(arrVal.value.map(toStringVal).join(sep))
      }
      case 'indexOf': {
        const target = args[0] ? formatValue(args[0]) : formatValue(makeUndefined())
        const idx = arrVal.value.findIndex((v) => formatValue(v) === target)
        return makeNumber(idx)
      }
      case 'includes': {
        const target = args[0] ? formatValue(args[0]) : formatValue(makeUndefined())
        return makeBool(arrVal.value.some((v) => formatValue(v) === target))
      }
      default:
        return makeUndefined()
    }
  }

  function evalMemberExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const obj = evaluate(node.object, scope)
    const prop = node.computed
      ? toStringVal(evaluate(node.property, scope))
      : (node.property.name as string)

    if (obj.type === 'array') {
      if (prop === 'length') return makeNumber(obj.value.length)
      const idx = parseInt(prop)
      if (!isNaN(idx)) return obj.value[idx] ?? makeUndefined()
    }

    if (obj.type === 'object') {
      return obj.value[prop] ?? makeUndefined()
    }

    if (obj.type === 'string') {
      if (prop === 'length') return makeNumber(obj.value.length)
      const idx = parseInt(prop)
      if (!isNaN(idx)) return makeString(obj.value[idx] ?? '')
    }

    // Math object support
    if (node.object.type === 'Identifier' && node.object.name === 'Math') {
      const mathProps: Record<string, RuntimeValue> = {
        PI: makeNumber(Math.PI),
        E: makeNumber(Math.E),
        LN2: makeNumber(Math.LN2),
        LN10: makeNumber(Math.LN10),
        SQRT2: makeNumber(Math.SQRT2),
      }
      if (mathProps[prop]) return mathProps[prop]

      // Math methods - return a pseudo-function
      const mathMethods = ['floor', 'ceil', 'round', 'abs', 'min', 'max', 'random', 'sqrt', 'pow', 'log']
      if (mathMethods.includes(prop)) {
        return {
          type: 'function',
          value: {
            name: `Math.${prop}`,
            params: ['x'],
            bodyNode: null,
            closureScope: scope,
            isArrow: false,
          },
        }
      }
    }

    return makeUndefined()
  }

  function evalBinaryExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const left = evaluate(node.left, scope)
    const right = evaluate(node.right, scope)
    const op = node.operator as string

    // String concatenation
    if (op === '+' && (left.type === 'string' || right.type === 'string')) {
      return makeString(toStringVal(left) + toStringVal(right))
    }

    const lNum = toNumber(left)
    const rNum = toNumber(right)

    switch (op) {
      case '+': return makeNumber(lNum + rNum)
      case '-': return makeNumber(lNum - rNum)
      case '*': return makeNumber(lNum * rNum)
      case '/': return makeNumber(lNum / rNum)
      case '%': return makeNumber(lNum % rNum)
      case '**': return makeNumber(lNum ** rNum)
      case '<': return makeBool(lNum < rNum)
      case '>': return makeBool(lNum > rNum)
      case '<=': return makeBool(lNum <= rNum)
      case '>=': return makeBool(lNum >= rNum)
      case '==':
      case '===': return makeBool(formatValue(left) === formatValue(right))
      case '!=':
      case '!==': return makeBool(formatValue(left) !== formatValue(right))
      case '&': return makeNumber(lNum & rNum)
      case '|': return makeNumber(lNum | rNum)
      case '^': return makeNumber(lNum ^ rNum)
      case '<<': return makeNumber(lNum << rNum)
      case '>>': return makeNumber(lNum >> rNum)
      case '>>>': return makeNumber(lNum >>> rNum)
      default: return makeUndefined()
    }
  }

  function evalLogicalExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const left = evaluate(node.left, scope)
    const op = node.operator as string

    if (op === '&&') return isTruthy(left) ? evaluate(node.right, scope) : left
    if (op === '||') return isTruthy(left) ? left : evaluate(node.right, scope)
    if (op === '??') return (left.type === 'null' || left.type === 'undefined') ? evaluate(node.right, scope) : left
    return makeUndefined()
  }

  function evalUnaryExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const arg = evaluate(node.argument, scope)
    const op = node.operator as string

    switch (op) {
      case '-': return makeNumber(-toNumber(arg))
      case '+': return makeNumber(+toNumber(arg))
      case '!': return makeBool(!isTruthy(arg))
      case '~': return makeNumber(~toNumber(arg))
      case 'typeof': return makeString(arg.type === 'function' ? 'function' : arg.type === 'null' ? 'object' : arg.type)
      case 'void': return makeUndefined()
      default: return makeUndefined()
    }
  }

  function evalUpdateExpression(node: AcornNode, scope: Scope): RuntimeValue {
    if (node.argument.type !== 'Identifier') {
      const { line: l, col: c } = loc(node)
      throw new InterpreterError('Invalid update target', l, c)
    }
    const name = node.argument.name as string
    const current = lookupVariable(scope, name)
    if (!current) {
      const { line: l, col: c } = loc(node)
      throw new InterpreterError(`${name} is not defined`, l, c)
    }
    const oldVal = toNumber(current.value)
    const newVal = node.operator === '++' ? oldVal + 1 : oldVal - 1
    setVariable(scope, name, makeNumber(newVal))
    const { line: l, col: c } = loc(node)
    emitStep(l, c, `${name}${node.operator as string} => ${newVal}`)
    return node.prefix ? makeNumber(newVal) : makeNumber(oldVal)
  }

  function evalAssignment(node: AcornNode, scope: Scope): RuntimeValue {
    const value = evaluate(node.right, scope)

    if (node.left.type === 'Identifier') {
      const name = node.left.name as string
      const op = node.operator as string

      if (op === '=') {
        if (!setVariable(scope, name, value)) {
          // Implicit global
          declareVariable(globalScope, name, value, 'var')
        }
      } else {
        const current = lookupVariable(scope, name)
        if (!current) {
          const { line: l, col: c } = loc(node)
          throw new InterpreterError(`${name} is not defined`, l, c)
        }
        const oldNum = toNumber(current.value)
        const newNum = toNumber(value)
        let result: number
        switch (op) {
          case '+=':
            if (current.value.type === 'string' || value.type === 'string') {
              const newStr = toStringVal(current.value) + toStringVal(value)
              setVariable(scope, name, makeString(newStr))
              const { line: l, col: c } = loc(node)
              emitStep(l, c, `${name} ${op} ${formatValue(value)} => "${newStr}"`)
              return makeString(newStr)
            }
            result = oldNum + newNum
            break
          case '-=': result = oldNum - newNum; break
          case '*=': result = oldNum * newNum; break
          case '/=': result = oldNum / newNum; break
          case '%=': result = oldNum % newNum; break
          default: result = toNumber(value)
        }
        setVariable(scope, name, makeNumber(result))
        const { line: l, col: c } = loc(node)
        emitStep(l, c, `${name} ${op} ${formatValue(value)} => ${result}`)
        return makeNumber(result)
      }

      const { line: l, col: c } = loc(node)
      emitStep(l, c, `${name} = ${formatValue(value)}`)
      return value
    }

    // Member assignment: obj.prop = val
    if (node.left.type === 'MemberExpression') {
      const obj = evaluate(node.left.object, scope)
      const prop = node.left.computed
        ? toStringVal(evaluate(node.left.property, scope))
        : (node.left.property.name as string)

      if (obj.type === 'object') {
        obj.value[prop] = value
      } else if (obj.type === 'array') {
        const idx = parseInt(prop)
        if (!isNaN(idx)) obj.value[idx] = value
      }
      const { line: l, col: c } = loc(node)
      emitStep(l, c, `Set .${prop} = ${formatValue(value)}`)
      return value
    }

    return value
  }

  function evalConditionalExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const test = evaluate(node.test, scope)
    return isTruthy(test)
      ? evaluate(node.consequent, scope)
      : evaluate(node.alternate, scope)
  }

  function evalSequenceExpression(node: AcornNode, scope: Scope): RuntimeValue {
    let result: RuntimeValue = makeUndefined()
    for (const expr of node.expressions) {
      result = evaluate(expr, scope)
    }
    return result
  }

  function evalIdentifier(node: AcornNode, scope: Scope): RuntimeValue {
    const name = node.name as string

    // Special globals
    if (name === 'console') return { type: 'object', value: {} }
    if (name === 'Math') return { type: 'object', value: {} }
    if (name === 'Promise') return { type: 'function', value: { name: 'Promise', params: ['executor'], bodyNode: null, closureScope: scope, isArrow: false } }

    const v = lookupVariable(scope, name)
    if (!v) {
      const { line: l, col: c } = loc(node)
      throw new InterpreterError(`${name} is not defined`, l, c)
    }
    return v.value
  }

  function evalLiteral(node: AcornNode): RuntimeValue {
    if (node.value === null) return makeNull()
    switch (typeof node.value) {
      case 'number': return makeNumber(node.value)
      case 'string': return makeString(node.value)
      case 'boolean': return makeBool(node.value)
      default: return makeUndefined()
    }
  }

  function evalTemplateLiteral(node: AcornNode, scope: Scope): RuntimeValue {
    let result = ''
    for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.cooked as string
      if (i < node.expressions.length) {
        const val = evaluate(node.expressions[i], scope)
        result += toStringVal(val)
      }
    }
    return makeString(result)
  }

  function evalArrayExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const elements = (node.elements as AcornNode[]).map((el: AcornNode) =>
      el ? evaluate(el, scope) : makeUndefined(),
    )
    return { type: 'array', value: elements }
  }

  function evalObjectExpression(node: AcornNode, scope: Scope): RuntimeValue {
    const obj: Record<string, RuntimeValue> = {}
    for (const prop of node.properties) {
      if (prop.type === 'SpreadElement') continue
      const key = prop.key.type === 'Identifier'
        ? (prop.key.name as string)
        : String(prop.key.value)
      obj[key] = evaluate(prop.value, scope)
    }
    return { type: 'object', value: obj }
  }

  function evalFunctionExpression(node: AcornNode, scope: Scope): RuntimeValue {
    return makeFunctionValue(node, scope)
  }

  // ---- Event loop simulation ----

  function processEventLoop(): void {
    // Phase: drain microtask queue
    while (microtaskQueue.length > 0) {
      eventLoopPhase = 'microtasks'
      const task = microtaskQueue.shift()!
      emitStep(0, 0, `Event loop: dequeue microtask "${task.label}"`)

      // Push callback to call stack and execute
      const frameId = nextId()
      callStackFrames.push({
        id: frameId,
        name: task.label,
        scope: task.callbackScope,
        line: 0,
        args: [],
      })
      eventLoopPhase = 'callStack'
      emitStep(0, 0, `Execute microtask: ${task.label}`)

      try {
        if (task.callbackNode) {
          if ((task.callbackNode as AcornNode).type === 'BlockStatement') {
            for (const stmt of (task.callbackNode as AcornNode).body) {
              evaluate(stmt, task.callbackScope)
            }
          } else {
            evaluate(task.callbackNode as AcornNode, task.callbackScope)
          }
        }
      } catch (e) {
        if (e instanceof ReturnSignal) {
          // Ignore return from callback
        } else if (e instanceof InterpreterError) {
          consoleOutput.push({ id: nextId(), level: 'error', text: e.message })
        } else {
          throw e
        }
      } finally {
        callStackFrames.pop()
        emitStep(0, 0, `Microtask "${task.label}" complete`)
      }
    }

    // Phase: pick one macrotask
    if (taskQueue.length > 0) {
      eventLoopPhase = 'macrotasks'
      const task = taskQueue.shift()!
      emitStep(0, 0, `Event loop: dequeue macrotask "${task.label}"`)

      const frameId = nextId()
      callStackFrames.push({
        id: frameId,
        name: task.label,
        scope: task.callbackScope,
        line: 0,
        args: [],
      })
      eventLoopPhase = 'callStack'
      emitStep(0, 0, `Execute macrotask: ${task.label}`)

      try {
        if (task.callbackNode) {
          if ((task.callbackNode as AcornNode).type === 'BlockStatement') {
            for (const stmt of (task.callbackNode as AcornNode).body) {
              evaluate(stmt, task.callbackScope)
            }
          } else {
            evaluate(task.callbackNode as AcornNode, task.callbackScope)
          }
        }
      } catch (e) {
        if (e instanceof ReturnSignal) {
          // Ignore return from callback
        } else if (e instanceof InterpreterError) {
          consoleOutput.push({ id: nextId(), level: 'error', text: e.message })
        } else {
          throw e
        }
      } finally {
        callStackFrames.pop()
        emitStep(0, 0, `Macrotask "${task.label}" complete`)
      }

      // After macrotask, drain microtasks again
      processEventLoop()
    }

    if (taskQueue.length === 0 && microtaskQueue.length === 0) {
      eventLoopPhase = 'idle'
      if (steps.length > 0 && steps[steps.length - 1]!.eventLoopPhase !== 'idle') {
        emitStep(0, 0, 'Event loop idle - all tasks complete')
      }
    }
  }

  // ---- Run ----
  try {
    evaluate(ast, globalScope)
    processEventLoop()
    return { steps, error: null }
  } catch (e) {
    if (e instanceof InterpreterError) {
      // Add an error step
      consoleOutput.push({ id: nextId(), level: 'error', text: e.message })
      emitStep(e.line, e.column, `Error: ${e.message}`)
      return { steps, error: { message: e.message, line: e.line, column: e.column } }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return { steps, error: { message: msg, line: 1, column: 0 } }
  }
}

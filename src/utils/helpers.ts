import type { RuntimeValue } from '@/engine/types'

export function formatValue(val: RuntimeValue): string {
  switch (val.type) {
    case 'number':
    case 'boolean':
      return String(val.value)
    case 'string':
      return `"${val.value}"`
    case 'undefined':
      return 'undefined'
    case 'null':
      return 'null'
    case 'function':
      return `fn ${val.value.name || 'anonymous'}()`
    case 'array':
      return `[${val.value.map(formatValue).join(', ')}]`
    case 'object': {
      const entries = Object.entries(val.value)
      if (entries.length === 0) return '{}'
      if (entries.length <= 3) {
        return `{${entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')}}`
      }
      return `{${entries.slice(0, 3).map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')}, ...}`
    }
    default: {
      const _exhaustive: never = val
      return String(_exhaustive)
    }
  }
}

export function makeUndefined(): RuntimeValue {
  return { type: 'undefined', value: undefined }
}

export function makeNumber(n: number): RuntimeValue {
  return { type: 'number', value: n }
}

export function makeString(s: string): RuntimeValue {
  return { type: 'string', value: s }
}

export function makeBool(b: boolean): RuntimeValue {
  return { type: 'boolean', value: b }
}

export function makeNull(): RuntimeValue {
  return { type: 'null', value: null }
}

export function isTruthy(val: RuntimeValue): boolean {
  switch (val.type) {
    case 'undefined':
    case 'null':
      return false
    case 'boolean':
      return val.value
    case 'number':
      return val.value !== 0 && !isNaN(val.value)
    case 'string':
      return val.value.length > 0
    case 'function':
    case 'object':
    case 'array':
      return true
    default: {
      const _exhaustive: never = val
      void _exhaustive
      return false
    }
  }
}

export function toNumber(val: RuntimeValue): number {
  switch (val.type) {
    case 'number': return val.value
    case 'boolean': return val.value ? 1 : 0
    case 'string': return Number(val.value) || 0
    case 'null': return 0
    case 'undefined': return NaN
    default: return NaN
  }
}

export function toStringVal(val: RuntimeValue): string {
  return formatValue(val).replace(/^"|"$/g, '')
}

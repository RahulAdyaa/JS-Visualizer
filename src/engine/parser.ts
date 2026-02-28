import * as acorn from 'acorn'
import type { ParseResult } from './types'

export function parseCode(source: string): ParseResult {
  try {
    const ast = acorn.parse(source, {
      ecmaVersion: 2020,
      locations: true,
      ranges: true,
      sourceType: 'script',
    })
    return { success: true, ast }
  } catch (err: unknown) {
    if (err instanceof SyntaxError) {
      const loc = (err as SyntaxError & { loc?: { line: number; column: number } }).loc
      return {
        success: false,
        error: {
          message: err.message,
          line: loc?.line ?? 1,
          column: loc?.column ?? 0,
        },
      }
    }
    return {
      success: false,
      error: { message: String(err), line: 1, column: 0 },
    }
  }
}

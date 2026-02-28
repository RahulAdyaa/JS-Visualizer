import { useVisualizerStore } from '@/store/useVisualizerStore'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export const EXAMPLES: Array<{ name: string; code: string }> = [
  {
    name: 'Hello World',
    code: `console.log("Hello, World!");
`,
  },
  {
    name: 'Function Calls',
    code: `function multiply(a, b) {
  return a * b;
}

function square(n) {
  return multiply(n, n);
}

const result = square(5);
console.log("5 squared =", result);
`,
  },
  {
    name: 'Closures',
    code: `function createCounter() {
  let count = 0;
  function increment() {
    count = count + 1;
    return count;
  }
  return increment;
}

const counter = createCounter();
console.log(counter());
console.log(counter());
console.log(counter());
`,
  },
  {
    name: 'Recursion',
    code: `function factorial(n) {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

const result = factorial(5);
console.log("5! =", result);
`,
  },
  {
    name: 'setTimeout',
    code: `console.log("Start");

setTimeout(function timer() {
  console.log("Timer callback");
}, 0);

console.log("End");
`,
  },
  {
    name: 'Promises',
    code: `console.log("Start");

Promise.resolve("resolved").then(function onFulfilled(val) {
  console.log("Promise:", val);
});

console.log("End");
`,
  },
  {
    name: 'Event Loop Classic',
    code: `console.log("1 - Start");

setTimeout(function macrotask() {
  console.log("2 - setTimeout");
}, 0);

Promise.resolve("micro").then(function microtask(val) {
  console.log("3 - Promise:", val);
});

console.log("4 - End");
`,
  },
  {
    name: 'Nested Timers',
    code: `console.log("Start");

setTimeout(function outer() {
  console.log("Outer timer");
  setTimeout(function inner() {
    console.log("Inner timer");
  }, 0);
}, 0);

console.log("End");
`,
  },
]

export default function ExampleSelector() {
  const setSourceCode = useVisualizerStore((s) => s.setSourceCode)
  const reset = useVisualizerStore((s) => s.reset)
  const executionSteps = useVisualizerStore((s) => s.executionSteps)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectExample(code: string) {
    if (executionSteps.length > 0) reset()
    setSourceCode(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors border border-gray-700"
      >
        Examples
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => selectExample(ex.code)}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {ex.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

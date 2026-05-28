import React, { useState, useRef, useEffect } from 'react'
import { X, Move } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function ScientificCalculator() {
  const { calculatorOpen, setCalculatorOpen } = useAppStore()
  const [display, setDisplay] = useState('')
  const [history, setHistory] = useState('')
  const [isRadian, setIsRadian] = useState(true)
  
  // Dragging state
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0 })

  // Initialize position to center of screen on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && calculatorOpen) {
      const x = Math.max(20, (window.innerWidth - 320) / 2)
      const y = Math.max(20, (window.innerHeight - 460) / 2)
      setPosition({ x, y })
    }
  }, [calculatorOpen])

  // Calculation Logic
  const append = (value) => {
    setDisplay((prev) => prev + value)
  }

  const clear = () => {
    setDisplay('')
    setHistory('')
  }

  const backspace = () => {
    setDisplay((prev) => prev.slice(0, -1))
  }

  const parseAndEvaluate = () => {
    try {
      let expression = display
      if (!expression) return

      // Auto-close unbalanced open parentheses
      const openCount = (expression.match(/\(/g) || []).length
      const closeCount = (expression.match(/\)/g) || []).length
      if (openCount > closeCount) {
        expression += ')'.repeat(openCount - closeCount)
      }

      setHistory(expression)

      // Replace math terms with Javascript equivalents
      let parsed = expression
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/√\(/g, 'Math.sqrt(')

      // Replace trigonometry (sin, cos, tan)
      // Check radian/degree mode
      const trigFunctions = ['sin', 'cos', 'tan']
      trigFunctions.forEach(fn => {
        const regex = new RegExp(`${fn}\\(([^)]+)\\)`, 'g')
        parsed = parsed.replace(regex, (match, arg) => {
          try {
            // Evaluate the inside argument first
            const argVal = eval(arg.replace(/π/g, 'Math.PI').replace(/e/g, 'Math.E'))
            const angle = isRadian ? argVal : (argVal * Math.PI) / 180
            if (fn === 'sin') return `Math.sin(${angle})`
            if (fn === 'cos') return `Math.cos(${angle})`
            if (fn === 'tan') return `Math.tan(${angle})`
          } catch {
            return match
          }
        })
      })

      // Replace logs
      parsed = parsed.replace(/ln\(/g, 'Math.log(')
      parsed = parsed.replace(/log\(/g, 'Math.log10(')

      // Replace power x^y with Math.pow(x,y)
      parsed = parsed.replace(/\^/g, '**')

      // Evaluate the final javascript expression
      // eslint-disable-next-line no-eval
      let result = eval(parsed)

      // Format result
      if (typeof result === 'number') {
        if (Number.isNaN(result) || !Number.isFinite(result)) {
          setDisplay('Error')
        } else {
          // Limit decimal places
          const fixedResult = parseFloat(result.toFixed(8)).toString()
          setDisplay(fixedResult)
        }
      } else {
        setDisplay('Error')
      }
    } catch (error) {
      setDisplay('Error')
    }
  }

  const factorial = () => {
    try {
      const num = parseInt(display, 10)
      if (isNaN(num) || num < 0) {
        setDisplay('Error')
        return
      }
      let fact = 1
      for (let i = 2; i <= num; i++) {
        fact *= i
      }
      setHistory(`${num}!`)
      setDisplay(fact.toString())
    } catch {
      setDisplay('Error')
    }
  }

  // Keyboard support listener
  useEffect(() => {
    if (!calculatorOpen) return

    const handleKeyPress = (e) => {
      const key = e.key
      
      // Numbers
      if (/^[0-9]$/.test(key)) {
        append(key)
      }
      // Operators
      else if (['+', '-', '*', '/', '%', '(', ')'].includes(key)) {
        append(key)
      }
      // Decimals
      else if (key === '.') {
        append('.')
      }
      // Exponent
      else if (key === '^') {
        append('^')
      }
      // Enter key for evaluation
      else if (key === 'Enter') {
        e.preventDefault()
        parseAndEvaluate()
      }
      // Backspace for deleting last character
      else if (key === 'Backspace') {
        backspace()
      }
      // Escape or 'c'/'C' for clearing
      else if (key === 'Escape' || key.toLowerCase() === 'c') {
        clear()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [calculatorOpen, display])

  // Dragging event handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true)
      offsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      }
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - offsetRef.current.x
      const newY = e.clientY - offsetRef.current.y
      
      // Clamp inside window boundaries
      const clampedX = Math.max(0, Math.min(window.innerWidth - 320, newX))
      const clampedY = Math.max(0, Math.min(window.innerHeight - 480, newY))
      
      setPosition({ x: clampedX, y: clampedY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!calculatorOpen) return null

  return (
    <div
      ref={dragRef}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        position: 'fixed'
      }}
      className="z-[150] w-80 rounded-modal bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-2xl overflow-hidden select-none"
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        className="drag-handle flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-border-light dark:border-border-dark cursor-move"
      >
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Move size={14} className="text-primary animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider">Scientific Calculator</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRadian(!isRadian)}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {isRadian ? 'RAD' : 'DEG'}
          </button>
          <button
            onClick={() => setCalculatorOpen(false)}
            className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Screen */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 text-right border-b border-border-light dark:border-border-dark">
        <div className="text-xs text-slate-400 dark:text-slate-500 h-5 overflow-hidden truncate font-mono">
          {history || '\u00A0'}
        </div>
        <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100 font-mono truncate h-8 mt-1">
          {display || '0'}
        </div>
      </div>

      {/* Buttons Grid */}
      <div className="p-3 bg-card-light dark:bg-card-dark grid grid-cols-5 gap-1.5">
        {/* Row 1 */}
        <button onClick={() => append('sin(')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">sin</button>
        <button onClick={() => append('cos(')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">cos</button>
        <button onClick={() => append('tan(')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">tan</button>
        <button onClick={() => append('log(')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">log</button>
        <button onClick={() => append('ln(')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">ln</button>

        {/* Row 2 */}
        <button onClick={() => append('√(')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">√</button>
        <button onClick={() => append('^')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">x^y</button>
        <button onClick={factorial} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">x!</button>
        <button onClick={() => append('π')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">π</button>
        <button onClick={() => append('e')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">e</button>

        {/* Row 3 */}
        <button onClick={clear} className="calc-btn col-span-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold">C</button>
        <button onClick={backspace} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">⌫</button>
        <button onClick={() => append('(')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">(</button>
        <button onClick={() => append(')')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">)</button>

        {/* Row 4 */}
        <button onClick={() => append('7')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">7</button>
        <button onClick={() => append('8')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">8</button>
        <button onClick={() => append('9')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">9</button>
        <button onClick={() => append('/')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold">÷</button>
        <button onClick={() => append('%')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold">%</button>

        {/* Row 5 */}
        <button onClick={() => append('4')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">4</button>
        <button onClick={() => append('5')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">5</button>
        <button onClick={() => append('6')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">6</button>
        <button onClick={() => append('*')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold">×</button>
        <button onClick={() => append('00')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">00</button>

        {/* Row 6 */}
        <button onClick={() => append('1')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">1</button>
        <button onClick={() => append('2')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">2</button>
        <button onClick={() => append('3')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">3</button>
        <button onClick={() => append('-')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold">-</button>
        <button onClick={() => append('.')} className="calc-btn bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">.</button>

        {/* Row 7 */}
        <button onClick={() => append('0')} className="calc-btn col-span-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850">0</button>
        <button onClick={parseAndEvaluate} className="calc-btn col-span-2 bg-primary text-white hover:bg-primary-hover font-bold shadow-sm">=</button>
        <button onClick={() => append('+')} className="calc-btn bg-slate-100 dark:bg-slate-800 text-primary hover:bg-indigo-50 dark:hover:bg-indigo-950/20 font-bold">+</button>
      </div>
    </div>
  )
}

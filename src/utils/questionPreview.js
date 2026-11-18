// One-line plain-text version of a question for lists and cards, where the full
// QuestionText renderer is too heavy: blanks become "____", maths becomes
// readable symbols, markdown and HTML markers are dropped, tables and code
// blocks are left out, and whitespace is collapsed.

const SYMBOLS = {
  rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', leftrightarrow: '↔', Leftrightarrow: '⇔', implies: '⇒', iff: '⇔', mapsto: '↦',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡', sim: '∼',
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', ast: '∗',
  ldots: '…', cdots: '⋯', dots: '…', infty: '∞', partial: '∂', nabla: '∇',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇', cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅',
  forall: '∀', exists: '∃', neg: '¬', lnot: '¬', land: '∧', wedge: '∧', lor: '∨', vee: '∨', oplus: '⊕', otimes: '⊗',
  sum: 'Σ', prod: 'Π', int: '∫', sqrt: '√',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', varphi: 'φ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Sigma: 'Σ', Phi: 'Φ', Omega: 'Ω',
  lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', langle: '⟨', rangle: '⟩', mid: '|', vert: '|',
  log: 'log', ln: 'ln', sin: 'sin', cos: 'cos', tan: 'tan', max: 'max', min: 'min', lim: 'lim', mod: 'mod', bmod: 'mod'
}

const latexToText = (math) => math
  .replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
  .replace(/\\binom\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, 'C($1, $2)')
  .replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
  .replace(/\\(?:text|mathrm|mathbf|mathit|mathsf|mathtt|operatorname|textbf|textit|overline|bar|hat|vec)\s*\{([^{}]*)\}/g, '$1')
  .replace(/\\(?:left|right|big|Big|bigg|Bigg)(?![A-Za-z])\s*/g, '')
  .replace(/\\([A-Za-z]+)/g, (m, name) => (SYMBOLS[name] !== undefined ? SYMBOLS[name] : name))
  .replace(/\\([{}_%#&$,;:! ])/g, (m, c) => (/[,;:! ]/.test(c) ? ' ' : c))
  .replace(/\^\{([^{}]*)\}/g, '^$1')
  .replace(/_\{([^{}]*)\}/g, '_$1')
  .replace(/[{}]/g, '')
  .replace(/_([0-9])(?![0-9])/g, (m, d) => '₀₁₂₃₄₅₆₇₈₉'[d])

export const questionPreview = (text = '') =>
  String(text)
    .replace(/```[\s\S]*?```/g, ' [code] ')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/(?:\\_){2,}|_{4,}/g, '____')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\$\$([\s\S]*?)\$\$/g, (m, math) => latexToText(math))
    .replace(/\$([^$]*)\$/g, (m, math) => latexToText(math))
    .replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, (m, a, b) => latexToText(a || b || ''))
    .replace(/\\([A-Za-z]+)/g, (m, name) => (SYMBOLS[name] !== undefined ? SYMBOLS[name] : m))
    .replace(/\\([{}_%#&$*])/g, '$1')
    .replace(/\\ /g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)([^*_]+)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,:;!?]|$)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

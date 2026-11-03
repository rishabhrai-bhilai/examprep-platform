// One-line plain-text version of a question for lists and cards, where the full
// QuestionText renderer is too heavy: blanks become "____", math delimiters and
// markdown markers are dropped, and whitespace is collapsed.
export const questionPreview = (text = '') =>
  String(text)
    .replace(/(?:\\_){2,}|_{4,}/g, '____')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\$\$?([^$]*)\$\$?/g, '$1')
    .replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\{([^}]*)\}/g, '$1')
    .replace(/\\([{}_%#&$])/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

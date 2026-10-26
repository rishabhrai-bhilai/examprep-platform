// The fixed GATE CS subject list, in the order the UI shows it.
// Every question in questions.json uses one of these names exactly
// (run scripts/normalize-subjects.mjs after adding questions).
export const SUBJECTS = [
  'General Aptitude',
  'Engineering Mathematics',
  'Discrete Mathematics',
  'Digital Logic',
  'Computer Organization & Architecture',
  'Programming & Data Structures',
  'Algorithms',
  'Theory of Computation',
  'Compiler Design',
  'Operating Systems',
  'Databases',
  'Computer Networks',
  // Dropped from the current syllabus; only older papers have these
  'Software Engineering & Web Technologies'
]

// Sort comparator that follows SUBJECTS; unknown names go last, alphabetically
export const compareSubjects = (a, b) => {
  const ia = SUBJECTS.indexOf(a)
  const ib = SUBJECTS.indexOf(b)
  if (ia === -1 && ib === -1) return a.localeCompare(b)
  if (ia === -1) return 1
  if (ib === -1) return -1
  return ia - ib
}

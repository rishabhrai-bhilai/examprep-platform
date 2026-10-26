// Maps every question's `subject` onto the fixed GATE CS subject list in
// src/utils/subjects.js and rewrites both copies of questions.json.
// Safe to re-run: questions that already use a canonical name are left alone.
//
//   node scripts/normalize-subjects.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SUBJECTS } from '../src/utils/subjects.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILES = ['src/data/questions.json', 'server/data/questions.json']

// Spelling variants -> canonical subject (canonical names map to themselves)
const ALIASES = {
  'Programming and Data Structures': 'Programming & Data Structures',
  'Data Structures': 'Programming & Data Structures',
  'Programming in C': 'Programming & Data Structures',
  'Computer Organization and Architecture': 'Computer Organization & Architecture',
  'Computer Organization': 'Computer Organization & Architecture',
  'Databases (DBMS)': 'Databases',
  'Database Management System': 'Databases',
  'Database Management Systems': 'Databases',
  'Operating System': 'Operating Systems',
  'Linear Algebra': 'Engineering Mathematics',
  'Calculus': 'Engineering Mathematics',
  'Probability': 'Engineering Mathematics',
  'Software Engineering': 'Software Engineering & Web Technologies',
  'Web Technologies': 'Software Engineering & Web Technologies'
}

// Questions whose subject can't be decided from the label alone, checked by hand.
// These win over ALIASES.
const OVERRIDES = {
  // Tagged "Algorithms & Data Structures" (2015 set 1)
  2015113: 'Algorithms',                    // design paradigms (Prim, Floyd-Warshall, mergesort)
  2015114: 'Algorithms',                    // quicksort worst-case recurrence
  2015115: 'Programming & Data Structures', // nodes in a binary tree of height 5
  2015117: 'Programming & Data Structures', // BST inorder sequences
  2015135: 'Programming & Data Structures', // BST insert/delete complexity
  2015137: 'Programming & Data Structures', // max-heap array operations
  2015151: 'Algorithms',                    // BFS tree properties
  2015160: 'Programming & Data Structures', // best data structure for the operation mix
  2015163: 'Algorithms',                    // MST edge weights
  2015164: 'Algorithms',                    // loop complexity analysis

  // Tagged "Algorithms / Discrete Mathematics"
  2023156: 'Algorithms',                    // BFS orderings on a powerset graph

  // B+ tree insertion is DBMS indexing in the GATE syllabus
  51: 'Databases',

  // Discrete maths questions that were filed under Engineering Mathematics
  2019131: 'Discrete Mathematics',          // modular arithmetic
  2020162: 'Discrete Mathematics',          // edge colouring
  2021144: 'Discrete Mathematics',          // group theory
  2023115: 'Discrete Mathematics',          // recurrence relations
  2023126: 'Discrete Mathematics',          // predicate logic
  2023148: 'Discrete Mathematics',          // combinatorics
  2023149: 'Discrete Mathematics',          // functions & equivalence relations
  2023151: 'Discrete Mathematics',          // group theory (symmetric difference)
  2023155: 'Discrete Mathematics',          // greedy vertex colouring
  2024263: 'Discrete Mathematics',          // group theory
  2025215: 'Discrete Mathematics',          // predicate logic
  2025242: 'Discrete Mathematics'           // relations / partial orders
}

for (const value of [...Object.values(ALIASES), ...Object.values(OVERRIDES)]) {
  if (!SUBJECTS.includes(value)) throw new Error(`Not a canonical subject: ${value}`)
}

for (const rel of FILES) {
  const file = path.join(root, rel)
  const raw = fs.readFileSync(file, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  const questions = JSON.parse(raw)

  let changed = 0
  const unknown = new Set()
  for (const q of questions) {
    const next = OVERRIDES[q.id] || (SUBJECTS.includes(q.subject) ? q.subject : ALIASES[q.subject])
    if (!next) {
      unknown.add(q.subject)
      continue
    }
    if (next !== q.subject) {
      q.subject = next
      changed++
    }
  }
  if (unknown.size) {
    throw new Error(`${rel}: no mapping for subject(s): ${[...unknown].join(', ')}`)
  }

  fs.writeFileSync(file, JSON.stringify(questions, null, 2).replace(/\n/g, eol))

  const counts = {}
  questions.forEach(q => { counts[q.subject] = (counts[q.subject] || 0) + 1 })
  console.log(`${rel}: ${changed} of ${questions.length} questions updated`)
  SUBJECTS.forEach(s => console.log(`  ${String(counts[s] || 0).padStart(4)}  ${s}`))
}

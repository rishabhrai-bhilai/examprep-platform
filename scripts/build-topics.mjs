// Builds src/data/topics.json, the topic list for every subject, from the
// GATE Overflow topic-exams list saved in data/gateoverflow-topic-exams.txt.
//
// GO's 401 entries include 133 auto-made bundles ("Bellman Ford, Space
// Complexity") and a few site/mock-test tags ("Tbb Mockgate 4", "Iisc").
// Bundles are split into their topics, junk is dropped, and names that GO
// already lists under a better subject are dropped from the bundle's subject.
// GO has no Discrete Mathematics topics, so those are added here.
//
//   node scripts/build-topics.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SUBJECTS } from '../src/utils/subjects.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(root, 'data', 'gateoverflow-topic-exams.txt')
const OUTPUT = path.join(root, 'src', 'data', 'topics.json')

const GO_SUBJECTS = {
  'algorithms': 'Algorithms',
  'co-architecture': 'Computer Organization & Architecture',
  'compiler-design': 'Compiler Design',
  'computer-networks': 'Computer Networks',
  'databases': 'Databases',
  'digital-logic': 'Digital Logic',
  'engineering-mathematics': 'Engineering Mathematics',
  'general-aptitude': 'General Aptitude',
  'operating-system': 'Operating Systems',
  'programming-and-ds': 'Programming & Data Structures',
  'theory-of-computation': 'Theory of Computation'
}

// Site, mock-test and meta tags, and topics outside the GATE CS syllabus
const JUNK = new Set([
  'Admissions', 'Applications In Windows', 'Ask', 'Cds', 'Cicruit', 'Computer Peripherals',
  'Data Warehousing', 'Digital Image Processing', 'Easy1 Mark', 'Electronic Payment Systems',
  'I Gate Test Series', 'Iisc', 'Iit', 'Iit Bombay', 'Language', 'Linux', 'Medium',
  'Multiple Seects', 'Numerica Answers', 'Numerical Answer', 'Out of Gatecse Syllabus',
  'Output', 'Practice', 'Square Invariant', 'Study Resources', 'Syllabus', 'Video Lectures',
  'Windows'
])
const isJunk = (name) => JUNK.has(name) || /^(GO|Tbb) Mockgate \d$/.test(name)

// Typos and casing fixes in GO's tag names
const RENAMES = {
  '3d Structure': '3D Structure',
  'Compiler tokenization': 'Compiler Tokenization',
  'Cpu': 'CPU',
  'Dpda': 'DPDA',
  'GO Back N': 'Go Back N',
  'Ipv6': 'IPv6',
  'Linear Algerba': 'Linear Algebra',
  'Multivalued Dependency 4nf': 'Multivalued Dependency 4NF',
  'Osi Model': 'OSI Model',
  'Postive Logic Gate': 'Positive Logic Gate',
  'Ram': 'RAM',
  'Rsa Security Networks': 'RSA',
  'Sequencenumber': 'Sequence Number',
  'Singular Value Decompositio': 'Singular Value Decomposition',
  'Srtf': 'SRTF',
  'Tsp': 'TSP'
}

// Bundle parts dropped from a subject: GO lists them under a better subject,
// or they repeat a topic the subject already has under another name
const DROP_FROM = {
  'Algorithms': ['Binary Tree', 'Binary Heap', 'Tree Traversal', 'Machine Learning'],
  'Computer Organization & Architecture': [
    'Adder', 'Disk Scheduling', 'Disk', 'Register Allocation', 'Number Representation',
    'IEEE Representation', 'IO Handling', 'Runtime Environment', 'Multilevel Paging',
    'Virtual Memory', 'File Organization'
  ],
  'Compiler Design': ['Context Free Grammar', 'Programming In C'],
  'Computer Networks': ['Probability', 'Bridges Switches'],
  'Databases': ['Priority Queue', 'Bankers Algorithm', 'Relations', 'Query', 'Transactions and Concurrency Control'],
  'Digital Logic': ['Finite Automata', 'Reduction', 'Ripple Counter Operation', 'Minimum Number of Gates'],
  'Engineering Mathematics': ['Cartesian Coordinates', 'Inequality', 'Recurrence Relation', 'Counting'],
  'General Aptitude': ['Grammar', 'Patterns In 2d'],
  'Operating Systems': ['File Organization', 'Processes', 'Process and Threads'],
  'Programming & Data Structures': ['Time Complexity', 'Depth First Search'],
  'Theory of Computation': ['Grammar', 'Minimal State Dfa']
}

// Topics added to a subject that GO's list doesn't have
const EXTRA = {
  // File organization questions are DBMS indexing in the GATE syllabus
  'Databases': ['File Organization'],
  // GO only lists this inside a Compiler Design bundle; C-language questions belong here
  'Programming & Data Structures': ['Programming In C'],
  'Discrete Mathematics': [
    'Propositional Logic', 'First Order Logic', 'Set Theory', 'Relations', 'Functions',
    'Partial Order', 'Lattice', 'Group Theory', 'Graph Theory', 'Graph Connectivity',
    'Graph Coloring', 'Graph Matching', 'Planar Graph', 'Euler and Hamiltonian Graphs',
    'Combinatory', 'Counting', 'Generating Functions', 'Recurrence Relation',
    'Pigeonhole Principle', 'Inclusion Exclusion', 'Modular Arithmetic', 'Number Theory',
    'Countable Uncountable Set'
  ],
  'Software Engineering & Web Technologies': [
    'Software Process Models', 'Software Testing', 'Cyclomatic Complexity', 'Web Technologies'
  ]
}

const topics = Object.fromEntries(SUBJECTS.map(s => [s, new Set()]))
let goSubject = null
for (const line of fs.readFileSync(SOURCE, 'utf8').split(/\r?\n/)) {
  if (line.startsWith('## ')) {
    goSubject = GO_SUBJECTS[line.slice(3).trim()]
    if (!goSubject) throw new Error(`Unknown GO subject: ${line}`)
    continue
  }
  if (line.startsWith('#') || !line.includes(' :: ')) continue
  const entry = line.split(' :: ')[1].trim()
  const isBundle = entry.includes(',') || entry.endsWith('& more')
  const names = isBundle ? entry.replace(/ & more$/, '').split(', ') : [entry]
  for (let name of names.map(n => n.trim())) {
    if (isJunk(name)) continue
    name = RENAMES[name] || name
    if (isBundle && DROP_FROM[goSubject]?.includes(name)) continue
    topics[goSubject].add(name)
  }
}
for (const [subject, names] of Object.entries(EXTRA)) {
  names.forEach(n => topics[subject].add(n))
}

const out = SUBJECTS.map(subject => ({
  subject,
  topics: [...topics[subject]].sort((a, b) => a.localeCompare(b))
}))
fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2) + '\n')

const total = out.reduce((n, s) => n + s.topics.length, 0)
console.log(`Wrote ${path.relative(root, OUTPUT)}: ${total} topics`)
out.forEach(s => console.log(`  ${String(s.topics.length).padStart(3)}  ${s.subject}`))

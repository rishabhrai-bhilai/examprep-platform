// Hand-written guidance for each subject sheet. Everything numeric comes from
// the question bank (build.mjs); these are short study notes in our own words.

export const SUBJECT_NOTES = {
  'Engineering Mathematics': {
    short: 'Engg. Maths',
    tldr: [
      'Probability is the steadiest earner: conditional probability, Bayes, expectation and variance, and the standard distributions.',
      'Linear algebra rewards properties over arithmetic: trace = sum of eigenvalues, determinant = product, rank and the number of solutions.',
      'Calculus is usually one question: a limit, continuity, a definite integral or a maximum/minimum.',
      'Most questions here are numerical answers, so there is no option to check against. Recompute once before moving on.'
    ],
    watch: [
      ['Claims about matrices', 'Before accepting a statement about eigenvalues or rank, test it on a 2x2 example.'],
      ['"At least one" probability', 'Usually quicker as 1 minus the probability of none.'],
      ['Independence vs exclusiveness', 'Independent events can overlap; mutually exclusive ones cannot both happen.']
    ],
    order: 'Probability -> Linear algebra -> Calculus'
  },
  'Discrete Mathematics': {
    short: 'Discrete Maths',
    tldr: [
      'Counting is the core: permutations, combinations, pigeonhole, inclusion-exclusion and recurrences.',
      'Graph theory appears almost every year: degree sums, connectivity, colouring, matchings and Euler\'s formula for planar graphs.',
      'Logic questions test translation: turn English into quantifiers carefully, then check validity.',
      'Relations and groups: equivalence relations, partial orders and lattices, and Lagrange\'s theorem for subgroup and element orders.'
    ],
    watch: [
      ['Order of quantifiers', '"For all x there is a y" is not the same as "there is a y for all x".'],
      ['Labelled vs unlabelled', 'Check whether the question counts distinct objects or distinct shapes.'],
      ['Implications', 'An option may only hold one way. Check both directions before calling it "if and only if".']
    ],
    order: 'Combinatorics -> Graph theory -> Logic -> Set theory & algebra'
  },
  'Computer Organization & Architecture': {
    short: 'COA',
    tldr: [
      'Cache memory is the single most-asked topic: tag/index/offset bits, mapping, hit ratio and average access time.',
      'Pipelining is close behind: speed-up, stalls from hazards and the cycles a branch costs.',
      'Memory hierarchy, I/O, DMA and interrupts fill the rest, usually as two-mark numericals.',
      'Write each formula with its units before plugging in numbers. Most lost marks are unit slips: ns vs cycles, bits vs bytes.'
    ],
    watch: [
      ['Hierarchical vs simultaneous access', 'The access-time formula changes depending on whether levels are checked one after another or in parallel.'],
      ['Word vs byte addressing', 'This changes the offset bits and every count that follows.'],
      ['Pipeline fill time', 'n instructions on k stages take k + n - 1 cycles, not n x k.']
    ],
    order: 'Cache memory -> Pipelining -> Memory & I/O -> CPU organisation'
  },
  'Programming & Data Structures': {
    short: 'Prog. & DS',
    tldr: [
      'C code tracing is the largest single topic: pointers, recursion, static variables, parameter passing and printf output.',
      'Trees are next: binary search tree properties, traversals, AVL heights and heaps.',
      'Stacks, queues, linked lists, arrays and hashing appear as short "what is the state after these operations" questions.',
      'Keep a written table of every variable as you trace. Tracing in your head is where marks go.'
    ],
    watch: [
      ['Static and global variables', 'They keep their value across calls. Recursion questions lean on this.'],
      ['Pre vs post increment', 'Inside expressions and array indices, the order of evaluation decides the answer.'],
      ['Heap index arithmetic', 'Check whether the array is 0- or 1-indexed before using the child formula.']
    ],
    order: 'C programming -> Trees & heaps -> Linear structures -> Hashing'
  },
  Algorithms: {
    short: 'Algorithms',
    tldr: [
      'Asymptotic analysis and recurrences come up every year. Know the Master theorem cold.',
      'Graph algorithms: BFS/DFS properties, shortest paths (Dijkstra, Bellman-Ford) and minimum spanning trees (Kruskal, Prim).',
      'Sorting and searching: best and worst cases, number of comparisons, stability.',
      'Greedy and dynamic programming: write the recurrence, then fill a small table by hand.'
    ],
    watch: [
      ['Negative edges', 'Dijkstra can fail with negative weights; Bellman-Ford handles them.'],
      ['Unique MSTs', 'Distinct edge weights guarantee a unique MST. Equal weights may not.'],
      ['Loop counting', 'Nested loops with changing bounds rarely give n^2. Sum the iterations exactly.']
    ],
    order: 'Complexity & recurrences -> Graph algorithms -> Sorting -> Greedy & DP'
  },
  'Computer Networks': {
    short: 'Networks',
    tldr: [
      'IP addressing and subnetting (CIDR, masks, host counts) appear in nearly every paper.',
      'TCP is the other near-certainty: the handshake, sequence numbers and how the congestion window grows.',
      'Data link layer: sliding-window efficiency, CRC, and Ethernet frame-size limits.',
      'Routing: distance vector against link state, and the count-to-infinity problem.'
    ],
    watch: [
      ['Usable hosts', 'Subtract 2 for the network and broadcast addresses unless the question says otherwise.'],
      ['Window sizes', 'Go-Back-N and Selective Repeat allow different maximum windows for the same sequence bits.'],
      ['Units', 'Bandwidth is in bits per second and file sizes are usually in bytes. Convert once, at the start.']
    ],
    order: 'IP addressing -> TCP & UDP -> Data link layer -> Routing'
  },
  Databases: {
    short: 'DBMS',
    tldr: [
      'Functional dependencies and normalization: attribute closures, candidate keys and the highest normal form.',
      'SQL and relational algebra: run the query by hand on the small table given.',
      'Transactions: conflict serializability with a precedence graph, recoverable schedules and two-phase locking.',
      'Indexing: B and B+ tree order, fan-out and the number of levels.'
    ],
    watch: [
      ['NULLs and duplicates', 'SQL keeps duplicates and treats NULL specially in comparisons and aggregates.'],
      ['Candidate keys', 'Attributes that never appear on a right-hand side must be in every key. Start from them.'],
      ['View vs conflict serializable', 'A schedule can be view serializable without being conflict serializable.']
    ],
    order: 'Normalization -> SQL & algebra -> Transactions -> Indexing'
  },
  'Operating Systems': {
    short: 'OS',
    tldr: [
      'CPU scheduling: draw the Gantt chart every time, then read off waiting and turnaround times.',
      'Synchronization: semaphores and critical sections. Test each claim with a concrete interleaving.',
      'Memory management: paging, TLB effective access time, and page replacement (FIFO, LRU, optimal).',
      'Deadlock: the four conditions and the Banker\'s safety check.'
    ],
    watch: [
      ['Belady\'s anomaly', 'More frames can mean more faults under FIFO, never under LRU or optimal.'],
      ['Threads vs processes', 'Threads of one process share globals and the heap, not stacks or registers.'],
      ['Arrival times', 'In preemptive scheduling, recheck the ready queue at every arrival.']
    ],
    order: 'Scheduling -> Memory management -> Synchronization -> Deadlock -> File systems'
  },
  'Theory of Computation': {
    short: 'ToC',
    tldr: [
      'Regular languages dominate: DFA construction and minimisation, regular expressions and closure properties.',
      'Classifying a language as regular, context-free or neither is a recurring question. Ask what has to be counted.',
      'Context-free languages: grammars, PDAs and which operations keep a language context-free.',
      'Decidability: know the standard decidable and undecidable problems, and Rice\'s theorem.'
    ],
    watch: [
      ['Closure under intersection', 'CFLs are not closed under intersection, but CFL intersected with a regular language is a CFL.'],
      ['Finite languages', 'Every finite language is regular, however strange it looks.'],
      ['Minimal DFA states', 'Count the dead state if the question wants a complete DFA.']
    ],
    order: 'Regular languages -> Context-free languages -> Turing machines & decidability'
  },
  'Compiler Design': {
    short: 'Compiler',
    tldr: [
      'Parsing is asked every year: FIRST and FOLLOW sets, LL(1) tables, and LR(0), SLR, LALR and CLR conflicts.',
      'Syntax-directed translation: evaluate attributes on a parse tree; know S- vs L-attributed.',
      'Code optimisation: basic blocks, DAGs, live variables and the minimum number of registers.',
      'Lexical analysis: count tokens and know which errors each phase catches.'
    ],
    watch: [
      ['Parser power', 'LR(0) is weaker than SLR, then LALR, then CLR. Every LL(1) grammar is also LR(1).'],
      ['Epsilon productions', 'They pull FOLLOW sets into FIRST calculations and change LL(1) tables.'],
      ['Error phases', 'An unterminated string is a lexical error; a type mismatch is semantic.']
    ],
    order: 'Parsing -> Syntax-directed translation -> Optimisation -> Lexical analysis'
  },
  'Digital Logic': {
    short: 'Digital Logic',
    tldr: [
      'Boolean algebra and K-maps: minimal sum of products, prime and essential prime implicants.',
      'Number systems: two\'s complement ranges and overflow, base conversion and IEEE 754 floating point.',
      'Combinational circuits: multiplexers implementing functions, adders and decoders.',
      'Sequential circuits: flip-flop behaviour, counters and state tables.'
    ],
    watch: [
      ['Overflow', 'Adding two numbers of the same sign can overflow; adding opposite signs never does.'],
      ['IEEE 754 bias', 'Single precision uses bias 127. Denormals have no implicit leading 1.'],
      ['Don\'t-cares', 'Use them to grow groups, but never form a group of don\'t-cares alone.']
    ],
    order: 'Boolean algebra & K-maps -> Number systems -> Combinational -> Sequential'
  },
  'General Aptitude': {
    short: 'Aptitude',
    tldr: [
      '15 marks in every paper since 2010: 5 one-mark and 5 two-mark questions.',
      'Verbal ability: grammar, word meaning and short passages.',
      'Quantitative aptitude: percentages, ratios, averages, counting and probability.',
      'Reasoning, data interpretation and spatial puzzles (paper folding, rotation, patterns), which have been in every paper since 2021.'
    ],
    watch: [
      ['Time', 'Aim for under 25 minutes on this section. It is the easiest 15 marks on the paper.'],
      ['Passage questions', 'Choose what the passage supports, not what is true in general.'],
      ['Spatial questions', 'Sketch the figure. Mental rotation is where most errors happen.']
    ],
    order: 'Quantitative -> Verbal -> Reasoning & data interpretation -> Spatial'
  }
}

export const CHECKLIST = [
  'Read every option of a "which is NOT / FALSE" question before marking one.',
  'MSQ and NAT have no negative marking: never leave them blank.',
  'MCQs cost a third of their marks when wrong. Guess only after removing at least one option.',
  'For any C code, write a table of variable values and trace line by line.',
  'For a claim about matrices, graphs or sets, try it on the smallest example you can build.',
  'Draw the Gantt chart, the pipeline diagram or the timeline. Don\'t compute those in your head.',
  'Write units next to every number in a numerical question.',
  'An "if and only if" option must hold in both directions. Check the reverse.',
  'A question that mixes two subjects (say, networks and OS) needs extra time. Budget for it.',
  'Finish General Aptitude in about 25 minutes, then do the one-mark technical block.',
  'Mark long two-mark questions and come back after the quick ones.',
  'Leave 10 minutes at the end to recheck NAT answers and rounding.'
]

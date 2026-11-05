// Chapters per subject for the sectional (subject-wise) mocks, following a standard
// GATE CS book's contents. `pages` is the chapter's length in the book and sets how
// many questions it gets. `topics` are the question bank's topic tags that belong to
// the chapter: "Topic" for the same subject, "Subject: Topic" to borrow from another.
// General Aptitude is not in the book, so its chapters follow GATE's GA sections.

export const SYLLABUS_CHAPTERS = {
  'General Aptitude': [
    { name: 'Verbal Ability', pages: 40, topics: ['English Grammar', 'Most Appropriate Word', 'Word Meaning', 'Synonyms', 'Antonyms', 'Phrase Meaning', 'Prepositions', 'Tenses', 'Most Appropriate Alternative', 'Grammatical Error', 'Phrasal Verb', 'Sentence Ordering', 'Comparative Forms', 'Pronouns', 'Incorrect Sentence Part', 'Word Pairs', 'Verbal Analogy', 'Analogy', 'Odd One'] },
    { name: 'Reading & Logical Reasoning', pages: 30, topics: ['Passage Reading', 'Logical Reasoning', 'Logical Inference', 'Verbal Reasoning', 'Syllogism', 'Statements Follow', 'Statement Sufficiency', 'Narrative Sequencing', 'Coding Decoding', 'Direction Sense', 'Seating Arrangement', 'Round Table Arrangement', 'Family Relationship', 'Number Series', 'Sequence Series', 'Grouping'] },
    { name: 'Quantitative Aptitude', pages: 50, topics: ['Percentage', 'Probability', 'Ratio Proportion', 'Functions', 'Algebra', 'Profit Loss', 'Quadratic Equations', 'Absolute Value', 'Average', 'Area', 'Logarithms', 'Permutation and Combination', 'Mensuration', 'Set Theory', 'Powers', 'Number System', 'Maxima Minima', 'Arithmetic Series', 'Counting', 'Inequality', 'Conditional Probability', 'Geometry', 'Triangles', 'Volume', 'Polynomials', 'Trigonometry', 'Circle', 'Coordinate Geometry', 'Speed Time Distance', 'Numerical Computation', 'Work Time', 'Numerical Aptitude', 'Number Relations', 'Prime Numbers', 'Median', 'Cost Market Price', 'Lines', 'LCM HCF', 'Fractions', 'Factors', 'System of Equations', 'Combinatory', 'Clock Time', 'Bayes Theorem', 'Statistics', 'Alligation Mixture', 'Age Relation', 'Venn Diagram', 'Curves', 'Convex Sets Functions', 'Squares', 'Three Dimensional Geometry'] },
    { name: 'Data Interpretation & Spatial Reasoning', pages: 20, topics: ['Tabular Data', 'Pie Chart', 'Data Interpretation', 'Bar Graph', 'Line Graph', 'Contour Plots', 'Spatial Ability', 'Patterns In Two Dimensions', 'Paper Folding', 'Cube', 'Assembling Pieces', 'Maps', 'Image Rotation', '3D Structure', 'Transformation of Shapes', 'Mirror Image', 'Counting Figure'] }
  ],
  'Discrete Mathematics': [
    { name: 'Mathematical Logic', pages: 17, topics: ['Propositional Logic', 'First Order Logic'] },
    { name: 'Combinatorics', pages: 12, topics: ['Counting', 'Combinatory', 'Recurrence Relation', 'Generating Functions', 'Inclusion Exclusion', 'Pigeonhole Principle'] },
    { name: 'Graph Theory', pages: 19, topics: ['Graph Theory', 'Graph Coloring', 'Planar Graph', 'Graph Connectivity', 'Euler and Hamiltonian Graphs', 'Graph Matching'] },
    { name: 'Set Theory & Algebra', pages: 25, topics: ['Group Theory', 'Relations', 'Functions', 'Set Theory', 'Number Theory', 'Partial Order', 'Lattice', 'Modular Arithmetic', 'Countable Uncountable Set'] }
  ],
  'Engineering Mathematics': [
    { name: 'Linear Algebra', pages: 81, topics: ['Eigen Value', 'Determinant', 'Matrix', 'System of Equations', 'Rank of Matrix', 'Eigen Vector', 'Number of Solutions', 'Vector Space', 'Orthonormality', 'Multiplicity', 'Linear Algebra', 'Subspace', 'Basis'] },
    { name: 'Probability & Statistics', pages: 53, topics: ['Probability', 'Conditional Probability', 'Expectation', 'Random Variable', 'Independent Events', 'Variance', 'Normal Distribution', 'Bayes Theorem', 'Uniform Distribution', 'Poisson Distribution', 'Probability Density Function', 'Binomial Distribution', 'Exponential Distribution', 'Covariance', 'Cumulative Distribution Function', 'Statistics'] },
    { name: 'Calculus', pages: 54, topics: ['Definite Integral', 'Limits', 'Integration', 'Continuity', 'Maxima Minima', 'Differentiation', 'Continuity and Differentiability', 'Mean Value Theorem', 'Numerical Methods', 'Polynomials', 'Complex Number', 'Functions', 'Differential Equation'] }
  ],
  'Theory of Computation': [
    { name: 'RL, FA, RE & RG', pages: 26, topics: ['Regular Language', 'Finite Automata', 'Regular Expression', 'Minimal State Automata', 'Non Determinism', 'Number of States', 'Pumping Lemma', 'Regular Grammar'] },
    { name: 'CFL & PDA', pages: 18, topics: ['Context Free Grammar', 'Context Free Language', 'Pushdown Automata', 'DPDA', 'Regular and Context Free Languages', 'Closure Property'] },
    { name: 'CSL, RS, RES, LBA & TM', pages: 9, topics: ['Recursive and Recursively Enumerable Languages', 'Turing Machine', 'Countable Uncountable Set', 'Identify Class Language'] },
    { name: 'Undecidability', pages: 8, topics: ['Decidability', 'Reduction', 'P NP NPC NPH'] }
  ],
  'Compiler Design': [
    { name: 'Lexical Analysis', pages: 4, topics: ['Lexical Analysis', 'Compiler Tokenization', 'Compilation Phases', 'Symbol Table'] },
    { name: 'Parsing Techniques', pages: 18, topics: ['Parsing', 'LR Parser', 'Grammar', 'First and Follow', 'Operator Precedence', 'Left Recursion', 'Viable Prefixes'] },
    { name: 'Syntax Directed Translation', pages: 10, topics: ['Syntax Directed Translation', 'Intermediate Code', 'Three Address Code', 'Expression Evaluation', 'Backpatching', 'Static Single Assignment'] },
    { name: 'Code Optimization & Runtime Environment', pages: 5, topics: ['Runtime Environment', 'Basic Blocks', 'Register Allocation', 'Code Optimization', 'Variable Scope', 'Liveness Analysis', 'Parameter Passing', 'Activation Record', 'Target Code Generation', 'Live Variable Analysis', 'Constant Folding'] }
  ],
  Databases: [
    { name: 'ER Diagrams', pages: 6, topics: ['ER Diagram', 'Relational Model', 'Database Schema', 'Referential Integrity'] },
    { name: 'Functional Dependencies & Normalization', pages: 13, topics: ['Functional Dependency', 'Normal Forms', 'Candidate Key', 'Armstrong Axioms', 'Super Key', 'Database Normalization', 'Dependency Preserving', 'Lossless Decomposition', 'Lossless Join'] },
    { name: 'SQL', pages: 18, topics: ['SQL', 'Nested Query With Correlation', 'Joins'] },
    { name: 'Relational Algebra & Relational Calculus', pages: 12, topics: ['Relational Algebra', 'Tuple Relational Calculus', 'Natural Join', 'Relational Calculus'] },
    { name: 'Transactions & Concurrency Control', pages: 12, topics: ['Transaction and Concurrency', 'Conflict Serializable', 'View Serializable', 'Wait Die'] },
    { name: 'File Structures & Indexing', pages: 6, topics: ['Indexing', 'B Tree', 'File Organization'] }
  ],
  'Computer Networks': [
    { name: 'Concept of Layering', pages: 3, topics: ['Network Layering', 'OSI Model', 'Network Layer', 'Data Communication', 'Network Protocols', 'Packet Switching'] },
    { name: 'Error Control', pages: 3, topics: ['CRC Polynomial', 'Error Detection', 'Error Correction', 'Bit Stuffing', 'Manchester Encoding'] },
    { name: 'Flow Control', pages: 10, topics: ['Sliding Window', 'Stop and Wait', 'Go Back N', 'Propagation Delay', 'Transmission Delay', 'Channel Utilization', 'Wrap Around Time'] },
    { name: 'Ethernet', pages: 6, topics: ['Ethernet', 'CSMA CD', 'MAC Protocol', 'Slotted Aloha', 'Token Ring', 'LAN Technologies', 'Backoff Ethernet Collision', 'Wifi', 'Switches'] },
    { name: 'IP Header', pages: 5, topics: ['IP Packet', 'Fragmentation', 'IPv6'] },
    { name: 'IP Addresses', pages: 8, topics: ['Subnetting', 'IP Addressing', 'Network Addressing'] },
    { name: 'Routers & Routing Algorithms', pages: 7, topics: ['Routing', 'Distance Vector Routing', 'Link State Routing', 'Token Bucket'] },
    { name: 'TCP, UDP', pages: 9, topics: ['TCP', 'Sequence Number', 'Congestion Control', 'UDP', 'Socket Programming'] },
    { name: 'Application Layer', pages: 4, topics: ['Application Layer Protocols'] },
    { name: 'Network Security', pages: 6, topics: ['Cryptography', 'RSA', 'Firewall'] }
  ],
  // The book's Data Structures and Programming Languages, which GATE treats as one subject
  'Programming & Data Structures': [
    { name: 'Arrays', pages: 3, topics: ['Array'] },
    { name: 'Stacks & Queues', pages: 14, topics: ['Stack', 'Queue', 'Infix Prefix', 'Priority Queue', 'Circular Queue'] },
    { name: 'Linked Lists', pages: 7, topics: ['Linked List'] },
    { name: 'Trees', pages: 29, topics: ['Binary Search Tree', 'Binary Heap', 'Binary Tree', 'Tree Traversal', 'Tree', 'AVL Tree'] },
    { name: 'Graphs', pages: 4, topics: ['Algorithms: Graph Search', 'Algorithms: Depth First Search'] },
    { name: 'Hashing', pages: 8, topics: ['Hashing', 'Algorithms: Linear Probing', 'Algorithms: Open Addressing', 'Algorithms: Hashing'] },
    { name: 'Programming Languages', pages: 45, topics: ['Programming In C', 'Recursion', 'Pseudocode', 'Data Structures'] }
  ],
  'Operating Systems': [
    { name: 'Process Management I (processes, threads, scheduling)', pages: 20, topics: ['Process Scheduling', 'SRTF', 'Process', 'Threads', 'Fork System Call', 'Context Switch', 'System Calls', 'Interrupts', 'OS Protection'] },
    { name: 'Process Management II (synchronization)', pages: 21, topics: ['Process Synchronization', 'Semaphore', 'Critical Section', 'Binary Semaphore', 'Mutual Exclusion', 'Mutex'] },
    { name: 'Deadlocks', pages: 8, topics: ['Deadlock Prevention Avoidance Detection', 'Resource Allocation', 'Bankers Algorithm', 'Resource Allocation Graph'] },
    { name: 'Memory Management', pages: 20, topics: ['Virtual Memory', 'Page Replacement', 'Page Faults', 'Memory Management', 'Multilevel Paging', 'Effective Memory Access'] },
    { name: 'File Systems & Device Management', pages: 12, topics: ['Disk', 'File System', 'Disk Scheduling', 'Linked Allocation', 'Inode', 'IO Handling'] }
  ],
  'Digital Logic': [
    { name: 'Number Systems', pages: 6, topics: ['Number Representation', 'IEEE Representation', 'Floating Point Representation', 'Number System', 'Fixed Point Representation', 'Booths Algorithm'] },
    { name: 'Boolean Algebra', pages: 13, topics: ['Boolean Algebra', 'Canonical Normal Form', 'Functional Completeness', 'Nand Gates', 'Min No Gates', 'Simplification'] },
    { name: 'K-Maps', pages: 8, topics: ['K Map', 'Min Sum of Products Form', 'Prime Implicants', 'Min Products of Sum Form', 'Static Hazard', 'Hazards'] },
    { name: 'Combinational Circuits', pages: 8, topics: ['Multiplexer', 'Decoder', 'Circuit Output', 'Combinational Circuit', 'Ripple Carry Adder', 'Carry Look Ahead Adder', 'Adder', 'Carry Generator', 'ROM', 'Memory Interfacing'] },
    { name: 'Sequential Circuits', pages: 12, topics: ['Sequential Circuit', 'Flip Flop', 'Digital Counter', 'Finite State Machines', 'Shift Registers', 'Ripple Counter', 'Clock Frequency'] }
  ],
  Algorithms: [
    { name: 'Algorithm Analysis & Asymptotic Notations', pages: 16, topics: ['Time Complexity', 'Asymptotic Notations', 'Recurrence Relation', 'Identify Function', 'Aggregate Analysis', 'Recursion'] },
    { name: 'Divide & Conquer', pages: 11, topics: ['Binary Search', 'Quick Sort', 'Merge Sort', 'Merging', 'Bitonic Array', 'Searching'] },
    { name: 'Greedy Method', pages: 19, topics: ['Minimum Spanning Tree', 'Shortest Path', 'Greedy Algorithms', 'Huffman Code', 'Dijkstras Algorithm'] },
    { name: 'Dynamic Programming', pages: 7, topics: ['Dynamic Programming', 'Matrix Chain Ordering', 'Longest Common Subsequence', 'Bellman Ford'] },
    { name: 'Optimal Binary Search Trees', pages: 5, topics: [] },
    { name: 'Miscellaneous Topics', pages: 15, topics: ['Graph Search', 'Depth First Search', 'Sorting', 'P NP NPC NPH', 'Algorithm Design Techniques', 'Topological Sort', 'Comparison Based Algorithm', 'Number of Swap', 'Insertion Sort', 'Graph Algorithms', 'Graph Isomorphism', 'Strongly Connected Components', 'Algorithm Design', 'Hashing', 'Linear Probing', 'Open Addressing'] }
  ],
  'Computer Organization & Architecture': [
    { name: 'Computer Arithmetic', pages: 8, topics: ['Digital Logic: Booths Algorithm', 'Digital Logic: Floating Point Representation', 'Digital Logic: IEEE Representation', 'Digital Logic: Carry Look Ahead Adder', 'Digital Logic: Ripple Carry Adder'] },
    { name: 'Memory Organization', pages: 21, topics: ['Cache Memory', 'Cache Misses', 'Multilevel Cache', 'Average Memory Access Time', 'Memory Interfacing', 'Main Memory', 'Hit Ratio', 'Dynamic Memory'] },
    { name: 'Secondary Memories', pages: 3, topics: ['Operating Systems: Disk'] },
    { name: 'CPU Organization', pages: 14, topics: ['Instruction Format', 'Addressing Modes', 'Machine Instruction', 'Program Counter', 'Instruction Set Architecture', 'Data Path', 'Instruction Execution', 'CISC RISC Architecture', 'Register', 'Assembly', 'Branch Conditional Instructions', 'Clock Frequency', 'Clock Cycles'] },
    { name: 'Pipeline Organization', pages: 12, topics: ['Pipelining', 'Speedup', 'Data Hazards', 'Data Dependency'] },
    { name: 'Control Unit Design', pages: 4, topics: [] },
    { name: 'IO Organization', pages: 6, topics: ['Interrupts', 'DMA'] }
  ]
}

// Questions per chapter for a paper of `total` questions: every chapter gets one,
// the rest are shared by page count (largest remainders win). Chapters left out
// (e.g. no questions available) hand their share to the others.
export function chapterQuotas(chapters, total) {
  const n = chapters.length
  if (total < n) throw new Error(`${total} questions cannot cover ${n} chapters`)
  const pages = chapters.reduce((s, c) => s + c.pages, 0)
  const extra = total - n
  const raw = chapters.map(c => (extra * c.pages) / pages)
  const quotas = raw.map(r => 1 + Math.floor(r))
  let left = total - quotas.reduce((s, q) => s + q, 0)
  const order = raw.map((r, i) => [r - Math.floor(r), chapters[i].pages, i]).sort((a, b) => b[0] - a[0] || b[1] - a[1])
  for (let k = 0; left > 0; k++, left--) quotas[order[k % n][2]]++
  return quotas
}

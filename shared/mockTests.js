// The mock test catalogue. Shared so the server can score attempts itself.
// questions: question ids from the PYQ bank, in order.
export const mockTests = [
  {
    id: "test-1",
    title: "GATE Computer Science - Mini Mock Test",
    subject: "Computer Science",
    durationMinutes: 15,
    totalQuestions: 5,
    difficulty: "Medium",
    questions: [41, 42, 43, 44, 45] // GATE 2025 Set 1, CS one-mark MCQs
  },
  {
    id: "test-2",
    title: "Engineering Mathematics & Algorithms",
    subject: "Mathematics",
    durationMinutes: 10,
    totalQuestions: 3,
    difficulty: "Easy",
    questions: [2024011, 2024012, 2024017] // GATE 2024 Set 1
  },
  {
    id: "test-3",
    title: "Comprehensive Practice Test",
    subject: "General Aptitude",
    durationMinutes: 20,
    totalQuestions: 6,
    difficulty: "Hard",
    questions: [2026101, 2026103, 2026104, 2026105, 2026106, 2026109] // GATE 2026 Set 1 GA
  }
];

export const findMockTest = (id) => mockTests.find((t) => t.id === id) || null

export const dummyQuestions = [];

export const dummyMockTests = [
  {
    id: "test-1",
    title: "GATE Computer Science - Mini Mock Test",
    subject: "Computer Science",
    durationMinutes: 15,
    totalQuestions: 5,
    difficulty: "Medium",
    questions: [1, 2, 3, 4, 7]
  },
  {
    id: "test-2",
    title: "Engineering Mathematics & Algorithms",
    subject: "Mathematics",
    durationMinutes: 10,
    totalQuestions: 3,
    difficulty: "Easy",
    questions: [1, 20, 24]
  },
  {
    id: "test-3",
    title: "Comprehensive Practice Test",
    subject: "General Aptitude",
    durationMinutes: 20,
    totalQuestions: 6,
    difficulty: "Hard",
    questions: [4, 7, 8, 10, 11, 13]
  }
];

export const dummyDiscussions = {
  1: [
    {
      id: 101,
      author: "Amit Sharma",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=amit",
      content: "This is a classical recurrence relation! The substitution method $n = 2^k$ is the most robust way to solve it without making mistakes.",
      likes: 42,
      replies: [
        {
          id: 102,
          author: "Sneha Patel",
          avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=sneha",
          content: "Exactly, dividing by $n$ first simplifies it to $S(n) = S(\\sqrt{n}) + 1$, which is much easier to see.",
          likes: 15
        }
      ]
    }
  ],
  2: [
    {
      id: 201,
      author: "Rohan Das",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=rohan",
      content: "For max-heap, remember to draw the tree! It makes checking parent-child relationships extremely easy.",
      likes: 28,
      replies: []
    }
  ],
  5: [
    {
      id: 501,
      author: "Priyanka Sen",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=priyanka",
      content: "I kept getting 10 page faults instead of 9 because I forgot that 6 is a Hit since it is already in memory when accessed the second time. Read carefully!",
      likes: 54,
      replies: []
    }
  ]
};

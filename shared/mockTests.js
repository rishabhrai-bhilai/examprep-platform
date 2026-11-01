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
  },
  // Papers built from the PYQ bank (fixed seed, no question shared between them)
  {"id":"full-1","title":"GATE CS Full-Length Mock 1","subject":"Full syllabus","durationMinutes":180,"totalQuestions":65,"difficulty":"Hard","questions":[2021104,2021101,2025202,2011158,2016102,2021209,2012162,2020108,2013161,2026209,2012121,2017120,2021130,2015256,2010127,2014312,2024234,79,2014163,2018153,2017122,2014218,2015255,2022141,2015362,2015334,20170135,2008133,2021237,2016125,2014222,20170123,2008146,2015137,2015350,2016123,2019130,2015163,2015247,2017148,2021111,2017135,80,20170148,74,2021115,2015315,2010137,20170153,2013110,2022119,2010145,2015154,2026154,2016131,20170126,2011112,20170156,2025246,2021137,2016234,2010115,2022155,2021155,2012144]},
  {"id":"full-2","title":"GATE CS Full-Length Mock 2","subject":"Full syllabus","durationMinutes":180,"totalQuestions":65,"difficulty":"Hard","questions":[2010156,2026202,2010157,2013160,2017102,2015307,2017110,2011162,2026108,2016207,2016214,2025214,2025212,2017162,2014258,2007104,2019131,2023155,2014263,2026155,2022118,2018114,2016219,2015143,2017152,2011150,2026114,2022124,2008177,2019155,2017112,2022121,2016147,2008161,2020158,2021119,2024215,2007176,2015338,2021150,2026126,2023114,2012125,2009141,2023140,2015246,2021114,2024221,2013140,2024137,2018148,2023123,2015130,2009152,2008165,2016259,51,2015329,2019161,2008182,2021142,2018124,2013113,2010155,2016264]},
  {"id":"full-3","title":"GATE CS Full-Length Mock 3","subject":"Full syllabus","durationMinutes":180,"totalQuestions":65,"difficulty":"Hard","questions":[2016203,2026201,2016205,2026101,2015101,2019107,2018106,2022109,2010165,20170108,2016212,2014212,2024244,2008125,2010126,2017131,2021225,2026236,2022150,2023121,2012107,2015340,2007132,2026259,57,2020113,2011128,2013128,2024056,2022128,2015221,2025213,2015162,2008162,2011125,2025229,20170115,2020150,2023154,2008110,2014326,2013133,2026152,2020136,2014127,2026217,2026235,2016146,2016156,2015244,2018134,2010123,2024062,2015152,2025247,2014232,2024220,2007163,2007160,2014239,20170125,46,20170142,2026258,2023150]},
  {"id":"sectional-general-aptitude","title":"General Aptitude Sectional Mock","subject":"General Aptitude","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2024004,2026204,2013158,2015201,2024001,2022103,2012157,2021106,2016109,2013162,2023107,2020109,2010163,2017107,2012165]},
  {"id":"sectional-engineering-mathematics","title":"Engineering Mathematics Sectional Mock","subject":"Engineering Mathematics","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2021234,2014115,2024014,2026214,2012109,2021235,2015215,2025244,2025265,2015336,2015251,2014356,2015259,2017136,2018154]},
  {"id":"sectional-discrete-mathematics","title":"Discrete Mathematics Sectional Mock","subject":"Discrete Mathematics","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[60,2010104,2021126,2008102,2018128,2014313,2009103,2016136,2015263,2015145,2016239,2010130,2024052,2014359,2024051]},
  {"id":"sectional-digital-logic","title":"Digital Logic Sectional Mock","subject":"Digital Logic","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2008108,2010106,54,2026216,2013104,2024013,2021215,20170143,2021152,2017138,2007133,2021238,2010132,2025250,2011151]},
  {"id":"sectional-computer-organization-and-architecture","title":"Computer Organization & Architecture Sectional Mock","subject":"Computer Organization & Architecture","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2014219,2010107,2021229,2026116,2013120,2024015,2014119,2010148,2012155,2010149,2026244,2008173,20170159,2021165,20170161]},
  {"id":"sectional-programming-and-data-structures","title":"Programming & Data Structures Sectional Mock","subject":"Programming & Data Structures","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2015321,20170118,2024213,2022116,2017123,2019134,2025219,2026161,2017146,2010135,2022144,2014351,2009159,2024043,2010152]},
  {"id":"sectional-algorithms","title":"Algorithms Sectional Mock","subject":"Algorithms","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2014223,2014124,2021112,2025220,2014121,2007105,2009113,2014262,2024060,2007149,2008145,2016248,2013131,2015337,2021256]},
  {"id":"sectional-theory-of-computation","title":"Theory of Computation Sectional Mock","subject":"Theory of Computation","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2022112,2016227,58,2009112,2014325,2021222,2016126,2014246,2008149,2014245,2013132,75,20170147,2013141,2008153]},
  {"id":"sectional-compiler-design","title":"Compiler Design Sectional Mock","subject":"Compiler Design","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2011119,2024229,2017116,2023111,2009117,20170122,2007118,2012152,2021136,2021261,2007154,2026142,2022165,2015365,2009142]},
  {"id":"sectional-operating-systems","title":"Operating Systems Sectional Mock","subject":"Operating Systems","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2015314,2009110,2024024,2024224,2014130,2021125,2024025,2026253,2024246,2016159,2020144,2008167,2009130,2021258,2016258]},
  {"id":"sectional-databases","title":"Databases Sectional Mock","subject":"Databases","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2017129,2012114,2021216,2014131,45,20170133,2008116,2009144,2012150,2012127,2022156,2023161,2009145,2014340,2011139]},
  {"id":"sectional-computer-networks","title":"Computer Networks Sectional Mock","subject":"Computer Networks","durationMinutes":45,"totalQuestions":15,"difficulty":"Medium","questions":[2007120,2012110,2008117,2015127,2022122,2014134,2007119,2021139,2009146,2014236,2008159,2011152,2026145,2008158,2009147]}
];

export const findMockTest = (id) => mockTests.find((t) => t.id === id) || null

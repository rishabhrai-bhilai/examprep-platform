import React, { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Trophy, ArrowUp, ArrowDown,
  BarChart2, TrendingUp, Target, Clock, Award, Globe, Users, Zap, 
  CheckCircle2, XCircle, MinusCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  ChevronRight, Compass, Shield, Flame, BookOpen, Layers, Cpu, Database, 
  Brain, FileText, Filter, HelpCircle, Check, Info, X, Calendar, RotateCcw
} from 'lucide-react'

// ==========================================
// DUMMY DATA FOR PROTOTYPE ANALYTICS
// ==========================================

const MOCK_TESTS_DATA = {
  personal: {
    overview: {
      averageScore: 68.4,
      bestScore: 84.5,
      latestScore: 73.0,
      maxMarks: 100,
      accuracy: 82.5,
      attemptRate: 86.2, // 56 / 65 Qs
      testsTaken: 8,
      totalQuestionsAttempted: 448,
      totalCorrect: 370,
      totalIncorrect: 78,
      totalUnanswered: 72,
      negativeMarksLost: 5.66,
      averageTimePerQ: '2m 14s',
      totalTimeSpent: '21h 40m',
      estimatedGateScore: 782, // out of 1000
      projectedAirRank: 'AIR 140 - 190',
    },
    questionTypes: [
      { type: 'MCQ (1 Mark)', attempted: 22, correct: 19, incorrect: 3, accuracy: 86.4, negativePenalty: -1.0 },
      { type: 'MCQ (2 Marks)', attempted: 18, correct: 14, incorrect: 4, accuracy: 77.8, negativePenalty: -2.66 },
      { type: 'MSQ (Multiple Select)', attempted: 8, correct: 6, incorrect: 2, accuracy: 75.0, negativePenalty: 0 },
      { type: 'NAT (Numerical)', attempted: 8, correct: 7, incorrect: 1, accuracy: 87.5, negativePenalty: 0 },
    ],
    timePacing: {
      sectionAptitude: { name: 'General Aptitude (15M)', timeTaken: '22m', target: '25m', efficiency: 'Fast & High Accuracy' },
      sectionTechnical1M: { name: 'Technical 1-Mark (25M)', timeTaken: '44m', target: '45m', efficiency: 'Optimal Pacing' },
      sectionTechnical2M: { name: 'Technical 2-Mark (60M)', timeTaken: '98m', target: '100m', efficiency: 'Balanced' },
      bufferTimeRemaining: '16 minutes',
    },
    subjectMastery: [
      { name: 'Algorithms & Data Structures', scorePct: 92, accuracy: 94, attempted: 45, correct: 42, icon: Layers, status: 'Strength' },
      { name: 'Operating Systems', scorePct: 86, accuracy: 88, attempted: 38, correct: 34, icon: Cpu, status: 'Strength' },
      { name: 'Databases (DBMS)', scorePct: 80, accuracy: 82, attempted: 32, correct: 27, icon: Database, status: 'Solid' },
      { name: 'Theory of Computation', scorePct: 75, accuracy: 78, attempted: 30, correct: 24, icon: Compass, status: 'Solid' },
      { name: 'Engineering Mathematics', scorePct: 78, accuracy: 81, attempted: 40, correct: 33, icon: BarChart2, status: 'Solid' },
      { name: 'General Aptitude', scorePct: 90, accuracy: 93, attempted: 50, correct: 47, icon: Brain, status: 'Strength' },
      { name: 'Computer Networks', scorePct: 62, accuracy: 66, attempted: 35, correct: 23, icon: Globe, status: 'Needs Revision' },
      { name: 'COA & Architecture', scorePct: 52, accuracy: 56, attempted: 28, correct: 16, icon: Cpu, status: 'Weak Area' },
      { name: 'Compiler Design', scorePct: 68, accuracy: 71, attempted: 20, correct: 14, icon: FileText, status: 'Needs Revision' },
      { name: 'Digital Logic', scorePct: 74, accuracy: 78, attempted: 22, correct: 17, icon: Zap, status: 'Solid' },
    ],
    errorAnalysis: [
      { reason: 'Conceptual Gap', percentage: 42, count: 33, tip: 'Focus on Pipelining & Cache Mapping theory.' },
      { reason: 'Calculation / Numerical Slip', percentage: 33, count: 26, tip: 'Double check NAT bounds before submitting.' },
      { reason: 'Misread Question (NOT / EXCEPT)', percentage: 25, count: 19, tip: 'Underline negative polarity terms in questions.' },
    ],
    progression: [
      { test: 'Mock 1', score: 52.0, date: '12 Oct' },
      { test: 'Mock 2', score: 58.5, date: '16 Oct' },
      { test: 'Mock 3', score: 64.0, date: '20 Oct' },
      { test: 'Mock 4', score: 62.5, date: '24 Oct' },
      { test: 'Mock 5', score: 71.0, date: '28 Oct' },
      { test: 'Mock 6', score: 68.0, date: '01 Nov' },
      { test: 'Mock 7', score: 84.5, date: '03 Nov' },
      { test: 'Mock 8', score: 73.0, date: '05 Nov' },
    ]
  },
  global: {
    cohort: {
      totalParticipants: 18450,
      userRank: 512,
      percentile: 97.2,
      userScore: 73.0,
      cohortAverage: 38.6,
      cohortMedian: 35.2,
      top10PercentScore: 61.5,
      top1PercentScore: 78.0,
      topperScore: 89.33,
      qualifyingCutoffGen: 27.8,
    },
    subjectBenchmark: [
      { name: 'Algorithms', userScore: 92, cohortAvg: 46, topperAvg: 96, gap: '+46% above avg' },
      { name: 'Operating Systems', userScore: 86, cohortAvg: 41, topperAvg: 91, gap: '+45% above avg' },
      { name: 'General Aptitude', userScore: 90, cohortAvg: 64, topperAvg: 97, gap: '+26% above avg' },
      { name: 'DBMS', userScore: 80, cohortAvg: 48, topperAvg: 88, gap: '+32% above avg' },
      { name: 'Engineering Math', userScore: 78, cohortAvg: 45, topperAvg: 89, gap: '+33% above avg' },
      { name: 'Theory of Computation', userScore: 75, cohortAvg: 42, topperAvg: 86, gap: '+33% above avg' },
      { name: 'Digital Logic', userScore: 74, cohortAvg: 52, topperAvg: 84, gap: '+22% above avg' },
      { name: 'Compiler Design', userScore: 68, cohortAvg: 38, topperAvg: 85, gap: '+30% above avg' },
      { name: 'Computer Networks', userScore: 62, cohortAvg: 39, topperAvg: 86, gap: '+23% above avg' },
      { name: 'COA & Architecture', userScore: 52, cohortAvg: 36, topperAvg: 82, gap: '+16% above avg' },
    ],
    admissionChances: [
      { institute: 'IISc Bangalore (M.Tech CSE)', minCutoff: 75, probability: '84%', status: 'Competitive', color: 'emerald' },
      { institute: 'IIT Bombay / IIT Delhi', minCutoff: 72, probability: '91%', status: 'Very High', color: 'emerald' },
      { institute: 'IIT Madras / IIT Kanpur', minCutoff: 68, probability: '96%', status: 'Safe', color: 'emerald' },
      { institute: 'IIT Kharagpur / IIT Roorkee', minCutoff: 64, probability: '99%', status: 'Safe', color: 'emerald' },
      { institute: 'Top NITs (Trichy / Surathkal)', minCutoff: 52, probability: '99%', status: 'Guaranteed', color: 'blue' },
      { institute: 'PSU Recruitment (ONGC, IOCL, BARC)', minCutoff: 74, probability: '78%', status: 'Moderate', color: 'amber' },
    ],
    bellCurveBuckets: [
      { range: '0 - 20', percentage: 18, count: '3,321' },
      { range: '21 - 35', percentage: 38, count: '7,011' },
      { range: '36 - 50', percentage: 26, count: '4,797' },
      { range: '51 - 65', percentage: 12, count: '2,214' },
      { range: '66 - 80', percentage: 5.2, count: '960', hasUser: true }, // USER IS HERE (73.0)
      { range: '81 - 100', percentage: 0.8, count: '147' },
    ]
  }
}

const PYQ_TESTS_DATA = {
  personal: {
    overview: {
      averageScore: 74.2,
      bestScore: 89.0,
      latestScore: 78.33,
      maxMarks: 100,
      accuracy: 85.8,
      attemptRate: 89.2, // 58 / 65 Qs
      testsTaken: 6,
      totalQuestionsAttempted: 350,
      totalCorrect: 301,
      totalIncorrect: 49,
      totalUnanswered: 40,
      negativeMarksLost: 3.33,
      averageTimePerQ: '2m 02s',
      totalTimeSpent: '16h 10m',
      estimatedGateScore: 815,
      projectedAirRank: 'AIR 85 - 120',
    },
    questionTypes: [
      { type: 'MCQ (1 Mark)', attempted: 24, correct: 22, incorrect: 2, accuracy: 91.7, negativePenalty: -0.66 },
      { type: 'MCQ (2 Marks)', attempted: 20, correct: 16, incorrect: 4, accuracy: 80.0, negativePenalty: -2.66 },
      { type: 'MSQ (Multiple Select)', attempted: 6, correct: 5, incorrect: 1, accuracy: 83.3, negativePenalty: 0 },
      { type: 'NAT (Numerical)', attempted: 8, correct: 8, incorrect: 0, accuracy: 100.0, negativePenalty: 0 },
    ],
    timePacing: {
      sectionAptitude: { name: 'General Aptitude (15M)', timeTaken: '18m', target: '25m', efficiency: 'Exceptional' },
      sectionTechnical1M: { name: 'Technical 1-Mark (25M)', timeTaken: '40m', target: '45m', efficiency: 'Very Quick' },
      sectionTechnical2M: { name: 'Technical 2-Mark (60M)', timeTaken: '92m', target: '100m', efficiency: 'Comfortable' },
      bufferTimeRemaining: '30 minutes',
    },
    subjectMastery: [
      { name: 'Algorithms & Data Structures', scorePct: 95, accuracy: 96, attempted: 40, correct: 39, icon: Layers, status: 'Strength' },
      { name: 'General Aptitude', scorePct: 94, accuracy: 96, attempted: 45, correct: 44, icon: Brain, status: 'Strength' },
      { name: 'Operating Systems', scorePct: 88, accuracy: 90, attempted: 34, correct: 31, icon: Cpu, status: 'Strength' },
      { name: 'Databases (DBMS)', scorePct: 84, accuracy: 86, attempted: 28, correct: 25, icon: Database, status: 'Solid' },
      { name: 'Discrete Mathematics', scorePct: 82, accuracy: 85, attempted: 32, correct: 28, icon: Compass, status: 'Solid' },
      { name: 'Engineering Mathematics', scorePct: 80, accuracy: 83, attempted: 35, correct: 30, icon: BarChart2, status: 'Solid' },
      { name: 'Theory of Computation', scorePct: 79, accuracy: 82, attempted: 26, correct: 22, icon: FileText, status: 'Solid' },
      { name: 'Digital Logic', scorePct: 76, accuracy: 80, attempted: 20, correct: 16, icon: Zap, status: 'Solid' },
      { name: 'Computer Networks', scorePct: 69, accuracy: 72, attempted: 30, correct: 22, icon: Globe, status: 'Needs Revision' },
      { name: 'COA & Architecture', scorePct: 60, accuracy: 65, attempted: 25, correct: 16, icon: Cpu, status: 'Needs Revision' },
    ],
    errorAnalysis: [
      { reason: 'Misread NAT Constraint (Range / Rounding)', percentage: 45, count: 22, tip: 'Carefully note if answer specifies round to 2 decimals.' },
      { reason: 'Time Pressure in Complex 2M Questions', percentage: 35, count: 17, tip: 'Leave graph traversal edge cases for second pass.' },
      { reason: 'Silly Sign or Binary Inversion Error', percentage: 20, count: 10, tip: 'Verify two\'s complement step-by-step.' },
    ],
    progression: [
      { test: 'GATE 2019', score: 66.0, date: '14 Oct' },
      { test: 'GATE 2020', score: 71.5, date: '19 Oct' },
      { test: 'GATE 2021 (Set 1)', score: 73.0, date: '25 Oct' },
      { test: 'GATE 2022', score: 75.5, date: '29 Oct' },
      { test: 'GATE 2023', score: 89.0, date: '02 Nov' },
      { test: 'GATE 2024 (Set 2)', score: 78.33, date: '05 Nov' },
    ]
  },
  global: {
    cohort: {
      totalParticipants: 24200,
      userRank: 288,
      percentile: 98.8,
      userScore: 78.33,
      cohortAverage: 42.1,
      cohortMedian: 39.0,
      top10PercentScore: 65.0,
      top1PercentScore: 81.5,
      topperScore: 92.67,
      qualifyingCutoffGen: 28.5,
    },
    subjectBenchmark: [
      { name: 'Algorithms', userScore: 95, cohortAvg: 49, topperAvg: 98, gap: '+46% above avg' },
      { name: 'General Aptitude', userScore: 94, cohortAvg: 68, topperAvg: 99, gap: '+26% above avg' },
      { name: 'Operating Systems', userScore: 88, cohortAvg: 44, topperAvg: 93, gap: '+44% above avg' },
      { name: 'DBMS', userScore: 84, cohortAvg: 51, topperAvg: 90, gap: '+33% above avg' },
      { name: 'Discrete Math', userScore: 82, cohortAvg: 46, topperAvg: 91, gap: '+36% above avg' },
      { name: 'Engineering Math', userScore: 80, cohortAvg: 47, topperAvg: 90, gap: '+33% above avg' },
      { name: 'Theory of Computation', userScore: 79, cohortAvg: 45, topperAvg: 89, gap: '+34% above avg' },
      { name: 'Digital Logic', userScore: 76, cohortAvg: 54, topperAvg: 86, gap: '+22% above avg' },
      { name: 'Computer Networks', userScore: 69, cohortAvg: 41, topperAvg: 88, gap: '+28% above avg' },
      { name: 'COA & Architecture', userScore: 60, cohortAvg: 38, topperAvg: 85, gap: '+22% above avg' },
    ],
    admissionChances: [
      { institute: 'IISc Bangalore (M.Tech CSE)', minCutoff: 75, probability: '94%', status: 'Very High', color: 'emerald' },
      { institute: 'IIT Bombay / IIT Delhi', minCutoff: 72, probability: '98%', status: 'Safe', color: 'emerald' },
      { institute: 'IIT Madras / IIT Kanpur', minCutoff: 68, probability: '99%', status: 'Guaranteed', color: 'emerald' },
      { institute: 'IIT Kharagpur / IIT Roorkee', minCutoff: 64, probability: '99%', status: 'Guaranteed', color: 'emerald' },
      { institute: 'Top NITs (Trichy / Surathkal)', minCutoff: 52, probability: '100%', status: 'Guaranteed', color: 'blue' },
      { institute: 'PSU Recruitment (ONGC, IOCL, BARC)', minCutoff: 74, probability: '89%', status: 'Very High', color: 'emerald' },
    ],
    bellCurveBuckets: [
      { range: '0 - 25', percentage: 14, count: '3,388' },
      { range: '26 - 40', percentage: 41, count: '9,922' },
      { range: '41 - 55', percentage: 25, count: '6,050' },
      { range: '56 - 70', percentage: 14, count: '3,388' },
      { range: '71 - 85', percentage: 5.2, count: '1,258', hasUser: true }, // USER IS HERE (78.33)
      { range: '86 - 100', percentage: 0.8, count: '194' },
    ]
  }
}

// Additional Logics from Attached HTML Dashboard:
const SCATTER_SUBJECTS = [
  { name: 'Engineering Mathematics', short: 'Maths', accuracy: 74, timePerQ: 3.1, questionsSeen: 142 },
  { name: 'Discrete Mathematics', short: 'DM', accuracy: 79, timePerQ: 2.8, questionsSeen: 118 },
  { name: 'Digital Logic', short: 'DL', accuracy: 86, timePerQ: 1.9, questionsSeen: 96 },
  { name: 'Computer Organization & Architecture', short: 'COA', accuracy: 66, timePerQ: 3.4, questionsSeen: 104 },
  { name: 'Programming & Data Structures', short: 'PDS', accuracy: 82, timePerQ: 2.5, questionsSeen: 168 },
  { name: 'Algorithms', short: 'Algo', accuracy: 60, timePerQ: 3.9, questionsSeen: 131 },
  { name: 'Theory of Computation', short: 'TOC', accuracy: 55, timePerQ: 3.6, questionsSeen: 97 },
  { name: 'Compiler Design', short: 'CD', accuracy: 71, timePerQ: 3.0, questionsSeen: 79 },
  { name: 'Operating Systems', short: 'OS', accuracy: 63, timePerQ: 3.3, questionsSeen: 121 },
  { name: 'Databases (DBMS)', short: 'DBMS', accuracy: 77, timePerQ: 2.4, questionsSeen: 94 },
  { name: 'Computer Networks', short: 'CN', accuracy: 52, timePerQ: 2.2, questionsSeen: 88 },
  { name: 'General Aptitude', short: 'GA', accuracy: 82, timePerQ: 1.7, questionsSeen: 140 },
]

const WEAK_TOPICS = [
  { topic: 'Dynamic Programming', subject: 'Algorithms', accuracy: 44, attempts: 38 },
  { topic: 'Subnetting & IP Addressing', subject: 'Computer Networks', accuracy: 46, attempts: 29 },
  { topic: 'Pumping Lemma & Closure', subject: 'Theory of Computation', accuracy: 48, attempts: 24 },
  { topic: 'Pipeline Hazards & Stalls', subject: 'Computer Organization', accuracy: 51, attempts: 32 },
  { topic: 'Deadlock & Semaphores', subject: 'Operating Systems', accuracy: 53, attempts: 35 },
]

const PERFORMANCE_INSIGHTS = [
  {
    type: 'warning',
    tag: 'Rushing Detected',
    title: 'Rushed answers cost you marks',
    description: 'Computer Networks takes you 2.2 min per question against a 2.7 min ideal pace, and only 52% are right. 14 answers given under 30 seconds were wrong in your last five tests.',
    actionText: 'Review Rushed Questions',
    color: 'rose'
  },
  {
    type: 'caution',
    tag: 'Answer Flipping',
    title: 'You change right answers to wrong',
    description: 'Across the last 8 tests, 11 correct answers were changed to wrong during review, while only 4 went the other way. Trust your first pass unless you find a concrete mistake.',
    actionText: 'See Changed Answers',
    color: 'amber'
  },
  {
    type: 'success',
    tag: 'Score Velocity',
    title: 'Up +18.7 marks since your first tests',
    description: 'Your last five tests average 68.4 against 52.0 at the start. At this sustained trajectory you will comfortably reach the 75+ mark bracket by mid-December.',
    actionText: 'Inspect Trajectory',
    color: 'emerald'
  }
]

const PYQ_YEARS_COVERAGE = [
  { year: 2014, done: true, score: 62.0, date: '18 Sep' },
  { year: 2015, done: true, score: 64.5, date: '25 Sep' },
  { year: 2016, done: true, score: 68.0, date: '02 Oct' },
  { year: 2017, done: true, score: 71.0, date: '08 Oct' },
  { year: 2018, done: true, score: 65.5, date: '14 Oct' },
  { year: 2019, done: true, score: 66.0, date: '19 Oct' },
  { year: 2020, done: true, score: 71.5, date: '25 Oct' },
  { year: 2021, done: true, score: 73.0, date: '29 Oct' },
  { year: 2022, done: true, score: 75.5, date: '02 Nov' },
  { year: 2023, done: true, score: 89.0, date: '05 Nov' },
  { year: 2024, done: false, score: null, date: null },
  { year: 2025, done: false, score: null, date: null },
  { year: 2026, done: false, score: null, date: null },
]

const DUMMY_TEST_HISTORY = [
  { id: '1', title: 'GATE 2023 Official Paper', type: 'PYQ', date: '05 Nov 2026', score: 89.0, maxScore: 100, accuracy: 92.5, timeTaken: '2h 48m', correct: 58, wrong: 4, skipped: 3, rank: 142 },
  { id: '2', title: 'All-India Mock Test #8', type: 'Mock', date: '03 Nov 2026', score: 73.0, maxScore: 100, accuracy: 82.5, timeTaken: '2h 55m', correct: 48, wrong: 10, skipped: 7, rank: 512 },
  { id: '3', title: 'GATE 2022 Official Paper', type: 'PYQ', date: '02 Nov 2026', score: 75.5, maxScore: 100, accuracy: 85.0, timeTaken: '2h 52m', correct: 51, wrong: 9, skipped: 5, rank: 380 },
  { id: '4', title: 'All-India Mock Test #7', type: 'Mock', date: '01 Nov 2026', score: 84.5, maxScore: 100, accuracy: 90.0, timeTaken: '2h 45m', correct: 55, wrong: 6, skipped: 4, rank: 210 },
  { id: '5', title: 'GATE 2021 Set 1 Paper', type: 'PYQ', date: '29 Oct 2026', score: 73.0, maxScore: 100, accuracy: 81.0, timeTaken: '2h 58m', correct: 49, wrong: 11, skipped: 5, rank: 460 },
  { id: '6', title: 'All-India Mock Test #6', type: 'Mock', date: '28 Oct 2026', score: 68.0, maxScore: 100, accuracy: 78.5, timeTaken: '2h 50m', correct: 45, wrong: 12, skipped: 8, rank: 680 },
  { id: '7', title: 'GATE 2020 Official Paper', type: 'PYQ', date: '25 Oct 2026', score: 71.5, maxScore: 100, accuracy: 80.0, timeTaken: '2h 54m', correct: 47, wrong: 11, skipped: 7, rank: 520 },
  { id: '8', title: 'All-India Mock Test #5', type: 'Mock', date: '24 Oct 2026', score: 71.0, maxScore: 100, accuracy: 79.0, timeTaken: '2h 56m', correct: 46, wrong: 12, skipped: 7, rank: 590 },
]


// ==========================================
// DUMMY DATA FOR GLOBAL PEER COMPARISONS
// ==========================================

const LEADERBOARD_DATA = {
  testName: 'Mock Test #14 · all learners',
  userRank: 84,
  totalLearners: 1860,
  behindPrev: 0.1,
  aheadNext: 0.1,
  top10: [
    { rank: 1, name: 'Manav L.', initials: 'ML', score: 83.7, accuracy: 94.0, tests: 43, streak: 66, change: 5, up: true },
    { rank: 2, name: 'Sanya K.', initials: 'SK', score: 79.9, accuracy: 93.4, tests: 22, streak: 64, change: 1, up: true },
    { rank: 3, name: 'Aditya R.', initials: 'AR', score: 78.1, accuracy: 93.6, tests: 29, streak: 49, change: 8, up: true },
    { rank: 4, name: 'Kavya L.', initials: 'KL', score: 76.7, accuracy: 92.8, tests: 22, streak: 19, change: 4, up: true },
    { rank: 5, name: 'Rohan P.', initials: 'RP', score: 75.8, accuracy: 92.5, tests: 14, streak: 37, change: 5, up: true },
    { rank: 6, name: 'Priya G.', initials: 'PG', score: 74.8, accuracy: 91.1, tests: 18, streak: 65, change: 7, up: false },
    { rank: 7, name: 'Isha B.', initials: 'IB', score: 74.2, accuracy: 93.4, tests: 28, streak: 50, change: 2, up: false },
    { rank: 8, name: 'Ananya T.', initials: 'AT', score: 73.6, accuracy: 91.6, tests: 37, streak: 56, change: 6, up: true },
    { rank: 9, name: 'Tanvi H.', initials: 'TH', score: 73.2, accuracy: 93.0, tests: 40, streak: 69, change: 5, up: true },
    { rank: 10, name: 'Meera P.', initials: 'MP', score: 72.5, accuracy: 92.6, tests: 18, streak: 34, change: 2, up: true },
  ],
  aroundYou: [
    { rank: 80, name: 'Harsh V.', initials: 'HV', score: 62.3, accuracy: 81.2, tests: 26, streak: 15, change: 12, up: true },
    { rank: 81, name: 'Neha G.', initials: 'NG', score: 62.1, accuracy: 80.8, tests: 20, streak: 18, change: 4, up: false },
    { rank: 82, name: 'Aman K.', initials: 'AK', score: 61.9, accuracy: 80.5, tests: 31, streak: 28, change: 6, up: true },
    { rank: 83, name: 'Divya S.', initials: 'DS', score: 61.8, accuracy: 80.2, tests: 22, streak: 14, change: 2, up: true },
    { rank: 84, name: 'You (Rahul S.)', initials: 'RS', score: 61.7, accuracy: 80.0, tests: 24, streak: 12, change: 53, up: true, isUser: true },
    { rank: 85, name: 'Karthik M.', initials: 'KM', score: 61.6, accuracy: 79.8, tests: 19, streak: 9, change: 5, up: false },
    { rank: 86, name: 'Swati P.', initials: 'SP', score: 61.4, accuracy: 79.5, tests: 25, streak: 21, change: 8, up: true },
    { rank: 87, name: 'Rohit N.', initials: 'RN', score: 61.2, accuracy: 79.2, tests: 18, streak: 16, change: 3, up: false },
    { rank: 88, name: 'Pooja R.', initials: 'PR', score: 61.0, accuracy: 79.0, tests: 27, streak: 24, change: 1, up: true },
  ],
  user: {
    rank: 84,
    name: 'You (Rahul S.)',
    initials: 'RS',
    score: 61.7,
    accuracy: 80.0,
    tests: 24,
    streak: 12,
    change: 53,
    up: true,
    isUser: true,
  },
};

const CROWD_QUESTIONS_DATA = {
  easyMissed: [
    {
      id: 'gate-2024-q12',
      paper: 'GATE 2024 · Q12',
      subject: 'Computer Networks',
      topic: 'Subnetting',
      crowdPct: 82,
      userStatus: 'Missed (-0.33M)',
      marks: '1 Mark MCQ',
    },
    {
      id: 'mock-13-q31',
      paper: 'Mock Test #13 · Q31',
      subject: 'Operating Systems',
      topic: 'Page replacement',
      crowdPct: 76,
      userStatus: 'Skipped (0M)',
      marks: '2 Marks MCQ',
    },
    {
      id: 'gate-2023-q9',
      paper: 'GATE 2023 · Q9',
      subject: 'Theory of Computation',
      topic: 'Closure properties',
      crowdPct: 74,
      userStatus: 'Missed (-0.33M)',
      marks: '1 Mark MCQ',
    },
    {
      id: 'mock-14-q18',
      paper: 'Mock Test #14 · Q18',
      subject: 'Algorithms',
      topic: 'Shortest paths',
      crowdPct: 71,
      userStatus: 'Missed (0M NAT)',
      marks: '2 Marks NAT',
    },
  ],
  beatCrowd: [
    {
      id: 'gate-2024-q44',
      paper: 'GATE 2024 · Q44',
      subject: 'Algorithms',
      topic: 'Dynamic Programming (Matrix Chain)',
      crowdPct: 24,
      userStatus: 'Solved (+2.0M)',
      marks: '2 Marks NAT',
    },
    {
      id: 'mock-14-q52',
      paper: 'Mock Test #14 · Q52',
      subject: 'Computer Organization',
      topic: 'Cache Write-Back Policy',
      crowdPct: 28,
      userStatus: 'Solved (+2.0M)',
      marks: '2 Marks MCQ',
    },
    {
      id: 'gate-2023-q27',
      paper: 'GATE 2023 · Q27',
      subject: 'Databases',
      topic: 'Conflict Serializability & Strict 2PL',
      crowdPct: 31,
      userStatus: 'Solved (+1.0M)',
      marks: '1 Mark MCQ',
    },
    {
      id: 'mock-12-q41',
      paper: 'Mock Test #12 · Q41',
      subject: 'Theory of Computation',
      topic: 'Turing Decidability Reduction',
      crowdPct: 33,
      userStatus: 'Solved (+2.0M)',
      marks: '2 Marks MSQ',
    },
  ]
};

const WEEKLY_EFFORT_DATA = [
  { week: 'Sep 14', you: 118, median: 96, top10: 250 },
  { week: 'Sep 21', you: 152, median: 104, top10: 262 },
  { week: 'Sep 28', you: 134, median: 100, top10: 268 },
  { week: 'Oct 5', you: 176, median: 108, top10: 268 },
  { week: 'Oct 12', you: 112, median: 106, top10: 275 },
  { week: 'Oct 19', you: 138, median: 114, top10: 280 },
  { week: 'Oct 26', you: 192, median: 120, top10: 286 },
  { week: 'Nov 2', you: 244, median: 126, top10: 292 },
];

export default function PrototypeAnalyticsPage() {
  // Primary space: 'mock' for Mock Tests, 'pyq' for PYQ Mocks
  const [activeSpace, setActiveSpace] = useState('mock')

  // Bifurcation: 'personal' for Personal Analytics, 'global' for Peer Comparison
  const [activeBifurcation, setActiveBifurcation] = useState('personal')

  // History table filters
  const [historyFilter, setHistoryFilter] = useState('all') // 'all' | 'Mock' | 'PYQ'
  const [sortField, setSortField] = useState('date') // 'date' | 'score' | 'accuracy'
  const [sortAsc, setSortAsc] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)

  // Review modal state
  const [selectedReviewTest, setSelectedReviewTest] = useState(null)

  // Global comparison interactive states
  const [leaderboardView, setLeaderboardView] = useState('top10') // 'top10' | 'around'
  const [crowdQuestionTab, setCrowdQuestionTab] = useState('easyMissed') // 'easyMissed' | 'beatCrowd'

  // Floating tooltip state
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: '', subtitle: '', hoveredCellKey: null })

  const showTooltip = (e, title, subtitle, hoveredCellKey = null) => {
    const cx = e.clientX
    const cy = e.clientY
    let x = cx + 14
    let y = cy - 64
    if (x + 220 > window.innerWidth - 8) x = cx - 220
    if (x < 8) x = 8
    if (y < 8) y = cy + 18

    setTooltip({
      visible: true,
      x,
      y,
      title,
      subtitle,
      hoveredCellKey
    })
  }

  const moveTooltip = (e) => {
    const cx = e.clientX
    const cy = e.clientY
    let x = cx + 14
    let y = cy - 64
    if (x + 220 > window.innerWidth - 8) x = cx - 220
    if (x < 8) x = 8
    if (y < 8) y = cy + 18
    setTooltip(prev => ({ ...prev, x, y }))
  }

  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, title: '', subtitle: '', hoveredCellKey: null })
  }

  const currentData = activeSpace === 'mock' ? MOCK_TESTS_DATA : PYQ_TESTS_DATA
  const personal = currentData.personal
  const global = currentData.global

  // Filtered & sorted history records
  const filteredHistory = useMemo(() => {
    let list = DUMMY_TEST_HISTORY.filter(h => historyFilter === 'all' || h.type === historyFilter)
    list.sort((a, b) => {
      let valA = a[sortField]
      let valB = b[sortField]
      if (typeof valA === 'string') return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      return sortAsc ? valA - valB : valB - valA
    })
    return showAllHistory ? list : list.slice(0, 6)
  }, [historyFilter, sortField, sortAsc, showAllHistory])

  // Heatmap calculation matching the provided HTML dashboard
  const heatmapData = useMemo(() => {
    const TODAY = new Date(2026, 10, 3) // Anchor to Nov 3, 2026
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dstr = (d) => `${d.getDate()} ${MON[d.getMonth()]}`

    // Deterministic pseudo-random generator matching HTML dashboard
    function rng(a) {
      return function () {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }

    const r = rng(21)
    const act = new Map()
    for (let ago = 0; ago < 26 * 7 + 7; ago++) {
      const prog = 1 - ago / 190
      let q = 0
      const on = ago < 12 ? true : ago === 12 ? false : r() < 0.22 + 0.6 * prog
      if (on) q = Math.round(6 + r() * (18 + 42 * prog))
      act.set(ago, q)
    }

    const dow = (TODAY.getDay() + 6) % 7 // Monday = 0
    const start = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - dow - 25 * 7)

    let total = 0
    let days = 0
    let longest = 0
    let cur = 0
    const monthLabels = []
    let lastM = -1
    const cells = []

    for (let c = 0; c < 26; c++) {
      const cd = new Date(start.getFullYear(), start.getMonth(), start.getDate() + c * 7)
      if (cd.getMonth() !== lastM) {
        monthLabels.push({ col: c + 2, label: MON[cd.getMonth()] })
        lastM = cd.getMonth()
      }
      for (let d = 0; d < 7; d++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + c * 7 + d)
        if (date > TODAY) continue
        const ago = Math.round((TODAY - date) / 864e5)
        const q = act.get(ago) || 0
        const lv = q === 0 ? 0 : q <= 10 ? 1 : q <= 25 ? 2 : q <= 45 ? 3 : 4
        if (q > 0) {
          total += q
          days++
          cur++
          longest = Math.max(longest, cur)
        } else {
          cur = 0
        }
        const mins = Math.round(q * 2.4)
        cells.push({
          key: `${c}-${d}`,
          col: c + 2,
          row: d + 2,
          date,
          dateStr: dstr(date),
          q,
          mins,
          lv,
          tipText: q ? `${q} questions · about ${mins} min` : 'No practice'
        })
      }
    }

    return {
      monthLabels,
      cells,
      total,
      days,
      longest
    }
  }, [])

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-screen">
      
      {/* Page Header (No prototype warning banner & no Rahul greeting banner, per instructions) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <BarChart2 className="text-primary" size={28} />
            <span>Comprehensive Exam Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Compare individual performance depth with global cohort benchmarks across Mock Tests & PYQ Mocks.
          </p>
        </div>

        {/* BIFURCATION SWITCHER (Personal vs Global) */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl shrink-0 self-start md:self-auto shadow-xs border border-border-light dark:border-border-dark">
          <button
            onClick={() => setActiveBifurcation('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeBifurcation === 'personal'
                ? 'bg-card-light dark:bg-card-dark text-primary shadow-sm font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Target size={15} className={activeBifurcation === 'personal' ? 'text-primary' : 'text-slate-400'} />
            <span>Personal Analytics</span>
          </button>

          <button
            onClick={() => setActiveBifurcation('global')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeBifurcation === 'global'
                ? 'bg-card-light dark:bg-card-dark text-primary shadow-sm font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe size={15} className={activeBifurcation === 'global' ? 'text-primary' : 'text-slate-400'} />
            <span>Global Peer Comparison</span>
          </button>
        </div>
      </div>

      {/* SPACE SELECTOR (Mock Tests vs PYQ Tests) */}
      <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-2">
        <button
          onClick={() => setActiveSpace('mock')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all flex items-center gap-2 border cursor-pointer ${
            activeSpace === 'mock'
              ? 'bg-primary text-white border-primary shadow-md shadow-indigo-500/10'
              : 'bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 border-border-light dark:border-border-dark hover:border-primary/40'
          }`}
        >
          <BookOpen size={15} />
          <span>Mock Tests Analytics</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeSpace === 'mock' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            8 Mocks
          </span>
        </button>

        <button
          onClick={() => setActiveSpace('pyq')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all flex items-center gap-2 border cursor-pointer ${
            activeSpace === 'pyq'
              ? 'bg-primary text-white border-primary shadow-md shadow-indigo-500/10'
              : 'bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 border-border-light dark:border-border-dark hover:border-primary/40'
          }`}
        >
          <FileText size={15} />
          <span>PYQ Mock Tests Analytics</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeSpace === 'pyq' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            6 Papers
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* BIFURCATION 1: PERSONAL ANALYTICS (CURRENT BOXES)         */}
      {/* ========================================================= */}
      {activeBifurcation === 'personal' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Score & Projection Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Average Score</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{personal.overview.averageScore}</span>
                <span className="text-xs text-slate-400 font-bold">/ {personal.overview.maxMarks}</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 mt-1">
                <ArrowUpRight size={13} />
                <span>Peak: {personal.overview.bestScore} Marks</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Overall Accuracy</span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {personal.overview.accuracy}%
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Attempt Rate: {personal.overview.attemptRate}% ({personal.overview.totalQuestionsAttempted} Qs)
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Negative Marks Penalty</span>
              <div className="text-3xl font-black text-rose-500">
                -{personal.overview.negativeMarksLost}
              </div>
              <p className="text-[11px] font-medium text-rose-400">
                Marks lost to wrong MCQ attempts
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-soft space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">Projected GATE Standing</span>
              <div className="text-2xl font-black text-primary truncate">
                {personal.overview.projectedAirRank}
              </div>
              <p className="text-[11px] font-bold text-indigo-400">
                Est. GATE Score: {personal.overview.estimatedGateScore} / 1000
              </p>
            </div>

          </div>

          {/* Row 2: Score Progression SVG Chart & Question Type Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                    Score Progression Over Tests
                  </h3>
                  <p className="text-xs text-slate-500">Marks obtained across your successive test runs.</p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                  {personal.overview.testsTaken} Tests Analyzed
                </span>
              </div>

              <div className="py-2">
                <svg viewBox="0 0 650 180" className="w-full h-44 overflow-visible">
                  {[0, 25, 50, 75, 100].map((v) => {
                    const y = 160 - (v / 100) * 140
                    return (
                      <g key={v}>
                        <line x1="30" x2="630" y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="3 3" />
                        <text x="5" y={y + 3} className="fill-slate-400 text-[10px] font-mono">{v}</text>
                      </g>
                    )
                  })}

                  {(() => {
                    const pts = personal.progression.map((p, i) => {
                      const x = 50 + (i * (560 / (personal.progression.length - 1)))
                      const y = 160 - (p.score / 100) * 140
                      return { x, y, score: p.score, label: p.test }
                    })
                    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                    
                    return (
                      <>
                        <path d={pathD} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="5" className="fill-primary stroke-white dark:stroke-slate-900 stroke-2" />
                            <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[11px] font-black">
                              {p.score}
                            </text>
                            <text x={p.x} y="175" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold">
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </>
                    )
                  })()}
                </svg>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Question Format Accuracy
                </h3>
                <p className="text-xs text-slate-500">Performance across MCQ, MSQ & NAT formats.</p>
              </div>

              <div className="space-y-3.5">
                {personal.questionTypes.map((q) => (
                  <div key={q.type} className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-border-light/60 dark:border-border-dark/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{q.type}</span>
                      <span className="font-extrabold text-primary">{q.accuracy}% Correct</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${q.accuracy >= 80 ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${q.accuracy}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{q.correct} Correct • {q.incorrect} Wrong</span>
                      <span>{q.negativePenalty < 0 ? `${q.negativePenalty} Penalty` : 'No Negative'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Row 3: Subject Mastery Efficiency & Error Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                    Subject Scoring Efficiency
                  </h3>
                  <p className="text-xs text-slate-500">Detailed breakdown of marks conversion per core subject.</p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">10 Core Subjects</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {personal.subjectMastery.map((sub) => {
                  const SubIcon = sub.icon
                  return (
                    <div key={sub.name} className="p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <SubIcon size={14} />
                          </div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{sub.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          sub.status === 'Strength' ? 'bg-emerald-500/10 text-emerald-500' :
                          sub.status === 'Solid' ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {sub.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${sub.scorePct >= 80 ? 'bg-emerald-500' : sub.scorePct >= 65 ? 'bg-primary' : 'bg-rose-500'}`}
                            style={{ width: `${sub.scorePct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                          <span>Score: {sub.scorePct}%</span>
                          <span>Accuracy: {sub.accuracy}% ({sub.correct}/{sub.attempted})</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Error Cause Root-Analysis
                </h3>
                <p className="text-xs text-slate-500">Why marks were deducted in negative scoring.</p>
              </div>

              <div className="space-y-4">
                {personal.errorAnalysis.map((err) => (
                  <div key={err.reason} className="p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200">{err.reason}</span>
                      <span className="text-rose-500">{err.percentage}%</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${err.percentage}%` }} />
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      💡 <span className="font-semibold text-slate-700 dark:text-slate-300">Tip:</span> {err.tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* PERSONAL PERFORMANCE ANALYTICS & DIAGNOSTICS */}
          {/* SECTION 1: SPEED AGAINST ACCURACY (SCATTER QUADRANT) */}
      <section className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Zap size={18} className="text-primary" />
              <span>Speed Against Accuracy (Quadrant Map)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each point represents a core subject. The ideal GATE speed benchmark is <strong>2.7 minutes per question</strong> (180 min / 65 Qs).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
              Rushing Warning: Computer Networks
            </span>
          </div>
        </div>

        {/* Responsive Scatter Plot Canvas */}
        <div className="py-2 overflow-x-auto no-scrollbar">
          <svg viewBox="0 0 720 320" className="w-full min-w-[560px] h-64 overflow-visible">
            {/* Quadrant Tint Backgrounds */}
            {/* Bottom-Left: Rushing (Fast < 2.7, Low Acc < 65) */}
            <rect x="50" y="170" width="220" height="110" className="fill-rose-500/10 dark:fill-rose-950/20" />
            <text x="60" y="270" className="fill-rose-500 text-[10px] font-bold uppercase tracking-wider">
              Rushing Zone (Fast but Low Acc)
            </text>

            {/* Bottom-Right: Concept Gaps (Slow > 2.7, Low Acc < 65) */}
            <rect x="270" y="170" width="410" height="110" className="fill-slate-500/10 dark:fill-slate-800/30" />
            <text x="670" y="270" textAnchor="end" className="fill-slate-400 text-[10px] font-bold uppercase tracking-wider">
              Concept Gaps (Slow & Low Acc)
            </text>

            {/* Top-Right: Methodical (Acc >= 65) */}
            <text x="670" y="45" textAnchor="end" className="fill-emerald-500 text-[10px] font-bold uppercase tracking-wider">
              Mastery & Optimal Zone
            </text>

            {/* Horizontal Grid lines (Accuracy) */}
            {[50, 60, 70, 80, 90].map((acc) => {
              const y = 280 - ((acc - 45) / 50) * 240
              return (
                <g key={acc}>
                  <line x1="50" x2="680" y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="3 3" />
                  <text x="40" y={y + 3} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">{acc}%</text>
                </g>
              )
            })}

            {/* Target 65% Line */}
            <line x1="50" x2="680" y1="170" y2="170" className="stroke-rose-500/40" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="55" y="165" className="fill-rose-500 text-[9px] font-bold">Target Cutoff: 65%</text>

            {/* Ideal Pace Vertical Line (2.7 min) */}
            <line x1="270" x2="270" y1="20" y2="280" className="stroke-primary/50" strokeWidth="2" strokeDasharray="5 4" />
            <text x="275" y="32" className="fill-primary text-[10px] font-bold">Ideal Pace: 2.7 min/Q</text>

            {/* X Axis Time Labels */}
            {[1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5].map((time) => {
              const x = 50 + ((time - 1.2) / 3.4) * 630
              return (
                <g key={time}>
                  <line x1={x} x2={x} y1="280" y2="285" className="stroke-slate-300 dark:stroke-slate-700" />
                  <text x={x} y="298" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">{time.toFixed(1)}m</text>
                </g>
              )
            })}
            <text x="365" y="315" textAnchor="middle" className="fill-slate-500 text-[11px] font-bold">
              Average Time Taken per Question (Minutes)
            </text>

            {/* Data Points with Tooltips */}
            {SCATTER_SUBJECTS.map((sub, i) => {
              const cx = 50 + ((sub.timePerQ - 1.2) / 3.4) * 630
              const cy = 280 - ((sub.accuracy - 45) / 50) * 240
              const isRushing = sub.timePerQ < 2.7 && sub.accuracy < 65
              
              return (
                <g 
                  key={sub.name}
                  className="cursor-pointer group"
                  onMouseEnter={(e) => showTooltip(
                    e,
                    sub.name,
                    `${sub.accuracy}% Accuracy • ${sub.timePerQ} min/Q • ${sub.questionsSeen} Questions Seen`
                  )}
                  onMouseMove={moveTooltip}
                  onMouseLeave={hideTooltip}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r="7"
                    className={`transition-all duration-200 group-hover:scale-125 stroke-white dark:stroke-slate-900 stroke-2 ${
                      isRushing ? 'fill-rose-500 animate-pulse' : sub.accuracy >= 75 ? 'fill-emerald-500' : 'fill-primary'
                    }`}
                  />
                  <text
                    x={cx + 10}
                    y={cy + 4}
                    className="fill-slate-800 dark:fill-slate-200 text-[11px] font-bold pointer-events-none group-hover:fill-primary"
                  >
                    {sub.short}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-border-light/60 dark:border-border-dark/60 flex items-center gap-3 text-xs">
          <span className="p-1 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
            <AlertTriangle size={15} />
          </span>
          <p className="text-slate-600 dark:text-slate-300">
            <strong>Key Pacing Insight:</strong> You solve <strong>Computer Networks</strong> in 2.2 min (very fast), but score only 52% accuracy. Slowing down to 2.8 min on Networks could recover an estimated +4 to +6 marks.
          </p>
        </div>
      </section>

      {/* SECTION 2: WEAK TOPICS PRIORITY & ACTION LIST */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Practice These Next Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-light/60 dark:border-border-dark/60">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Target size={18} className="text-rose-500" />
                <span>Practice These Next (Weakest Topics)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Topics with the lowest accuracy across your last 30 days of test attempts.
              </p>
            </div>
            <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg">
              Immediate Impact
            </span>
          </div>

          <div className="space-y-3">
            {WEAK_TOPICS.map((t) => (
              <div 
                key={t.topic}
                className="p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-850 dark:text-slate-100 block truncate">
                    {t.topic}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {t.subject} • {t.attempts} attempts
                  </span>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                  <div className="w-28 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Accuracy</span>
                      <span className="text-rose-500">{t.accuracy}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${t.accuracy}%` }} />
                    </div>
                  </div>

                  <Link
                    to="/pyq"
                    className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95"
                  >
                    Practice
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Strongest Topics Ribbon */}
          <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex items-center gap-2 flex-wrap text-xs">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">Strongest Topics:</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Boolean Minimization (91%)
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Graph Counting (88%)
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              C Pointers & Arrays (86%)
            </span>
          </div>
        </div>

        {/* Actionable Diagnostic Performance Insights */}
        <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
          <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Compass size={18} className="text-primary" />
              <span>Diagnostic Insights</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Automated algorithmic analysis of your test behavior.</p>
          </div>

          <div className="space-y-3.5">
            {PERFORMANCE_INSIGHTS.map((ins) => (
              <div 
                key={ins.title}
                className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    ins.color === 'rose' ? 'bg-rose-500/10 text-rose-500' :
                    ins.color === 'amber' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {ins.tag}
                  </span>
                  <ArrowUpRight size={14} className="text-slate-400" />
                </div>

                <h3 className="font-extrabold text-xs sm:text-sm text-slate-850 dark:text-slate-100">
                  {ins.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {ins.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* SECTION 3: PYQ PAPER COVERAGE GRID & STUDY HEATMAP */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PYQ Papers Syllabus Coverage Grid */}
        <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
          <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <span>Official PYQ Paper Coverage</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              10 of 13 official GATE CS exam papers completed (77%).
            </p>
          </div>

          {/* Large Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black">
              <span className="text-slate-700 dark:text-slate-300">Completion</span>
              <span className="text-primary">77%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: '77%' }} />
            </div>
          </div>

          {/* Interactive Year Badges */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
            {PYQ_YEARS_COVERAGE.map((y) => (
              <div
                key={y.year}
                onMouseEnter={(e) => showTooltip(
                  e,
                  `GATE ${y.year} Paper`,
                  y.done ? `Completed on ${y.date} • Scored ${y.score} Marks` : 'Paper not attempted yet'
                )}
                onMouseMove={moveTooltip}
                onMouseLeave={hideTooltip}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  y.done
                    ? 'border-primary/40 bg-primary/10 text-primary font-extrabold shadow-2xs'
                    : 'border-dashed border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/20 text-slate-400'
                }`}
              >
                <span className="text-xs block font-mono">{y.year}</span>
                <span className="text-[9px] block font-semibold truncate mt-0.5">
                  {y.done ? `${y.score}M` : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Next Recommended: <strong>GATE 2024 (Set 1)</strong></span>
            <Link to="/pyq-mock" className="font-bold text-primary hover:underline">Start Paper →</Link>
          </div>
        </div>

        {/* Study Activity Heatmap (Exact HTML Dashboard layout & logic) */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Study activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Questions solved per day, last 26 weeks
            </p>
          </div>

          {/* Interactive CSS Grid Heatmap */}
          <div className="overflow-x-auto no-scrollbar py-1">
            <div
              className="min-w-[620px] grid"
              style={{
                gridTemplateColumns: '28px repeat(26, minmax(0, 1fr))',
                columnGap: '3px',
                rowGap: '3px'
              }}
            >
              {/* Day Labels on Column 1 */}
              <span
                className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 self-center leading-none pr-1 select-none"
                style={{ gridColumn: 1, gridRow: 2 }}
              >
                Mon
              </span>
              <span
                className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 self-center leading-none pr-1 select-none"
                style={{ gridColumn: 1, gridRow: 4 }}
              >
                Wed
              </span>
              <span
                className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 self-center leading-none pr-1 select-none"
                style={{ gridColumn: 1, gridRow: 6 }}
              >
                Fri
              </span>

              {/* Month Labels on Row 1 */}
              {heatmapData.monthLabels.map((m, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap leading-none pb-1 select-none"
                  style={{ gridColumn: m.col, gridRow: 1 }}
                >
                  {m.label}
                </span>
              ))}

              {/* Day Cells */}
              {heatmapData.cells.map((cell) => {
                const isHovered = tooltip.visible && tooltip.hoveredCellKey === cell.key
                const cellBg =
                  cell.lv === 0
                    ? 'bg-[#e6ebf2] dark:bg-slate-800'
                    : cell.lv === 1
                    ? 'bg-[#b7d3f6] dark:bg-blue-900/60'
                    : cell.lv === 2
                    ? 'bg-[#86b6ef] dark:bg-blue-700/80'
                    : cell.lv === 3
                    ? 'bg-[#3987e5] dark:bg-blue-600'
                    : 'bg-[#1c5cab] dark:bg-blue-500'

                return (
                  <span
                    key={cell.key}
                    style={{ gridColumn: cell.col, gridRow: cell.row }}
                    onMouseEnter={(e) => showTooltip(e, cell.dateStr, cell.tipText, cell.key)}
                    onMouseMove={moveTooltip}
                    onMouseLeave={hideTooltip}
                    className={`w-full aspect-square rounded-[3px] cursor-pointer transition-all duration-75 ${cellBg} ${
                      isHovered
                        ? 'outline outline-2 outline-slate-900 dark:outline-white outline-offset-1 z-10'
                        : 'hover:outline hover:outline-2 hover:outline-slate-900 dark:hover:outline-white hover:outline-offset-1'
                    }`}
                  />
                )
              })}
            </div>
          </div>

          {/* Footer matching Image 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-border-light/60 dark:border-border-dark/60">
            <div>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{heatmapData.days}</span> active days ·{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{heatmapData.total.toLocaleString()}</span> questions · longest streak{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{heatmapData.longest}</span> days
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono self-end sm:self-auto">
              <span>Less</span>
              <span className="w-3 h-3 rounded-[3px] bg-[#e6ebf2] dark:bg-slate-800 inline-block" />
              <span className="w-3 h-3 rounded-[3px] bg-[#b7d3f6] dark:bg-blue-900/60 inline-block" />
              <span className="w-3 h-3 rounded-[3px] bg-[#86b6ef] dark:bg-blue-700/80 inline-block" />
              <span className="w-3 h-3 rounded-[3px] bg-[#3987e5] dark:bg-blue-600 inline-block" />
              <span className="w-3 h-3 rounded-[3px] bg-[#1c5cab] dark:bg-blue-500 inline-block" />
              <span>More</span>
            </div>
          </div>
        </div>

      </section>

      {/* SECTION 4: TEST HISTORY TABLE WITH SORTING & REVIEW DIALOG */}
      <section className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              <span>Comprehensive Test History</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Click "Review" on any attempt to inspect question-by-question metrics.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
            {['all', 'Mock', 'PYQ'].map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyFilter === f
                    ? 'bg-card-light dark:bg-card-dark text-primary shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {f === 'all' ? 'All Tests' : `${f} Tests`}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Test Name</th>
                <th className="py-3 px-3">Type</th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setSortField('date')
                    setSortAsc(!sortAsc)
                  }}
                >
                  Date {sortField === 'date' && (sortAsc ? '↑' : '↓')}
                </th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setSortField('score')
                    setSortAsc(!sortAsc)
                  }}
                >
                  Score {sortField === 'score' && (sortAsc ? '↑' : '↓')}
                </th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setSortField('accuracy')
                    setSortAsc(!sortAsc)
                  }}
                >
                  Accuracy {sortField === 'accuracy' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-3 px-3">Time Taken</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light/60 dark:divide-border-dark/60 font-medium">
              {filteredHistory.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-850 dark:text-slate-100">
                    {t.title}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      t.type === 'PYQ' ? 'bg-indigo-500/10 text-primary' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono">
                    {t.date}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                        {t.score} / {t.maxScore}
                      </span>
                      <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(t.score / t.maxScore) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-extrabold text-emerald-500 font-mono">
                    {t.accuracy}%
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono">
                    {t.timeTaken}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedReviewTest(t)}
                      className="px-3 py-1 bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-border-light/60 dark:border-border-dark/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredHistory.length} of {DUMMY_TEST_HISTORY.length} recorded tests</span>
          <button
            onClick={() => setShowAllHistory(!showAllHistory)}
            className="font-bold text-primary hover:underline cursor-pointer"
          >
            {showAllHistory ? 'Show Fewer' : 'View All Tests'}
          </button>
        </div>
      </section>

        </div>
      )}

      {/* ========================================================= */}
      {/* BIFURCATION 2: GLOBAL PEER COMPARISON (CURRENT BOXES)      */}
      {/* ========================================================= */}
      {activeBifurcation === 'global' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Cohort Benchmarks Banner */}
          <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 block">
                  Cohort Standing ({global.cohort.totalParticipants.toLocaleString()} Test Takers)
                </span>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-black text-white">
                    {global.cohort.percentile}th
                  </span>
                  <span className="text-xl font-bold text-indigo-200">Percentile</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Rank #{global.cohort.userRank}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-200/80 max-w-lg leading-relaxed">
                  You scored higher than <strong>{Math.round((global.cohort.percentile / 100) * global.cohort.totalParticipants).toLocaleString()}</strong> aspirants across India in this paper series.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">Your Score</span>
                  <span className="text-xl font-black text-white">{global.cohort.userScore}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">Batch Average</span>
                  <span className="text-xl font-black text-indigo-200">{global.cohort.cohortAverage}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">AIR 1 Topper</span>
                  <span className="text-xl font-black text-amber-300">{global.cohort.topperScore}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Component 3: Leaderboard (Image 1) */}
          <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  <span>Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {LEADERBOARD_DATA.testName}
                </p>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setLeaderboardView('top10')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    leaderboardView === 'top10'
                      ? 'bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Top 10
                </button>
                <button
                  onClick={() => setLeaderboardView('around')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    leaderboardView === 'around'
                      ? 'bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Around you
                </button>
              </div>
            </div>

            {/* Rank Status Pill Banner matching Image 1 */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-border-light dark:border-border-dark">
                You are #{LEADERBOARD_DATA.userRank} of {LEADERBOARD_DATA.totalLearners.toLocaleString()}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                <strong>{LEADERBOARD_DATA.behindPrev}</strong> marks behind #83 · <strong>{LEADERBOARD_DATA.aheadNext}</strong> marks ahead of #85
              </span>
            </div>

            {/* Leaderboard Table View */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead>
                  <tr className="border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Learner</th>
                    <th className="py-2.5 px-3 font-mono">Score</th>
                    <th className="py-2.5 px-3 font-mono">Accuracy</th>
                    <th className="py-2.5 px-3 font-mono">Tests Taken</th>
                    <th className="py-2.5 px-3 font-mono">Streak</th>
                    <th className="py-2.5 px-3 font-mono text-right">Rank Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light/60 dark:divide-border-dark/60">
                  {(leaderboardView === 'top10' ? LEADERBOARD_DATA.top10 : LEADERBOARD_DATA.aroundYou).map((row) => {
                    const isUserRow = row.isUser
                    return (
                      <tr
                        key={row.rank}
                        className={`transition-colors ${
                          isUserRow
                            ? 'bg-primary/10 dark:bg-primary/15 font-bold border-y-2 border-primary/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="py-3 px-3">
                          {row.rank === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-500 font-black inline-flex items-center justify-center border border-amber-400/30">1</span>
                          ) : row.rank === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-300/40 text-slate-600 dark:text-slate-300 font-black inline-flex items-center justify-center border border-slate-400/30">2</span>
                          ) : row.rank === 3 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-400 font-black inline-flex items-center justify-center border border-amber-700/30">3</span>
                          ) : (
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400 pl-1.5">{row.rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-7 h-7 rounded-full text-[11px] font-black inline-flex items-center justify-center ${
                              isUserRow
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {row.initials}
                            </span>
                            <span className={isUserRow ? 'text-primary font-black' : 'font-semibold text-slate-800 dark:text-slate-200'}>
                              {row.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {row.score.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.accuracy.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.tests}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.streak} days
                        </td>
                        <td className="py-3 px-3 font-mono text-right">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            row.up ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {row.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                            <span>{row.change}</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Gap separator and sticky user row when in Top 10 view */}
              {leaderboardView === 'top10' && (
                <div className="border-t border-border-light dark:border-border-dark">
                  <div className="py-2.5 text-center text-xs text-slate-400 font-mono bg-slate-50/50 dark:bg-slate-900/30">
                    73 learners between rank 10 and you
                  </div>
                  <table className="w-full text-left text-xs min-w-[620px]">
                    <tbody>
                      <tr className="bg-primary/10 dark:bg-primary/15 font-bold border-y border-primary/30">
                        <td className="py-3 px-3 w-16">
                          <span className="font-mono font-bold text-primary pl-1.5">{LEADERBOARD_DATA.user.rank}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full text-[11px] font-black inline-flex items-center justify-center bg-primary text-white shadow-xs">
                              {LEADERBOARD_DATA.user.initials}
                            </span>
                            <span className="text-primary font-black">
                              {LEADERBOARD_DATA.user.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-primary">
                          {LEADERBOARD_DATA.user.score.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 font-mono text-primary font-bold">
                          {LEADERBOARD_DATA.user.accuracy.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono text-primary font-bold">
                          {LEADERBOARD_DATA.user.tests}
                        </td>
                        <td className="py-3 px-3 font-mono text-primary font-bold">
                          {LEADERBOARD_DATA.user.streak} days
                        </td>
                        <td className="py-3 px-3 font-mono text-right">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-500">
                            <ArrowUp size={12} />
                            <span>{LEADERBOARD_DATA.user.change}</span>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Normal Bell Curve / Score Distribution View */}
          <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-light/60 dark:border-border-dark/60">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  All-India Score Distribution (Bell Curve)
                </h3>
                <p className="text-xs text-slate-500">Distribution of {global.cohort.totalParticipants.toLocaleString()} candidates across mark brackets.</p>
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                Qualifying Cutoff: {global.cohort.qualifyingCutoffGen} M
              </span>
            </div>

            <div className="pt-6 pb-2">
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 border-b border-slate-200 dark:border-slate-800 pb-2">
                {global.bellCurveBuckets.map((b) => (
                  <div key={b.range} className="flex flex-col items-center gap-2 h-full justify-end group">
                    {b.hasUser && (
                      <span className="text-[10px] font-black text-primary bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-primary/30 animate-bounce">
                        You ({global.cohort.userScore})
                      </span>
                    )}

                    <div 
                      className={`w-full rounded-t-xl transition-all duration-300 relative ${
                        b.hasUser 
                          ? 'bg-gradient-to-t from-primary to-indigo-400 shadow-lg shadow-indigo-500/20' 
                          : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'
                      }`}
                      style={{ height: `${b.percentage * 3.5}px` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                        {b.percentage}%
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">{b.range}</span>
                      <span className="text-[9px] text-slate-400 block">{b.count} candidates</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Benchmarking vs Average & Topper */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Subject Benchmark vs Topper & Average
                </h3>
                <p className="text-xs text-slate-500">Your score vs peer cohort average vs Top 1% toppers.</p>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
                {global.subjectBenchmark.map((s) => (
                  <div key={s.name} className="p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                      <span className="font-extrabold text-emerald-500">{s.gap}</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-12 text-slate-400 font-semibold">You</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${s.userScore}%` }} />
                        </div>
                        <span className="w-8 font-bold text-slate-800 dark:text-slate-200 text-right">{s.userScore}%</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-12 text-slate-400 font-semibold">Average</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${s.cohortAvg}%` }} />
                        </div>
                        <span className="w-8 font-semibold text-slate-400 text-right">{s.cohortAvg}%</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-12 text-slate-400 font-semibold">Topper</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${s.topperAvg}%` }} />
                        </div>
                        <span className="w-8 font-bold text-amber-500 text-right">{s.topperAvg}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  IIT / IISc & PSU Admission Predictor
                </h3>
                <p className="text-xs text-slate-500">Projected qualification likelihood based on your score bracket.</p>
              </div>

              <div className="space-y-3">
                {global.admissionChances.map((c) => (
                  <div key={c.institute} className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs sm:text-sm text-slate-850 dark:text-slate-100 block">
                        {c.institute}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Cutoff threshold: ~{c.minCutoff} Marks
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-base font-black block ${
                        c.color === 'emerald' ? 'text-emerald-500' :
                        c.color === 'blue' ? 'text-blue-500' : 'text-amber-500'
                      }`}>
                        {c.probability}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Info size={16} className="text-primary shrink-0" />
                <span>Predictions update in real-time as your mock scores and cohort averages evolve.</span>
              </div>
            </div>

          </div>

          {/* GLOBAL COMPARISON ANALYTICS: WEEKLY EFFORT & QUESTIONS TO LEARN FROM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Component 1: Weekly Effort vs Cohort & Top 10% (Image 3) */}
            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <BarChart2 size={18} className="text-primary" />
                    <span>Weekly effort</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Questions solved per week, last 8 weeks
                  </p>
                </div>

                {/* Legend matching Image 3 */}
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-[3px] bg-primary inline-block" />
                    <span>You</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-1 bg-slate-800 dark:bg-slate-200 rounded-full inline-block" />
                    <span>Cohort median</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-b-2 border-dashed border-slate-400 inline-block relative -top-0.5" />
                    <span>Top 10%</span>
                  </span>
                </div>
              </div>

              {/* SVG Chart */}
              <div className="pt-2">
                <svg viewBox="0 0 600 220" className="w-full h-56 overflow-visible select-none">
                  {/* Horizontal Gridlines & Y-Axis Ticks */}
                  {[0, 100, 200, 300].map((val) => {
                    const y = 20 + (1 - val / 300) * 165
                    return (
                      <g key={val}>
                        <line
                          x1="38"
                          y1={y}
                          x2="590"
                          y2={y}
                          className="stroke-slate-100 dark:stroke-slate-800/80"
                          strokeWidth="1"
                          strokeDasharray={val === 0 ? '0' : '4,4'}
                        />
                        <text
                          x="30"
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-400 font-mono text-[10px]"
                        >
                          {val}
                        </text>
                      </g>
                    )
                  })}

                  {/* Top 10% Benchmark Dashed Trendline */}
                  <polyline
                    points={WEEKLY_EFFORT_DATA.map((d, i) => {
                      const x = 40 + i * (540 / 8) + (540 / 8) / 2
                      const y = 20 + (1 - d.top10 / 300) * 165
                      return `${x.toFixed(1)},${y.toFixed(1)}`
                    }).join(' ')}
                    fill="none"
                    className="stroke-slate-400 dark:stroke-slate-500"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />

                  {/* Top 10% Circle Nodes */}
                  {WEEKLY_EFFORT_DATA.map((d, i) => {
                    const x = 40 + i * (540 / 8) + (540 / 8) / 2
                    const y = 20 + (1 - d.top10 / 300) * 165
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3.5"
                        className="fill-white dark:fill-slate-900 stroke-slate-500 dark:stroke-slate-400"
                        strokeWidth="2"
                      />
                    )
                  })}

                  {/* Bars (You) & Median Bars */}
                  {WEEKLY_EFFORT_DATA.map((d, i) => {
                    const x = 40 + i * (540 / 8) + (540 / 8) / 2
                    const barH = (d.you / 300) * 165
                    const barY = 20 + (1 - d.you / 300) * 165
                    const medY = 20 + (1 - d.median / 300) * 165

                    return (
                      <g
                        key={d.week}
                        className="cursor-pointer group"
                        onMouseEnter={(e) => showTooltip(
                          e,
                          `Week of ${d.week}`,
                          `You ${d.you} questions · Cohort median ${d.median} · top 10% ${d.top10}`
                        )}
                        onMouseMove={moveTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {/* Transparent Hover Hit Area */}
                        <rect
                          x={x - 26}
                          y="15"
                          width="52"
                          height="180"
                          fill="transparent"
                        />

                        {/* Bar (You) */}
                        <rect
                          x={x - 14}
                          y={barY}
                          width="28"
                          height={barH}
                          rx="5"
                          className="fill-primary group-hover:fill-primary-hover transition-all duration-150"
                        />

                        {/* Cohort Median Line */}
                        <line
                          x1={x - 18}
                          y1={medY}
                          x2={x + 18}
                          y2={medY}
                          className="stroke-slate-900 dark:stroke-slate-100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />

                        {/* X-Axis Week Label */}
                        <text
                          x={x}
                          y="205"
                          textAnchor="middle"
                          className="fill-slate-400 group-hover:fill-slate-800 dark:group-hover:fill-slate-200 font-mono text-[11px] transition-colors"
                        >
                          {d.week}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-border-light/60 dark:border-border-dark/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Your effort is currently <strong>+48% above cohort median</strong>.</span>
                <span className="font-bold text-primary">Target: 250+ Qs/wk for Top 10%</span>
              </div>
            </div>

            {/* Component 2: Questions to Learn From (Image 2) */}
            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <Target size={18} className="text-primary" />
                    <span>Questions to learn from</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    How the crowd did on questions you answered
                  </p>
                </div>

                {/* Segmented Filter Pills */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
                  <button
                    onClick={() => setCrowdQuestionTab('easyMissed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      crowdQuestionTab === 'easyMissed'
                        ? 'bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Easy ones you missed
                  </button>
                  <button
                    onClick={() => setCrowdQuestionTab('beatCrowd')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      crowdQuestionTab === 'beatCrowd'
                        ? 'bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Where you beat the crowd
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="divide-y divide-border-light/60 dark:divide-border-dark/60">
                {(crowdQuestionTab === 'easyMissed' ? CROWD_QUESTIONS_DATA.easyMissed : CROWD_QUESTIONS_DATA.beatCrowd).map((item) => {
                  const isMissed = crowdQuestionTab === 'easyMissed'
                  return (
                    <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                            {item.paper}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isMissed ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {item.marks}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.subject} · {item.topic}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block">
                            {isMissed ? `${item.crowdPct}% got it right` : `Only ${item.crowdPct}% got it right`}
                          </span>
                          <div className="w-28 sm:w-32 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isMissed ? 'bg-orange-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${item.crowdPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footnote matching Image 2 */}
              <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                {crowdQuestionTab === 'easyMissed' ? (
                  <p>Most learners solved these and you did not. They are the cheapest marks to win back.</p>
                ) : (
                  <p>You solved these difficult questions while most learners stumbled. High-leverage competitive edge.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}


      {/* TEST REVIEW MODAL DIALOG                                  */}
      {/* ========================================================= */}
      {selectedReviewTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-2xl p-6 sm:p-7 space-y-5">
            
            <div className="flex items-start justify-between gap-4 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {selectedReviewTest.type} Paper Review
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {selectedReviewTest.title}
                </h3>
                <p className="text-xs text-slate-400">Attempted on {selectedReviewTest.date}</p>
              </div>

              <button
                onClick={() => setSelectedReviewTest(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Test KPI Ribbon */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border-light dark:border-border-dark text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Score</span>
                <span className="text-xl font-black text-primary">{selectedReviewTest.score} / {selectedReviewTest.maxScore}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border-light dark:border-border-dark text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">All-India Rank</span>
                <span className="text-xl font-black text-amber-500">#{selectedReviewTest.rank}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border-light dark:border-border-dark text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Duration</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-200">{selectedReviewTest.timeTaken}</span>
              </div>
            </div>

            {/* Correct vs Wrong vs Skipped Stack */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Question Outcome</span>
              <div className="flex h-3.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <div className="bg-emerald-500" style={{ width: `${(selectedReviewTest.correct / 65) * 100}%` }} />
                <div className="bg-rose-500" style={{ width: `${(selectedReviewTest.wrong / 65) * 100}%` }} />
                <div className="bg-slate-400" style={{ width: `${(selectedReviewTest.skipped / 65) * 100}%` }} />
              </div>
              <div className="flex justify-between items-center text-xs font-bold pt-1">
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {selectedReviewTest.correct} Correct
                </span>
                <span className="text-rose-500 flex items-center gap-1">
                  <XCircle size={13} /> {selectedReviewTest.wrong} Incorrect
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <MinusCircle size={13} /> {selectedReviewTest.skipped} Skipped
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-border-light/60 dark:border-border-dark/60">
              <Link
                to={selectedReviewTest.type === 'PYQ' ? '/pyq-mock' : '/mock-tests'}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl text-center shadow-md transition-all active:scale-95"
              >
                Retake Paper
              </Link>
              <button
                onClick={() => setSelectedReviewTest(null)}
                className="px-5 py-2.5 border border-border-light dark:border-border-dark bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING HOVER TOOLTIP (Matching Image 2 & HTML dashboard) */}
      {tooltip.visible && (
        <div
          style={{ transform: `translate(${tooltip.x}px, ${tooltip.y}px)` }}
          className="fixed left-0 top-0 z-50 pointer-events-none px-3 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-2xl border border-slate-700/60 max-w-[260px] leading-relaxed transition-opacity duration-75 select-none"
        >
          <div className="font-bold text-[13px] text-white leading-tight mb-0.5">{tooltip.title}</div>
          {tooltip.subtitle && (
            <div className="text-slate-300 text-xs font-normal whitespace-nowrap">{tooltip.subtitle}</div>
          )}
        </div>
      )}

    </div>
  )
}

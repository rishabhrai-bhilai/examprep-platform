import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Trophy, Calendar, CheckCircle, Clock, BookOpen, ChevronRight, Play, Bookmark, Lock, ArrowRight, Target } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import { questionPreview } from '../utils/questionPreview'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { ProblemOfTheDayCard, DiscussionStatsCard, AnalyticsLinkCard } from '../components/EngagementCards'
import { dayKey } from '../../shared/practice.js'
import { practiceSummary, subjectProgress, topicProgress, weakestTopics, recentActivity, formatDuration, timeAgo } from '../utils/practiceStats'


// ==========================================
// GATE EXAM COUNTDOWN & HIGH-YIELD TARGET FOCUS CARD (FEATURE 1)
// ==========================================
function GateExamTargetFocusCard() {
  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-gradient-to-r from-card-light via-card-light to-primary/5 dark:from-card-dark dark:via-card-dark dark:to-primary/10 shadow-soft">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Countdown & Target Score Gauge */}
        <div className="lg:col-span-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-border-light/60 dark:border-border-dark/60 pb-5 lg:pb-0 lg:pr-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Exam Countdown
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              GATE CSE 2027
            </span>
          </div>

          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-baseline gap-2">
              <span>85 Days</span>
              <span className="text-xs font-semibold text-slate-400">until Feb 14, 2027</span>
            </h3>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-slate-500 font-medium">Target: <strong className="text-slate-800 dark:text-slate-200">75.0 Marks</strong> (AIR &lt; 250)</span>
              <span className="text-emerald-500 font-bold">Predicted: 71.5 Marks (95%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '95.3%' }} />
            </div>
          </div>
        </div>

        {/* Right: Today's 3 Recommended High-Yield Focus Actions */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today&apos;s High-Yield Focus
            </span>
            <span className="text-[11px] text-primary font-semibold">Priority Topics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Link
              to="/pyq"
              className="p-3 rounded-xl border border-border-light dark:border-border-dark bg-card-light/60 dark:bg-card-dark/60 hover:border-primary/50 hover:bg-primary/5 transition-all group block"
            >
              <span className="text-[10px] uppercase font-bold text-indigo-500 block">Algorithms</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                Dynamic Programming
              </p>
              <span className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>5 NAT questions</span>
                <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </Link>

            <Link
              to="/mock-tests"
              className="p-3 rounded-xl border border-border-light dark:border-border-dark bg-card-light/60 dark:bg-card-dark/60 hover:border-primary/50 hover:bg-primary/5 transition-all group block"
            >
              <span className="text-[10px] uppercase font-bold text-teal-500 block">Operating Systems</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                Virtual Memory &amp; Paging
              </p>
              <span className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Sectional mock</span>
                <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </Link>

            <Link
              to="/pyq-mock"
              className="p-3 rounded-xl border border-border-light dark:border-border-dark bg-card-light/60 dark:bg-card-dark/60 hover:border-primary/50 hover:bg-primary/5 transition-all group block"
            >
              <span className="text-[10px] uppercase font-bold text-purple-500 block">GATE Simulation</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                GATE 2024 (Set 1)
              </p>
              <span className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Next unattempted</span>
                <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DAILY PRACTICE GOAL & SPEED PACING CARD (FEATURE 2)
// ==========================================
function DailyStudyGoalCard() {
  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
      <div className="flex justify-between items-baseline">
        <div className="space-y-0.5">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
            Daily Goal &amp; Pacing Diagnostics
          </h3>
          <p className="text-xs text-slate-500">
            Keep your momentum alive with targeted daily reps.
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          On Track
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Daily Question Target */}
        <div className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/60 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Daily Target</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">24 / 30</span>
            <span className="text-xs font-bold text-emerald-500">80% Done</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '80%' }} />
          </div>
          <span className="text-[10px] text-slate-400 block">6 questions left today</span>
        </div>

        {/* Avg Pace */}
        <div className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/60 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Avg Time / Q</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">2m 14s</span>
            <span className="text-xs font-bold text-emerald-500">Optimal</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '74%' }} />
          </div>
          <span className="text-[10px] text-slate-400 block">Under 2m 45s benchmark</span>
        </div>

        {/* Quick Launch Action */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-primary block tracking-wider">Quick Speed Sprint</span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
              5 Rapid Questions (10m)
            </p>
          </div>
          <Link
            to="/pyq"
            className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 text-center"
          >
            <span>Start Speed Sprint</span>
            <Play size={12} className="fill-white" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// OFFICIAL PYQ PAPER COVERAGE CARD (IMAGE 2)
// ==========================================
function OfficialPyqCoverageCard() {
  const papers = [
    { year: '2014', score: '62M', completed: true },
    { year: '2015', score: '64.5M', completed: true },
    { year: '2016', score: '68M', completed: true },
    { year: '2017', score: '71M', completed: true },
    { year: '2018', score: '65.5M', completed: true },
    { year: '2019', score: '66M', completed: true },
    { year: '2020', score: '71.5M', completed: true },
    { year: '2021', score: '73M', completed: true },
    { year: '2022', score: '75.5M', completed: true },
    { year: '2023', score: '89M', completed: true },
    { year: '2024', score: 'Pending', completed: false },
    { year: '2025', score: 'Pending', completed: false },
    { year: '2026', score: 'Pending', completed: false },
  ];

  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Official PYQ Paper Coverage
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            10 of 13 official GATE CS exam papers completed (77%).
          </p>
        </div>

        {/* Completion Bar on right of header */}
        <div className="w-full sm:w-64 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">Completion</span>
            <span className="text-primary font-black">77%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '77%' }} />
          </div>
        </div>
      </div>

      {/* Year Badges Grid (Spacious responsive row/grid) */}
      <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-2.5 pt-1">
        {papers.map((p) => (
          <div
            key={p.year}
            className={`p-2.5 rounded-xl text-center border transition-all ${
              p.completed
                ? 'bg-primary/5 dark:bg-primary/10 border-primary/25 hover:border-primary text-slate-900 dark:text-slate-100 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 text-slate-400'
            }`}
          >
            <span className="block text-xs font-extrabold leading-tight">{p.year}</span>
            <span className={`block text-[11px] mt-1 font-bold ${p.completed ? 'text-primary' : 'text-slate-400'}`}>
              {p.score}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Next Recommended: <strong className="text-slate-700 dark:text-slate-300">GATE 2024 (Set 1)</strong>
        </span>
        <Link
          to="/pyq-mock"
          className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <span>Start Paper</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// STUDY ACTIVITY 26-WEEK HEATMAP CARD (IMAGE 2)
// With unclipped hover tooltip and live header indicator
// ==========================================
function StudyActivityHeatmapCard() {
  const [hoveredCell, setHoveredCell] = useState(null);

  const heatmap = useMemo(() => {
    const matrix = [];
    const baseDate = new Date(2026, 10, 6); // 6 Nov 2026
    
    const weeklyPatterns = [
      [0, 1, 0, 0, 2, 0, 0], [2, 0, 0, 3, 0, 1, 0], [0, 0, 0, 0, 2, 0, 0], [0, 4, 0, 0, 0, 0, 0],
      [0, 0, 0, 5, 0, 0, 0], [0, 0, 8, 0, 0, 0, 0], [0, 0, 0, 0, 4, 0, 0], [0, 0, 0, 0, 0, 6, 0],
      [0, 0, 10, 0, 0, 0, 0], [0, 0, 0, 8, 0, 12, 0], [0, 0, 0, 0, 0, 0, 0], [12, 0, 0, 0, 8, 0, 0], [0, 5, 0, 0, 0, 10, 0],
      [8, 10, 0, 0, 0, 9, 0], [0, 0, 16, 0, 8, 0, 0], [0, 0, 0, 12, 0, 0, 0], [10, 0, 0, 0, 11, 0, 12],
      [0, 0, 8, 0, 12, 0, 0], [12, 10, 0, 0, 0, 10, 0], [9, 0, 0, 20, 0, 0, 0], [0, 12, 0, 0, 8, 0, 0],
      [11, 0, 15, 0, 12, 0, 0], [18, 12, 0, 16, 0, 0, 0], [0, 16, 12, 0, 11, 0, 0], [12, 18, 15, 11, 0, 20, 0],
      [15, 20, 16, 14, 12, 18, 0]
    ];

    for (let w = 0; w < 26; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const daysAgo = (25 - w) * 7 + (6 - d);
        const cellDate = new Date(baseDate);
        cellDate.setDate(cellDate.getDate() - daysAgo);
        const count = weeklyPatterns[w]?.[d] ?? 0;
        col.push({
          dateStr: cellDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          count
        });
      }
      matrix.push(col);
    }
    return matrix;
  }, []);

  const getColorClass = (count) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800/80';
    if (count <= 4) return 'bg-blue-200 dark:bg-blue-950/70';
    if (count <= 9) return 'bg-blue-400 dark:bg-blue-700';
    if (count <= 15) return 'bg-blue-600 dark:bg-blue-500';
    return 'bg-blue-800 dark:bg-blue-400';
  };

  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
            Study activity
          </h3>
          <p className="text-xs text-slate-500">
            Questions solved per day, last 26 weeks
          </p>
        </div>

        {/* Live Hover Status Indicator: 100% visible, never cut off */}
        <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark self-start sm:self-auto min-h-[32px] flex items-center">
          {hoveredCell ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <strong className="text-primary">{hoveredCell.count} questions solved</strong> on {hoveredCell.dateStr}
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">Hover over any square to see details</span>
          )}
        </div>
      </div>

      {/* Heatmap Grid with generous headroom so tooltips are never clipped */}
      <div className="overflow-x-auto pt-6 pb-2 scrollbar-none">
        <div className="min-w-[620px]">
          {/* Months row */}
          <div className="flex justify-between pl-7 pr-3 text-[11px] font-semibold text-slate-400 mb-2">
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
          </div>

          {/* Matrix with Mon/Wed/Fri labels */}
          <div className="flex gap-3">
            <div className="flex flex-col justify-between text-[10px] font-semibold text-slate-400 py-0.5 h-[112px]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="flex-1 flex gap-2">
              {heatmap.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-2 flex-1">
                  {week.map((cell, dIdx) => (
                    <div
                      key={dIdx}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${cell.count} questions solved on ${cell.dateStr}`}
                      className="relative group/cell cursor-pointer"
                    >
                      <div
                        className={`h-3.5 w-full rounded-[3px] transition-all hover:scale-125 hover:ring-2 hover:ring-primary ${getColorClass(cell.count)}`}
                      />

                      {/* Tooltip positioned above cell with shadow */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap">
                        <div className="px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold shadow-xl border border-slate-700/60">
                          {cell.count > 0 ? `${cell.count} questions solved` : 'No activity'}
                          <span className="block text-[9px] text-slate-400 font-normal">{cell.dateStr}</span>
                        </div>
                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700/60" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          <strong className="text-slate-800 dark:text-slate-200">92 active days</strong> · <strong className="text-slate-800 dark:text-slate-200">2,668 questions</strong> · longest streak <strong className="text-slate-800 dark:text-slate-200">12 days</strong>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Less</span>
          <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-200 dark:bg-blue-950/70" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-400 dark:bg-blue-700" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-600 dark:bg-blue-500" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-800 dark:bg-blue-400" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPREHENSIVE TEST HISTORY CARD (IMAGE 3)
// ==========================================
function ComprehensiveTestHistoryCard() {
  const [filter, setFilter] = useState('all');

  const tests = [
    { id: 't-1', name: 'GATE 2021 Set 1 Paper', type: 'PYQ', date: '29 Oct 2026', score: 73, maxScore: 100, accuracy: '81%', time: '2h 58m', link: '/pyq-mock' },
    { id: 't-2', name: 'All-India Mock Test #6', type: 'Mock', date: '28 Oct 2026', score: 68, maxScore: 100, accuracy: '78.5%', time: '2h 50m', link: '/mock-tests' },
    { id: 't-3', name: 'GATE 2020 Official Paper', type: 'PYQ', date: '25 Oct 2026', score: 71.5, maxScore: 100, accuracy: '80%', time: '2h 54m', link: '/pyq-mock' },
    { id: 't-4', name: 'All-India Mock Test #5', type: 'Mock', date: '24 Oct 2026', score: 71, maxScore: 100, accuracy: '79%', time: '2h 56m', link: '/mock-tests' },
    { id: 't-5', name: 'GATE 2023 Official Paper', type: 'PYQ', date: '05 Nov 2026', score: 89, maxScore: 100, accuracy: '92.5%', time: '2h 48m', link: '/pyq-mock' },
    { id: 't-6', name: 'All-India Mock Test #8', type: 'Mock', date: '03 Nov 2026', score: 73, maxScore: 100, accuracy: '82.5%', time: '2h 55m', link: '/mock-tests' },
  ];

  const filtered = tests.filter(t => {
    if (filter === 'mock') return t.type === 'Mock';
    if (filter === 'pyq') return t.type === 'PYQ';
    return true;
  });

  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={16} />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Comprehensive Test History
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Click &quot;Review&quot; on any attempt to inspect question-by-question metrics.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-border-light dark:border-border-dark self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Tests' },
            { id: 'mock', label: 'Mock Tests' },
            { id: 'pyq', label: 'PYQ Tests' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="pb-3 pr-4">Test Name</th>
              <th className="pb-3 px-3">Type</th>
              <th className="pb-3 px-3">Date ↓</th>
              <th className="pb-3 px-3">Score</th>
              <th className="pb-3 px-3">Accuracy</th>
              <th className="pb-3 px-3">Time Taken</th>
              <th className="pb-3 pl-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light/60 dark:divide-border-dark/60 text-xs">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {t.name}
                </td>
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide ${
                    t.type === 'PYQ'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {t.type}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                  {t.date}
                </td>
                <td className="py-3.5 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{t.score} / {t.maxScore}</span>
                    <div className="h-1.5 w-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(t.score / t.maxScore) * 100}%` }} />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 font-bold text-emerald-500 whitespace-nowrap">
                  {t.accuracy}
                </td>
                <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                  {t.time}
                </td>
                <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                  <Link
                    to={t.link}
                    className="px-3 py-1 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all text-xs inline-flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span>Review</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex items-center justify-between text-xs text-slate-400">
        <span>Showing {filtered.length} of {tests.length} recorded tests</span>
        <Link to="/mock-tests" className="font-bold text-primary hover:underline">
          View All Tests
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore()
  const { bookmarks, questions, practice } = useAppStore()

  const summary = useMemo(() => practiceSummary(practice), [practice])
  const subjects = useMemo(() => subjectProgress(practice, questions), [practice, questions])
  const weakTopics = useMemo(() => weakestTopics(topicProgress(practice, questions)), [practice, questions])
  const activity = useMemo(() => {
    let mocks = []
    try {
      mocks = [
        ...JSON.parse(localStorage.getItem('gate_mock_history') || '[]'),
        ...JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]')
      ]
    } catch (e) {
      mocks = []
    }
    return recentActivity(practice, questions, mocks)
  }, [practice, questions])

  // --- GATED ACCESS VIEW FOR GUESTS ---
  if (!isAuthenticated) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-[80vh] flex flex-col justify-center items-center">
        <div className="w-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft p-8 sm:p-10 text-center space-y-6">
          <div className="inline-flex p-4 rounded-3xl bg-primary/10 dark:bg-primary/20 text-primary ring-8 ring-primary/5">
            <Lock size={32} className="text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
              Register / Login to access your Dashboard
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Your personal dashboard tracks your preparation momentum, daily study streaks, subject-wise analytics, and custom recommendations.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-left space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Flame size={16} className="text-orange-500 shrink-0" />
              <span>Track your daily study streak and active learning momentum</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <span>Real-time accuracy and solved questions breakdown by subject</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <BookOpen size={16} className="text-primary shrink-0" />
              <span>Personalized topic suggestions and recent practice history</span>
            </div>
          </div>

          <div className="space-y-3 pt-2 max-w-sm mx-auto">
            <GoogleSignInButton text="Sign in with Google" />

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/login"
                state={{ from: '/dashboard' }}
                className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-btn transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Log In</span>
                <ArrowRight size={13} />
              </Link>

              <Link
                to="/signup"
                state={{ from: '/dashboard' }}
                className="h-10 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-btn transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
              >
                <span>Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { solved, attempted, accuracy, practiceSec } = summary
  // The server's streak also counts Problem of the Day and discussion days
  const streak = Math.max(summary.streak, user?.streak || 0)
  const longestStreak = Math.max(summary.longestStreak, user?.longestStreak || 0)
  const hasPractice = attempted > 0
  const answeredToday = practice.days[dayKey()]?.attempts || 0

  // Find bookmarked questions details
  const bookmarkedItems = questions.filter(q => bookmarks.some(id => String(id) === String(q.id)))

  const statCards = [
    { label: 'Questions Solved', value: solved, sub: hasPractice ? `of ${attempted} attempted` : 'None yet', icon: CheckCircle, tone: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Accuracy', value: accuracy === null ? '—' : `${accuracy}%`, sub: hasPractice ? 'of all answers' : 'Answer a question to see it', icon: Target, tone: 'bg-amber-500/10 text-amber-500' },
    { label: 'Practice Time', value: formatDuration(practiceSec), sub: hasPractice ? 'on answered questions' : 'Starts with your first answer', icon: Clock, tone: 'bg-blue-500/10 text-blue-500' },
    { label: 'Saved Bookmarks', value: bookmarkedItems.length, sub: bookmarkedItems.length ? 'questions saved' : 'None yet', icon: Bookmark, tone: 'bg-indigo-500/10 text-indigo-500', to: '/bookmarks' }
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark">

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
            Welcome back, {user?.name || 'Aspirant'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {!hasPractice
              ? 'Answer your first question to start tracking your progress.'
              : answeredToday > 0
                ? `You've answered ${answeredToday} question${answeredToday === 1 ? '' : 's'} today. Keep your momentum going.`
                : streak > 0
                  ? 'Answer a question today to keep your streak alive.'
                  : 'Answer a question today to start a new streak.'}
          </p>
        </div>

        {/* Streak Counter */}
        <div
          className={`flex items-center gap-3 px-4 py-2.5 rounded-btn border self-start md:self-auto ${
            streak > 0
              ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-500'
              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
          title={longestStreak > 0 ? `Longest streak: ${longestStreak} day${longestStreak === 1 ? '' : 's'}` : 'Days in a row with study activity: answering questions, the Problem of the Day or posting in discussions'}
        >
          <Flame size={20} className={streak > 0 ? 'fill-orange-500' : ''} />
          <div className="text-left">
            <span className="block text-xs font-bold leading-none uppercase">Daily Streak</span>
            <span className="text-lg font-extrabold leading-none mt-1 inline-block">{streak} {streak === 1 ? 'Day' : 'Days'}</span>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map(({ label, value, sub, icon: Icon, tone, to }) => {
          const Card = to ? Link : 'div'
          return (
          <Card key={label} {...(to ? { to } : {})} className={`p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex items-center gap-4 ${to ? 'hover:border-primary/40 transition-colors' : ''}`}>
            <div className={`h-12 w-12 rounded-btn flex items-center justify-center shrink-0 ${tone}`}>
              <Icon size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-400 font-bold uppercase">{label}</span>
              <p className="text-2xl font-extrabold mt-0.5">{value}</p>
              <p className="text-[10px] text-slate-400 truncate">{sub}</p>
            </div>
          </Card>
          )
        })}
      </div>

      {/* GATE 2027 Countdown & High-Yield Target Focus Card (NEW USEFUL FEATURE) */}
      <GateExamTargetFocusCard />

      {/* Official PYQ Paper Coverage (Standalone Separate Card) */}
      <OfficialPyqCoverageCard />

      {/* Study Activity Heatmap (Standalone Separate Card, Flawless Hovering) */}
      <StudyActivityHeatmapCard />

      {/* Progress & Activities Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Subject Progress & Practice Actions */}
        <div className="lg:col-span-2 space-y-6">
          


          {/* Daily Study Goal & Pacing Diagnostics Card (NEW USEFUL FEATURE) */}
          <DailyStudyGoalCard />

          {/* Subject Completion Rates */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Subject-wise Completion</h3>
              {hasPractice && (
                <span className="text-[10px] text-slate-400 font-semibold">Solved / questions in the bank</span>
              )}
            </div>

            {!hasPractice ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 space-y-2">
                <p>No questions answered yet. Your progress in each subject will show up here.</p>
                <Link to="/pyq" className="text-primary font-semibold hover:underline">Start practising PYQs</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map((sub) => {
                  const solvedPct = sub.total ? (sub.solved / sub.total) * 100 : 0
                  const attemptedPct = sub.total ? (sub.attempted / sub.total) * 100 : 0
                  return (
                    <div key={sub.subject} className="space-y-1.5">
                      <div className="flex justify-between gap-3 text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-400 truncate">{sub.subject}</span>
                        <span className="text-text-primary-light dark:text-text-primary-dark shrink-0">
                          {sub.solved}/{sub.total} ({Math.round(solvedPct)}%)
                        </span>
                      </div>
                      {/* Solved drawn over attempted */}
                      <div
                        className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
                        title={`${sub.attempted} attempted, ${sub.solved} solved`}
                      >
                        <div className="absolute inset-y-0 left-0 bg-primary/25 rounded-full" style={{ width: `${attemptedPct}%` }}></div>
                        <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${solvedPct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex gap-4 pt-1 text-[10px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-full bg-primary"></span>Solved</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-full bg-primary/25"></span>Attempted</span>
                </div>
              </div>
            )}
          </div>

          {/* Topics that need work */}
          {weakTopics.length > 0 && (
            <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex justify-between items-baseline gap-3">
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Topics to Revisit</h3>
                <span className="text-[10px] text-slate-400 font-semibold">Most misses among what you tried</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {weakTopics.map((t) => (
                  <div key={`${t.subject}::${t.topic}`} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{t.topic}</p>
                      <p className="text-[10px] text-slate-400 truncate">{t.subject}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-text-primary-light dark:text-text-primary-dark">{t.solved}/{t.attempted} solved</p>
                      <p className="text-[10px] text-slate-400">{t.total} in bank</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Recent Activity & Saved Bookmarks */}
        <div className="space-y-6">
          <ProblemOfTheDayCard />
          <AnalyticsLinkCard />
          <DiscussionStatsCard />

          {/* Recent Activity */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Recent Activity</h3>
            
            {activity.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                Nothing yet. Questions you answer and mock tests you finish will appear here.
              </div>
            ) : (
              <div className="space-y-3.5">
                {activity.map((act) => (
                  <div key={`${act.kind}-${act.time}-${act.title}`} className="flex items-start gap-3 text-xs border-b border-slate-100 dark:border-slate-800/40 pb-3 last:border-b-0 last:pb-0">
                    <div className={`h-6 w-1 rounded-full shrink-0 mt-0.5 ${act.kind === 'mock' ? 'bg-primary' : act.correct ? 'bg-success' : 'bg-error'}`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{act.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 min-w-0">
                        {act.detail && <span className="truncate">{act.detail}</span>}
                        {act.detail && <span>•</span>}
                        <span className="shrink-0">{timeAgo(act.time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookmarked Questions Preview */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Bookmarked PYQs</h3>
              <Link to="/bookmarks" className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-0.5">
                <span>View All</span>
                <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="space-y-2">
              {bookmarkedItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                  No bookmarked questions yet.
                </div>
              ) : (
                bookmarkedItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to="/pyq"
                    className="p-2.5 block rounded-btn bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-text-primary-light dark:text-text-primary-dark font-medium truncate"
                  >
                    {questionPreview(item.question)}
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* IMAGE 3: Comprehensive Test History */}
      <ComprehensiveTestHistoryCard />
    </div>
  )
}

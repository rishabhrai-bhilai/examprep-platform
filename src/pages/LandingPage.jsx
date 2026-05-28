import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Calculator, MessageSquare, ShieldCheck, Flame, Users, Play, Award } from 'lucide-react'

export default function LandingPage() {
  const features = [
    {
      title: "Reels-Style PYQ Practice",
      desc: "Practice previous year questions one-at-a-time. Swipe up/down for a clean distraction-free Reels interface.",
      icon: Flame,
      color: "text-orange-500 bg-orange-500/10"
    },
    {
      title: "Draggable Scientific Calculator",
      desc: "Fully functional scientific calculator with trigonometry, log functions, and memory, easily accessible anytime.",
      icon: Calculator,
      color: "text-blue-500 bg-blue-500/10"
    },
    {
      title: "Peer Discussions & Threads",
      desc: "Clear your doubts with peer upvotes, nested answers, and active chat discussion drawers on every question.",
      icon: MessageSquare,
      color: "text-emerald-500 bg-emerald-500/10"
    },
    {
      title: "Self-Timed Mock Exams",
      desc: "Simulate real exam pressures with timed mock tests, live scoring, question flags, and analytical summaries.",
      icon: Award,
      color: "text-indigo-500 bg-indigo-500/10"
    }
  ]

  const stats = [
    { label: "Practice Questions", value: "10,000+" },
    { label: "Active Aspirants", value: "50,000+" },
    { label: "Success Rate", value: "98.7%" },
    { label: "Mock Exam Templates", value: "120+" }
  ]

  return (
    <div className="bg-bg-light dark:bg-bg-dark text-slate-800 dark:text-slate-100 min-h-screen transition-colors duration-200">
      
      {/* Navigation Header for Landing Page */}
      <nav className="h-16 px-6 md:px-12 border-b border-border-light dark:border-border-dark flex items-center justify-between sticky top-0 bg-card-light/95 dark:bg-card-dark/95 backdrop-blur-md z-40">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <BookOpen className="text-primary" size={24} />
          <span>Exam<span className="text-primary">Prep</span></span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-btn transition-colors shadow-sm"
          >
            Start Practice
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none"></div>

        <span className="px-3.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase bg-indigo-50 dark:bg-indigo-950/40 rounded-full mb-6">
          Next-Gen Exam Prep Experience
        </span>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl text-text-primary-light dark:text-text-primary-dark leading-tight">
          Master Your Exams with <span className="text-primary bg-gradient-to-r from-indigo-500 to-blue-500 bg-clip-text text-transparent">Distraction-Free</span> Practice
        </h1>
        
        <p className="mt-6 text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Unlock a Reels-inspired question practicing layout, attempt realistic timed mock tests, write study notes alongside video explanations, and join peer discussions.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/pyq"
            className="w-full sm:w-auto h-12 px-6 flex items-center justify-center gap-2 rounded-btn bg-primary text-white font-semibold hover:bg-primary-hover shadow-md transition-all active:scale-95 hover:gap-3"
          >
            <span>Practice PYQs Now</span>
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/mock-tests"
            className="w-full sm:w-auto h-12 px-6 flex items-center justify-center gap-2 rounded-btn border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
          >
            Attempt Mock Tests
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="border-y border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/30 py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-primary">{stat.value}</p>
              <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Cards */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
            Why ExamPrep Stands Out
          </h2>
          <p className="text-sm text-slate-500 mt-3">
            Traditional platforms are cluttered and slow. We redesigned the learning experience to be content-first and fully mobile-friendly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="p-6 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all flex gap-4"
              >
                <div className={`h-12 w-12 rounded-btn flex items-center justify-center shrink-0 ${feature.color}`}>
                  <Icon size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-base text-text-primary-light dark:text-text-primary-dark">{feature.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 md:px-12 bg-primary/5 border-y border-primary/10">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary-light dark:text-text-primary-dark leading-tight">
            Ready to Ace Your Upcoming Exams?
          </h2>
          <p className="text-sm md:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            Create a free profile to track your streak, bookmark difficult questions, and access detailed video analysis.
          </p>
          <div className="pt-4">
            <Link
              to="/signup"
              className="inline-flex h-12 px-8 items-center justify-center font-bold text-white bg-primary hover:bg-primary-hover rounded-btn shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              Sign Up For Free
            </Link>
          </div>
        </div>
      </section>

      {/* Landing Footer */}
      <footer className="border-t border-border-light dark:border-border-dark py-12 px-6 md:px-12 bg-card-light dark:bg-card-dark">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary" size={20} />
            <span className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">
              Exam<span className="text-primary">Prep</span> Platform
            </span>
          </div>
          
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} ExamPrep. Designed for premium distraction-free learning.
          </p>
        </div>
      </footer>

    </div>
  )
}

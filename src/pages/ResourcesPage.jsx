import React from 'react'
import { Library, Download, ExternalLink, FileText, CheckCircle2 } from 'lucide-react'
import { RESOURCES } from '../data/resources'

// Free PDFs (strategy guides, formula sheets, ...) anyone can read or download.
export default function ResourcesPage() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 bg-bg-light dark:bg-bg-dark font-sans">
      <div className="border-b border-slate-100 dark:border-slate-800/40 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Library className="text-primary" size={24} />
          <span>Free Resources</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Guides and PDFs for GATE CSE preparation. Free to read and download.
        </p>
      </div>

      <div className="space-y-6">
        {RESOURCES.map(r => (
          <article
            key={r.id}
            className="rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft overflow-hidden flex flex-col md:flex-row"
          >
            <a
              href={r.file}
              target="_blank"
              rel="noopener noreferrer"
              className="md:w-64 shrink-0 bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-5 group"
              title={`Open ${r.title}`}
            >
              <img
                src={r.cover}
                alt={`Cover of ${r.title}`}
                loading="lazy"
                className="w-40 md:w-full max-w-[220px] rounded-md shadow-lg ring-1 ring-black/5 group-hover:scale-[1.02] transition-transform"
              />
            </a>

            <div className="flex-1 p-5 md:p-6 flex flex-col gap-4 min-w-0">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">{r.category}</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <FileText size={12} />
                    PDF · {r.pages} pages · {r.sizeMb} MB
                  </span>
                  <span className="text-slate-400">Updated {r.updated}</span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{r.title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{r.description}</p>
              </div>

              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {r.highlights.map(h => (
                  <li key={h} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-1.5">
                {r.tags.map(t => (
                  <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border-light dark:border-border-dark text-slate-500">
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-auto pt-1">
                <a
                  href={r.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <ExternalLink size={14} />
                  <span>Read online</span>
                </a>
                <a
                  href={r.file}
                  download
                  className="h-10 px-4 border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 hover:border-primary/40 hover:text-primary font-bold text-xs rounded-btn flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="text-[11px] text-slate-400">
        More guides are on the way. Resources are independent study aids, not affiliated with GATE or the organising institutes.
      </p>
    </div>
  )
}

// Builds the GATE CSE 2027 PYQ Playbook (public/resources/) as HTML from the
// question bank. Every number and chart is computed from src/data/questions.json;
// the study notes are in content.mjs and the design in style.css.
//
//   node scripts/playbook/build.mjs [out.html]
//
// Then print the HTML to PDF with headless Chrome or Edge (A4, no margins):
//   chrome --headless=new --no-pdf-header-footer --virtual-time-budget=15000 //     --print-to-pdf=public/resources/GATE-CSE-2027-PYQ-Playbook.pdf file:///<abs path>/playbook.html
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { SUBJECT_NOTES, CHECKLIST } from './content.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const outFile = process.argv[2] || 'playbook.html'
const Q = JSON.parse(fs.readFileSync(path.join(repo, 'src/data/questions.json'), 'utf8'))
const { SYLLABUS_CHAPTERS } = await import(pathToFileURL(path.join(repo, 'shared/syllabusChapters.js')).href)

// ---------- papers ----------
const parseSet = (s) => (typeof s === 'string' ? Number((s.match(/\d+/) || [1])[0]) : Number(s) || 1)
const paperKey = (q) => `${q.year}-${parseSet(q.set)}`
const byPaper = new Map()
Q.forEach(q => {
  if (+q.year < 2010) return // 2007-09 used a different format (no aptitude, 150 marks)
  const k = paperKey(q)
  if (!byPaper.has(k)) byPaper.set(k, { key: k, year: +q.year, set: parseSet(q.set), qs: [] })
  byPaper.get(k).qs.push(q)
})
const PAPERS = [...byPaper.values()].sort((a, b) => a.year - b.year || a.set - b.set)
PAPERS.forEach(p => {
  p.multi = PAPERS.filter(o => o.year === p.year).length > 1
  p.label = p.multi ? `${p.year} S${p.set}` : `${p.year}`
  p.short = `'${String(p.year).slice(2)}${p.multi ? ` S${p.set}` : ''}`
  p.top = `'${String(p.year).slice(2)}`
  p.sub = p.multi ? `S${p.set}` : ''
})
const N = PAPERS.length
const RECENT = PAPERS.filter(p => p.year >= 2024)
const MODERN = PAPERS.filter(p => p.year >= 2018)
const ERAS = [
  { name: '2010-17', papers: PAPERS.filter(p => p.year <= 2017) },
  { name: '2018-23', papers: PAPERS.filter(p => p.year >= 2018 && p.year <= 2023) },
  { name: '2024-26', papers: RECENT }
]

// ---------- subjects ----------
const COLORS = {
  'Engineering Mathematics': '#7c3aed', 'Discrete Mathematics': '#c026d3',
  'Computer Organization & Architecture': '#2563eb', 'Programming & Data Structures': '#0891b2',
  Algorithms: '#ea580c', 'Computer Networks': '#16a34a', Databases: '#ca8a04',
  'Operating Systems': '#dc2626', 'Theory of Computation': '#db2777', 'Compiler Design': '#4f46e5',
  'Digital Logic': '#78716c', 'Software Engineering & Web Technologies': '#94a3b8', 'General Aptitude': '#0d9488'
}
const TECH = Object.keys(SUBJECT_NOTES).filter(s => s !== 'General Aptitude')
const SE = 'Software Engineering & Web Technologies'
const marksIn = (p, subject) => p.qs.filter(q => q.subject === subject).reduce((s, q) => s + (Number(q.marks) || 0), 0)
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
const sd = (a) => { const m = avg(a); return Math.sqrt(avg(a.map(x => (x - m) ** 2))) }
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1)
const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2)
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const stats = {}
;[...TECH, SE, 'General Aptitude'].forEach(s => {
  const series = PAPERS.map(p => marksIn(p, s))
  const recent = avg(RECENT.map(p => marksIn(p, s)))
  const all = avg(series)
  const min = Math.min(...series); const max = Math.max(...series)
  stats[s] = {
    series, recent, all, sd: sd(series), min, max,
    minAt: PAPERS.filter((p, i) => series[i] === min).map(p => p.short),
    maxAt: PAPERS.filter((p, i) => series[i] === max).map(p => p.short),
    eras: ERAS.map(e => avg(e.papers.map(p => marksIn(p, s)))),
    asked: series.filter(x => x > 0).length,
    last: [...PAPERS].reverse().find((p, i) => series[N - 1 - i] > 0)?.label || '-'
  }
})
const ranked = [...TECH].sort((a, b) => stats[b].recent - stats[a].recent || stats[b].all - stats[a].all)
const TIER = {}
ranked.forEach((s, i) => { TIER[s] = i < 3 ? 1 : i < 7 ? 2 : 3 })
TIER['General Aptitude'] = 0
const tierLabel = (t) => (t === 0 ? 'Fixed 15 marks' : t === 1 ? 'Tier 1 · Critical' : t === 2 ? 'Tier 2 · High' : 'Tier 3 · Steady')
const tierClass = (t) => `tier tier${t}`
const totalRecent = TECH.reduce((s, x) => s + stats[x].recent, 0)

// ---------- chapters ----------
const chaptersOf = (s) => (SYLLABUS_CHAPTERS[s] || []).map(c => c.name)
const chapterCount = (p, s, ch) => p.qs.filter(q => (q.tags || []).some(t => t.subject === s && t.topic === ch)).length
const chapterRows = (s) => chaptersOf(s).map(ch => {
  const modern = MODERN.map(p => chapterCount(p, s, ch))
  const early = PAPERS.filter(p => p.year < 2018).map(p => chapterCount(p, s, ch))
  return {
    name: ch, modern, appeared: modern.filter(x => x > 0).length,
    totalModern: modern.reduce((a, b) => a + b, 0), totalEarly: early.reduce((a, b) => a + b, 0),
    earlyAppeared: early.filter(x => x > 0).length
  }
})
// Finer topics (GATE Overflow tags) asked since 2018
const topTopics = (s, n = 8) => {
  const m = new Map()
  MODERN.forEach(p => p.qs.forEach(q => (q.topicTags || []).forEach(t => {
    if (t.subject !== s) return
    const e = m.get(t.topic) || { topic: t.topic, n: 0, papers: new Set() }
    e.n++; e.papers.add(p.key); m.set(t.topic, e)
  })))
  return [...m.values()].sort((a, b) => b.n - a.n || b.papers.size - a.papers.size).slice(0, n)
}

// ---------- question types ----------
const typeMix = PAPERS.filter(p => p.year >= 2014).map(p => {
  const c = { MCQ: 0, MSQ: 0, NAT: 0 }
  p.qs.forEach(q => { c[q.type] = (c[q.type] || 0) + 1 })
  return { p, ...c }
})
const natBlocks = MODERN.map(p => ({
  p,
  one: p.qs.filter(q => q.type === 'NAT' && +q.marks === 1).length,
  two: p.qs.filter(q => q.type === 'NAT' && +q.marks === 2).length
}))

// ---------- drawing helpers ----------
const heatCell = (v, lo, hi, color = '79,70,229') => {
  const t = hi > lo ? (v - lo) / (hi - lo) : 0.5
  const a = 0.08 + t * 0.82
  return `<td class="hc" style="background:rgba(${color},${a.toFixed(2)});color:${a > 0.55 ? '#fff' : '#1e1b4b'}">${v}</td>`
}
const hexRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',')
const dot = (s) => `<span class="dot" style="background:${COLORS[s]}"></span>`

function barChart(s, w = 640, h = 170) {
  const series = stats[s].series
  const top = Math.max(10, Math.ceil(Math.max(...series) / 5) * 5)
  const pad = { l: 26, r: 6, t: 10, b: 34 }
  const iw = w - pad.l - pad.r; const ih = h - pad.t - pad.b
  const bw = iw / N
  const y = (v) => pad.t + ih - (v / top) * ih
  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">`
  for (let g = 0; g <= top; g += 5) svg += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(g)}" y2="${y(g)}" stroke="#e2e8f0"/><text x="${pad.l - 6}" y="${y(g) + 3}" font-size="9" text-anchor="end" fill="#64748b">${g}</text>`
  series.forEach((v, i) => {
    const p = PAPERS[i]; const x = pad.l + i * bw + 2
    const recent = p.year >= 2024
    svg += `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${(pad.t + ih - y(v)).toFixed(1)}" rx="2" fill="${COLORS[s]}" fill-opacity="${recent ? 1 : 0.38}"/>`
    if (v > 0) svg += `<text x="${(x + (bw - 4) / 2).toFixed(1)}" y="${(y(v) - 3).toFixed(1)}" font-size="8" text-anchor="middle" fill="#334155" font-weight="600">${v}</text>`
    svg += `<text x="${(x + (bw - 4) / 2).toFixed(1)}" y="${h - pad.b + 12}" font-size="8" text-anchor="middle" fill="#475569">${p.top}</text>`
    if (p.sub) svg += `<text x="${(x + (bw - 4) / 2).toFixed(1)}" y="${h - pad.b + 22}" font-size="7" text-anchor="middle" fill="#94a3b8">${p.sub}</text>`
  })
  const ay = y(stats[s].all)
  svg += `<line x1="${pad.l}" x2="${w - pad.r}" y1="${ay}" y2="${ay}" stroke="#0f172a" stroke-dasharray="4 3" stroke-width="1"/>`
  svg += `</svg>`
  return svg
}

function rankingChart(w = 640, h = 236) {
  const pad = { l: 120, r: 40, t: 8, b: 22 }
  const iw = w - pad.l - pad.r; const rh = (h - pad.t - pad.b) / ranked.length
  const top = 16
  const x = (v) => pad.l + (v / top) * iw
  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">`
  for (let g = 0; g <= top; g += 4) svg += `<line x1="${x(g)}" x2="${x(g)}" y1="${pad.t}" y2="${h - pad.b}" stroke="#e2e8f0"/><text x="${x(g)}" y="${h - 6}" font-size="9" text-anchor="middle" fill="#64748b">${g}</text>`
  ranked.forEach((s, i) => {
    const cy = pad.t + i * rh + rh / 2
    svg += `<text x="${pad.l - 8}" y="${cy + 3}" font-size="10" text-anchor="end" fill="#0f172a" font-weight="600">${esc(SUBJECT_NOTES[s].short)}</text>`
    svg += `<rect x="${pad.l}" y="${cy - rh * 0.32}" width="${x(stats[s].recent) - pad.l}" height="${rh * 0.64}" rx="3" fill="${COLORS[s]}"/>`
    svg += `<text x="${Math.max(x(stats[s].recent), x(stats[s].all)) + 8}" y="${cy + 3}" font-size="9.5" fill="#0f172a" font-weight="700">${f2(stats[s].recent)}</text>`
    const ax = x(stats[s].all)
    svg += `<path d="M ${ax} ${cy - 6} L ${ax + 5} ${cy} L ${ax} ${cy + 6} L ${ax - 5} ${cy} Z" fill="#fff" stroke="#0f172a" stroke-width="1.3"/>`
  })
  svg += `</svg>`
  return svg
}

function rangeChart(w = 640) {
  const rows = [...TECH].sort((a, b) => stats[b].sd - stats[a].sd)
  const rh = 26; const h = rows.length * rh + 26
  const pad = { l: 120, r: 16 }
  const top = 24; const x = (v) => pad.l + (v / top) * (w - pad.l - pad.r)
  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">`
  for (let g = 0; g <= top; g += 4) svg += `<line x1="${x(g)}" x2="${x(g)}" y1="4" y2="${h - 20}" stroke="#eef2f7"/><text x="${x(g)}" y="${h - 6}" font-size="9" text-anchor="middle" fill="#64748b">${g}</text>`
  rows.forEach((s, i) => {
    const cy = 14 + i * rh; const st = stats[s]
    svg += `<text x="${pad.l - 8}" y="${cy + 3}" font-size="10" text-anchor="end" fill="#0f172a" font-weight="600">${esc(SUBJECT_NOTES[s].short)}</text>`
    svg += `<line x1="${x(st.min)}" x2="${x(st.max)}" y1="${cy}" y2="${cy}" stroke="${COLORS[s]}" stroke-width="7" stroke-linecap="round" stroke-opacity="0.35"/>`
    svg += `<text x="${x(st.min) - 7}" y="${cy + 3}" font-size="8.5" text-anchor="end" fill="#64748b">${st.min}</text><text x="${x(st.max) + 7}" y="${cy + 3}" font-size="8.5" fill="#64748b">${st.max}</text>`
    svg += `<circle cx="${x(st.recent)}" cy="${cy}" r="4.5" fill="${COLORS[s]}" stroke="#fff" stroke-width="1.5"/>`
    const ax = x(st.all)
    svg += `<path d="M ${ax} ${cy - 5} L ${ax + 4} ${cy} L ${ax} ${cy + 5} L ${ax - 4} ${cy} Z" fill="#fff" stroke="#0f172a" stroke-width="1.2"/>`
  })
  svg += `</svg>`
  return svg
}

function typeMixChart(w = 640, h = 170) {
  const pad = { l: 26, r: 6, t: 8, b: 30 }
  const iw = w - pad.l - pad.r; const ih = h - pad.t - pad.b
  const bw = iw / typeMix.length; const top = 65
  const C = { MCQ: '#cbd5e1', MSQ: '#f59e0b', NAT: '#4f46e5' }
  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">`
  typeMix.forEach((m, i) => {
    let yy = pad.t + ih; const x = pad.l + i * bw + 3
    ;['MCQ', 'MSQ', 'NAT'].forEach(t => {
      const hh = (m[t] / top) * ih; yy -= hh
      svg += `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${hh.toFixed(1)}" fill="${C[t]}"/>`
      if (t !== 'MCQ' && m[t] >= 4) svg += `<text x="${(x + (bw - 6) / 2).toFixed(1)}" y="${(yy + hh / 2 + 3).toFixed(1)}" font-size="8" text-anchor="middle" fill="#fff" font-weight="700">${m[t]}</text>`
    })
    svg += `<text x="${(x + (bw - 6) / 2).toFixed(1)}" y="${h - pad.b + 11}" font-size="8" text-anchor="middle" fill="#475569">${m.p.top}</text>`
    if (m.p.sub) svg += `<text x="${(x + (bw - 6) / 2).toFixed(1)}" y="${h - pad.b + 20}" font-size="7" text-anchor="middle" fill="#94a3b8">${m.p.sub}</text>`
  })
  svg += `</svg>`
  return svg
}

// ---------- page frame ----------
let pageNo = 0
const page = (section, body, cls = '') => {
  pageNo++
  return `<section class="page ${cls}">
  <header class="run"><span>GATE CSE 2027 · PYQ Playbook</span><span>${esc(section)}</span></header>
  <div class="body">${body}</div>
  <footer class="run"><span>ExamPrep</span><span>${String(pageNo).padStart(2, '0')}</span></footer>
</section>`
}

const pages = []

// ---------- cover ----------
pageNo++
pages.push(`<section class="page cover">
  <div class="cover-top"><span>EXAMPREP</span><span>Edition 2027.1</span></div>
  <div class="cover-main">
    <div class="kicker">GATE CSE 2027</div>
    <h1>The PYQ<br>Playbook</h1>
    <p class="lede">Every official GATE CS paper from 2010 to 2026, broken down by subject and chapter: where the marks have been, how steady each subject is, and what to study first.</p>
  </div>
  <div class="cover-stats">
    <div><b>${N}</b><span>papers analysed<br>2010-2026</span></div>
    <div><b>${PAPERS.reduce((s, p) => s + p.qs.length, 0).toLocaleString('en-IN')}</b><span>questions<br>classified</span></div>
    <div><b>${TECH.length}</b><span>technical subjects<br>+ General Aptitude</span></div>
    <div><b>${Object.values(SYLLABUS_CHAPTERS).reduce((s, c) => s + c.length, 0) - (SYLLABUS_CHAPTERS[SE]?.length || 0)}</b><span>chapters tracked<br>paper by paper</span></div>
  </div>
  <div class="cover-rank">
    <div class="cr-title">Subjects by recent average <span>(2024-26 papers, marks out of 85, plus 15 for aptitude)</span></div>
    <ol>${ranked.map((s, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span>${dot(s)}${esc(s)}<b>${f1(stats[s].recent)}</b></li>`).join('')}<li><span class="n">+</span>${dot('General Aptitude')}General Aptitude<b class="ga">15</b></li></ol>
  </div>
</section>`)

// ---------- how to use ----------
pages.push(page('How to use this playbook', `
<h2 class="h">How to use this playbook</h2>
<p class="intro">Built for revision. Learn each subject from your books or lectures first; use these pages to decide what to study first and to revise from.</p>
<div class="three">
  <div class="card c1"><div class="eyebrow">While learning</div><h4>Read the subject sheet</h4><p>When you finish a subject, read its two pages. The chapter grid shows which parts GATE keeps coming back to.</p></div>
  <div class="card c2"><div class="eyebrow">During revision</div><h4>Summary and traps</h4><p>Ten minutes per subject: read the summary and the "watch for" list, then practise the chapters with the most questions.</p></div>
  <div class="card c3"><div class="eyebrow">Last two weeks</div><h4>Reliability and checklist</h4><p>Section 06 ranks every chapter by how reliably it is asked. Section 07 is the checklist to run through before the exam.</p></div>
</div>
<h3 class="h3">What's inside</h3>
<table class="toc">
  <tr><td>01</td><td>Where the marks are</td><td>Subjects ranked by recent average, with tiers</td></tr>
  <tr><td>02</td><td>Marks per paper</td><td>Every subject's marks in all ${N} papers</td></tr>
  <tr><td>03</td><td>Trends and stability</td><td>Era averages, spread, highest and lowest</td></tr>
  <tr><td>04</td><td>Paper format</td><td>Structure, negative marking, question types</td></tr>
  <tr><td>05</td><td>Subject sheets</td><td>Two pages per subject: marks, summary, chapter grid</td></tr>
  <tr><td>06</td><td>Chapter reliability</td><td>How often each chapter appeared in the last ${MODERN.length} papers</td></tr>
  <tr><td>07</td><td>Exam-day checklist</td><td>Habits to run on autopilot during the paper</td></tr>
  <tr><td>08</td><td>About the data</td><td>Sources, method and what is excluded</td></tr>
</table>
<h3 class="h3">Reading the labels</h3>
<div class="legend-grid">
  <div><span class="tier tier1">Tier 1 · Critical</span><p>The three subjects with the highest recent average.</p></div>
  <div><span class="tier tier2">Tier 2 · High</span><p>The next four, each worth ${f1(Math.min(...ranked.slice(3, 7).map(s => stats[s].recent)))}-${f1(Math.max(...ranked.slice(3, 7).map(s => stats[s].recent)))} marks a paper recently.</p></div>
  <div><span class="tier tier3">Tier 3 · Steady</span><p>Fewer marks, but rarely skipped. Not optional.</p></div>
  <div><span class="pill">Recent avg</span><p>Average marks in the ${RECENT.length} papers of 2024-2026, the best guide to 2027.</p></div>
</div>
<div class="note"><b>Scope.</b> Marks are counted by each question's main subject in the ExamPrep question bank. Software engineering and web technology questions (asked only up to 2016) are shown separately and are not part of any average.</div>
`))

// ---------- 01 ranking ----------
pages.push(page('01 · Where the marks are', `
<h2 class="h"><span class="num">01</span>Where the marks are</h2>
<p class="intro">Subjects ranked by their <b>recent average</b>: marks per paper over the six papers of 2024-2026. The diamond marks the ${N}-paper average. Technical marks total 85 per paper.</p>
<table class="data">
  <thead><tr><th>#</th><th>Subject</th><th class="r">Recent avg<br><small>2024-26</small></th><th class="r">Share<br><small>of 85</small></th><th class="r">${N}-paper<br><small>avg</small></th><th>Priority</th></tr></thead>
  <tbody>
  ${ranked.map((s, i) => `<tr><td>${i + 1}</td><td>${dot(s)}${esc(s)}</td><td class="r b">${f2(stats[s].recent)}</td><td class="r">${f1(stats[s].recent / totalRecent * 100)}%</td><td class="r">${f2(stats[s].all)}</td><td><span class="${tierClass(TIER[s])}">${tierLabel(TIER[s])}</span></td></tr>`).join('')}
  <tr class="tot"><td></td><td>Total technical</td><td class="r b">${f2(totalRecent)}</td><td class="r">100%</td><td></td><td></td></tr>
  <tr class="ga"><td>+</td><td>${dot('General Aptitude')}General Aptitude <small>(separate 15 marks)</small></td><td class="r b">15.00</td><td class="r">-</td><td class="r">15.00</td><td><span class="tier tier0">Fixed 15 marks</span></td></tr>
  </tbody>
</table>
<div class="chartbox"><div class="ct">Recent average vs ${N}-paper average <span class="lg"><i class="sw"></i>recent <i class="dm"></i>${N}-paper</span></div>${rankingChart()}</div>
<div class="two">
  <div class="stat s1"><b>${f1(ranked.slice(0, 3).reduce((s, x) => s + stats[x].recent, 0))}</b><p>Marks a paper from the three Tier 1 subjects (${ranked.slice(0, 3).map(s => esc(SUBJECT_NOTES[s].short)).join(', ')}) in 2024-26: ${f1(ranked.slice(0, 3).reduce((s, x) => s + stats[x].recent, 0) / 85 * 100)}% of the technical marks.</p></div>
  <div class="stat s2"><b>${f1(ranked.slice(-3).reduce((s, x) => s + stats[x].recent, 0))}</b><p>Marks from the three lowest subjects together. Still more than any single Tier 2 subject, so don't skip them.</p></div>
</div>
`))

// ---------- 02 heatmap ----------
const heatTable = (papers, title) => {
  let h = `<div class="ht-title">${title} · ${papers.length} papers</div><table class="heat"><colgroup><col style="width:30mm">${papers.map(() => '<col>').join('')}</colgroup><thead><tr><th></th>${papers.map(p => `<th>${p.top}${p.sub ? `<br><small>${p.sub}</small>` : ''}</th>`).join('')}</tr></thead><tbody>`
  ;[...TECH].sort((a, b) => stats[b].all - stats[a].all).forEach(s => {
    const vals = papers.map(p => marksIn(p, s))
    const lo = Math.min(...stats[s].series); const hi = Math.max(...stats[s].series)
    h += `<tr><th>${dot(s)}${esc(SUBJECT_NOTES[s].short)}</th>${vals.map(v => heatCell(v, lo, hi, hexRgb(COLORS[s]))).join('')}</tr>`
  })
  const seVals = papers.map(p => marksIn(p, SE))
  if (seVals.some(v => v > 0)) h += `<tr class="se"><th>${dot(SE)}Software Engg.</th>${seVals.map(v => `<td class="hc">${v || ''}</td>`).join('')}</tr>`
  h += `<tr class="sum"><th>Technical total</th>${papers.map(p => `<td>${TECH.reduce((s, x) => s + marksIn(p, x), 0) + marksIn(p, SE)}</td>`).join('')}</tr>`
  h += `<tr class="gar"><th>${dot('General Aptitude')}Aptitude</th>${papers.map(p => `<td>${marksIn(p, 'General Aptitude')}</td>`).join('')}</tr>`
  return h + '</tbody></table>'
}
pages.push(page('02 · Marks per paper', `
<h2 class="h"><span class="num">02</span>Marks per paper, 2010-2026</h2>
<p class="intro">Each cell is a subject's marks in one paper. Shading is relative to that subject's own range, so a dark cell is a big year <i>for that subject</i>.</p>
${heatTable(PAPERS.filter(p => p.year <= 2017), '2010-2017')}
<div style="height:7mm"></div>
${heatTable(MODERN, '2018-2026')}
<div class="note"><b>Why some early totals include Software Engineering.</b> Until 2016 a few questions per paper covered software engineering and web technologies. They are shown in their own row and left out of every subject average, because they are no longer in the syllabus.</div>
`))

// ---------- 03 trends ----------
const dir = (s) => { const e = stats[s].eras; const d = e[2] - e[1]; return Math.abs(d) < 0.75 ? ['flat', '→ Flat'] : d > 0 ? ['up', '↑ Rising'] : ['down', '↓ Falling'] }
pages.push(page('03 · Trends and stability', `
<h2 class="h"><span class="num">03</span>Trends and stability</h2>
<p class="intro">Three eras of the exam. The direction compares 2024-26 with 2018-23: a change under 0.75 marks counts as flat.</p>
<table class="data compact">
  <thead><tr><th>Subject</th><th class="r">2010-17<br><small>${ERAS[0].papers.length} papers</small></th><th class="r">2018-23<br><small>${ERAS[1].papers.length} papers</small></th><th class="r">2024-26<br><small>${ERAS[2].papers.length} papers</small></th><th>Direction</th><th class="r">Std. dev.</th><th>Spread</th></tr></thead>
  <tbody>${[...TECH].sort((a, b) => stats[b].recent - stats[a].recent).map(s => { const [c, l] = dir(s); const st = stats[s]; return `<tr><td>${dot(s)}${esc(SUBJECT_NOTES[s].short)}</td>${st.eras.map((e, i) => `<td class="r ${i === 2 ? 'b' : ''}">${f2(e)}</td>`).join('')}<td><span class="dir ${c}">${l}</span></td><td class="r">${f2(st.sd)}</td><td><span class="var ${st.sd >= 2 ? 'hi' : 'lo'}">${st.sd >= 2 ? 'Swings' : 'Steady'}</span></td></tr>` }).join('')}</tbody>
</table>
<div class="chartbox"><div class="ct">Lowest to highest marks in any paper <span class="lg"><i class="ci"></i>recent avg <i class="dm"></i>${N}-paper avg</span></div>${rangeChart()}</div>
<div class="two">
  <div class="stat s3"><b>Swings</b><p>${TECH.filter(s => stats[s].sd >= 2).map(s => esc(SUBJECT_NOTES[s].short)).join(', ')} move by several marks from paper to paper (std. dev. 2 or more). A light year doesn't mean the next one will be.</p></div>
  <div class="stat s4"><b>Steady</b><p>${TECH.filter(s => stats[s].sd < 2).map(s => esc(SUBJECT_NOTES[s].short)).join(', ')} stay within a narrow band. Their averages are reliable predictions for 2027.</p></div>
</div>
`))

// ---------- 04 format ----------
const negRows = (() => {
  const m = new Map()
  PAPERS.forEach(p => p.qs.forEach(q => {
    const k = `${q.type}|${q.marks}|${q.negativeMarks}`
    const e = m.get(k) || { type: q.type, marks: q.marks, neg: q.negativeMarks, years: new Set() }
    e.years.add(p.year); m.set(k, e)
  }))
  return m
})()
const recentNeg = (type, marks) => [...negRows.values()].filter(e => e.type === type && +e.marks === marks && [...e.years].some(y => y >= 2024)).map(e => e.neg)
const fracNeg = (v) => (+v === 0 ? 'None' : Math.abs(v - 1 / 3) < 0.01 ? '-1/3' : Math.abs(v - 2 / 3) < 0.02 ? '-2/3' : `-${v}`)
const lastNat = natBlocks.slice(-2)
pages.push(page('04 · Paper format', `
<h2 class="h"><span class="num">04</span>Paper format</h2>
<p class="intro">Not a topic, but it changes how you attempt the paper. Every number below is read from the papers themselves.</p>
<div class="blocks">
  <div class="blk b1"><b>15</b><span>General Aptitude</span><small>10 questions: 5 × 1 mark + 5 × 2 marks</small></div>
  <div class="blk b2"><b>25</b><span>Technical, 1 mark</span><small>25 questions × 1</small></div>
  <div class="blk b3"><b>60</b><span>Technical, 2 marks</span><small>30 questions × 2</small></div>
</div>
<p class="small muted">65 questions, 100 marks, 3 hours. The same structure in all ${N} papers since 2010.</p>
<div class="two top">
  <div class="card plain">
    <h4>Negative marking (2024-26 papers)</h4>
    <table class="data compact">
      <thead><tr><th>Type</th><th>Wrong answer</th></tr></thead>
      <tbody>
        <tr><td>MCQ · 1 mark</td><td class="b">${[...new Set(recentNeg('MCQ', 1).map(fracNeg))].join(', ')}</td></tr>
        <tr><td>MCQ · 2 marks</td><td class="b">${[...new Set(recentNeg('MCQ', 2).map(fracNeg))].join(', ')}</td></tr>
        <tr><td>MSQ (select all correct)</td><td class="b">None</td></tr>
        <tr><td>NAT (numerical answer)</td><td class="b">None</td></tr>
      </tbody>
    </table>
    <p class="small">MSQs give no partial credit: every correct option must be chosen. In 2010-2013, two-mark linked questions sometimes carried no penalty on the second part.</p>
  </div>
  <div class="card plain">
    <h4>Where numerical questions sit</h4>
    <table class="data compact">
      <thead><tr><th>Paper</th><th class="r">NAT · 1 mark</th><th class="r">NAT · 2 marks</th></tr></thead>
      <tbody>${natBlocks.filter(n => n.p.year >= 2023).map(n => `<tr><td>${n.p.label}</td><td class="r">${n.one}</td><td class="r">${n.two}</td></tr>`).join('')}</tbody>
    </table>
    <p class="small">Numerical questions still appear in both blocks (${lastNat.map(n => `${n.p.label}: ${n.one} + ${n.two}`).join('; ')}), and most of them are two-markers.</p>
  </div>
</div>
<div class="chartbox"><div class="ct">Question types in each paper, 2014-2026 <span class="lg"><i class="k" style="background:#cbd5e1"></i>MCQ <i class="k" style="background:#f59e0b"></i>MSQ <i class="k" style="background:#4f46e5"></i>NAT</span></div>${typeMixChart()}</div>
<div class="note"><b>Practical rule.</b> MSQs arrived in 2021 and NATs in 2014; together they are now ${Math.round(avg(typeMix.filter(m => m.p.year >= 2024).map(m => m.MSQ + m.NAT)))} of 65 questions with no penalty. Answer all of them. Guess on an MCQ only after removing an option.</div>
`))

// ---------- 05 subject sheets ----------
const sheetOrder = [...ranked, 'General Aptitude']
sheetOrder.forEach((s, idx) => {
  const st = stats[s]; const nt = SUBJECT_NOTES[s]; const color = COLORS[s]
  const rows = chapterRows(s)
  const tops = topTopics(s)
  const [dc, dl] = s === 'General Aptitude' ? ['flat', '→ Fixed'] : dir(s)
  const mix = { MCQ: 0, MSQ: 0, NAT: 0 }; const mk = { 1: 0, 2: 0 }
  RECENT.forEach(p => p.qs.filter(q => q.subject === s).forEach(q => { mix[q.type]++; mk[+q.marks]++ }))
  const totalRecentQ = mix.MCQ + mix.MSQ + mix.NAT

  pages.push(page(`05 · ${nt.short}`, `
<div class="sheet-head" style="--c:${color}">
  <div class="eyebrow">Subject sheet ${idx + 1} of ${sheetOrder.length}</div>
  <h2 class="sh">${esc(s)}</h2>
  <div class="chips"><span class="${tierClass(TIER[s])}">${tierLabel(TIER[s])}</span><span class="pill">Recent avg ${f2(st.recent)}</span><span class="pill">Asked in ${st.asked}/${N} papers</span><span class="pill">Last asked ${st.last}</span></div>
</div>
<div class="tldr" style="--c:${color}"><div class="eyebrow">In short</div><ul>${nt.tldr.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
<div class="tiles">
  <div class="tile hl" style="--c:${color}"><span>Recent avg · 2024-26</span><b>${f2(st.recent)}</b><small>${s === 'General Aptitude' ? 'out of 15' : `${f1(st.recent / 85 * 100)}% of 85`}</small></div>
  <div class="tile"><span>${N}-paper avg</span><b>${f2(st.all)}</b><small>2010-2026</small></div>
  <div class="tile"><span>Lowest</span><b>${st.min}</b><small>${st.minAt.slice(0, 3).join(', ')}${st.minAt.length > 3 ? ' …' : ''}</small></div>
  <div class="tile"><span>Highest</span><b>${st.max}</b><small>${st.maxAt.slice(0, 3).join(', ')}${st.maxAt.length > 3 ? ' …' : ''}</small></div>
</div>
<div class="chartbox"><div class="ct">Marks in every paper <span class="lg"><i class="sw" style="background:${color}"></i>2024-26 <i class="sw" style="background:${color};opacity:.38"></i>earlier <i class="ln"></i>${N}-paper avg ${f2(st.all)}</span></div>${barChart(s)}</div>
<div class="era-row">${ERAS.map((e, i) => `<div class="era ${i === 2 ? 'now' : ''}"><span>${e.name}</span><b>${f2(st.eras[i])}</b></div>`).join('<i class="arr">→</i>')}<div class="era-note"><span class="dir ${dc}">${dl}</span> · std. dev. ${f2(st.sd)} · recent questions: ${totalRecentQ ? `${mix.MCQ} MCQ, ${mix.MSQ} MSQ, ${mix.NAT} NAT (${mk[1]} one-mark, ${mk[2]} two-mark)` : 'none'}</div></div>
<div class="watch-row">${nt.watch.map(([h, t], i) => `<div class="wcard" style="--c:${color}"><span class="wn" style="background:${color}">${i + 1}</span><b>${esc(h)}</b><p>${esc(t)}</p></div>`).join('')}</div>
`, 'sheet'))

  const cols = MODERN
  pages.push(page(`05 · ${nt.short}`, `
<h3 class="h3 first" style="--c:${color}">${esc(nt.short)} · chapters and years asked</h3>
<p class="small muted">Questions per chapter in each of the last ${cols.length} papers. A question tagged with two chapters counts in both. The right-hand columns compare with 2010-17.</p>
<table class="grid">
  <thead><tr><th class="l">Chapter</th>${cols.map(p => `<th>${p.top}${p.sub ? `<br><small>${p.sub}</small>` : ''}</th>`).join('')}<th class="sep">2018-26</th><th>2010-17</th></tr></thead>
  <tbody>${rows.sort((a, b) => b.appeared - a.appeared || b.totalModern - a.totalModern).map(r => `<tr><td class="l">${esc(r.name)}</td>${r.modern.map(v => v ? `<td><span class="sq" style="background:${color};opacity:${(0.45 + Math.min(v, 4) * 0.14).toFixed(2)}">${v}</span></td>` : '<td><span class="sq off"></span></td>').join('')}<td class="sep b ${r.appeared === cols.length ? 'full' : ''}">${r.appeared}/${cols.length}</td><td class="muted">${r.earlyAppeared}/${N - cols.length}</td></tr>`).join('')}</tbody>
</table>
<div class="card plain">
    <h4>Most-asked topics since 2018</h4>
    <table class="data compact">
      <thead><tr><th>Topic</th><th class="r">Questions</th><th class="r">Papers</th></tr></thead>
      <tbody>${tops.map(t => `<tr><td>${esc(t.topic)}</td><td class="r b">${t.n}</td><td class="r">${t.papers.size}/${cols.length}</td></tr>`).join('')}</tbody>
    </table>
</div>
<div class="order" style="--c:${color}"><span>Study order</span>${esc(nt.order).replace(/-&gt;/g, '<i>→</i>')}</div>
`, 'sheet'))
})

// ---------- 06 reliability ----------
const allChapters = []
;[...TECH, 'General Aptitude'].forEach(s => chapterRows(s).forEach(r => allChapters.push({ ...r, subject: s })))
const bands = [
  { min: MODERN.length, max: MODERN.length, title: `${MODERN.length}/${MODERN.length}`, sub: 'Every paper', note: 'Never skipped since 2018. As close to guaranteed as GATE gets.' },
  { min: 11, max: MODERN.length - 1, title: `11-12/${MODERN.length}`, sub: 'Almost always', note: 'Missing from at most two papers.' },
  { min: 7, max: 10, title: `7-10/${MODERN.length}`, sub: 'Frequent', note: 'In most papers, but skipped now and then.' },
  { min: 4, max: 6, title: `4-6/${MODERN.length}`, sub: 'Occasional', note: 'Roughly one paper in three.' },
  { min: 0, max: 3, title: `0-3/${MODERN.length}`, sub: 'Rare', note: 'Low yield. Learn them after everything else.' }
]
pages.push(page('06 · Chapter reliability', `
<h2 class="h"><span class="num">06</span>How reliable is each chapter?</h2>
<p class="intro">Every chapter in the playbook, grouped by how many of the last ${MODERN.length} papers (2018-2026) asked at least one question from it. The number on each chip is that count. <b>${allChapters.filter(c => c.appeared === MODERN.length).length} chapters</b> appeared in every one of them.</p>
${bands.map(b => { const list = allChapters.filter(c => c.appeared >= b.min && c.appeared <= b.max).sort((x, y) => y.appeared - x.appeared || y.totalModern - x.totalModern); return `<div class="band"><div class="band-l"><b>${b.title}</b><span>${b.sub}</span><small>${list.length} chapters</small></div><div class="band-r"><p>${b.note}</p><div class="chiplist">${list.map(c => `<span class="chip" style="border-color:${COLORS[c.subject]}"><i style="background:${COLORS[c.subject]}"></i>${esc(c.name)} <b>${c.appeared}</b></span>`).join('') || '<span class="muted small">None</span>'}</div></div></div>` }).join('')}
<div class="note"><b>How to read this.</b> Chapters follow the ExamPrep book-chapter map used across the site. A chapter can be "every paper" with only one question each time, so pair this page with the chapter grids in Section 05 to see how many questions it brings.</div>
`))

// ---------- 07 checklist ----------
pages.push(page('07 · Exam-day checklist', `
<h2 class="h"><span class="num">07</span>Exam-day checklist</h2>
<p class="intro">Habits that save marks. Read them the night before, then run them on autopilot during the paper.</p>
<div class="checks">${CHECKLIST.map(c => `<div class="check"><span class="box"></span><p>${esc(c)}</p></div>`).join('')}</div>
<div class="final"><h4>Before you start</h4><p>65 questions · 100 marks · 3 hours. 15 aptitude + 85 technical. Answer every MSQ and NAT. Guess on MCQs only after removing an option.</p></div>
`))

// ---------- 08 about ----------
pages.push(page('08 · About the data', `
<h2 class="h"><span class="num">08</span>About the data</h2>
<div class="card plain block"><h4>Dataset</h4><p>${N} official GATE CS papers: ${PAPERS.map(p => p.label).join(', ')}. ${PAPERS.reduce((s, p) => s + p.qs.length, 0).toLocaleString('en-IN')} questions, each tagged with its subject, its book chapter(s) and finer GATE Overflow topics in the ExamPrep question bank. Every paper totals 100 marks.</p></div>
<div class="card plain block"><h4>How the numbers are computed</h4><ul>
  <li><b>Marks</b> for a subject are the marks of the questions whose main subject it is.</li>
  <li><b>Recent average</b> is the mean over the ${RECENT.length} papers of 2024-2026 (${RECENT.map(p => p.label).join(', ')}).</li>
  <li><b>Eras:</b> 2010-17 (${ERAS[0].papers.length} papers), 2018-23 (${ERAS[1].papers.length}), 2024-26 (${ERAS[2].papers.length}).</li>
  <li><b>Standard deviation</b> is taken over all ${N} papers.</li>
  <li><b>Tiers:</b> the top 3 subjects by recent average are Tier 1, the next 4 Tier 2, the rest Tier 3.</li>
  <li><b>Chapter counts</b> use the book-chapter tags. A question tagged with two chapters counts in both.</li>
</ul></div>
<div class="card plain block"><h4>What is excluded</h4><p>Papers from 2007-2009 (a different format: no aptitude section and 150 marks in 2007-08). Software engineering and web technology questions, last asked in 2016, appear in Section 02 but are left out of every average.</p></div>
<div class="card plain block"><h4>Keep it current</h4><p>The playbook is generated from the question bank. When the 2027 papers are added, rebuild it and every number, chart and ranking updates.</p></div>
<div class="note"><b>Disclaimer.</b> An independent study aid from ExamPrep, based on the official GATE CS question papers. Not affiliated with or endorsed by GATE or the organising institutes. Past patterns are a guide, not a guarantee.</div>
`))

const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8')
fs.writeFileSync(outFile, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>GATE CSE 2027 PYQ Playbook · ExamPrep</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${pages.join('\n')}</body></html>`)
console.log('pages:', pageNo, 'papers:', N, 'ranked:', ranked.map(s => SUBJECT_NOTES[s].short + ' ' + f2(stats[s].recent)).join(', '))

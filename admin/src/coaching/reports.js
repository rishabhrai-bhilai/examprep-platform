// Downloadable reports: PDF (jsPDF) per student and per batch, and Excel (.xlsx)
// workbooks. The .xlsx writer is a small SpreadsheetML builder zipped with fflate,
// so no spreadsheet library is needed.
import { jsPDF } from 'jspdf'
import { zipSync, strToU8 } from 'fflate'

const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')
const v = (x, unit = '') => (x === null || x === undefined ? '-' : `${x}${unit}`)
// jsPDF's built-in fonts are Latin-1: swap characters it can't draw
const safe = (s) => String(s ?? '').replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\xFF\n]/g, '')

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const fileSlug = (s) => String(s || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// --- Excel ---
// eslint-disable-next-line no-control-regex
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
const colName = (i) => {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}
function sheetXml(rows) {
  const widths = (rows[0] || []).map((_, c) => Math.min(60, Math.max(8, ...rows.map(r => String(r[c] ?? '').length + 2))))
  const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((cell, ci) => {
    const ref = `${colName(ci)}${ri + 1}`
    const style = ri === 0 ? ' s="1"' : ''
    if (cell === null || cell === undefined || cell === '') return `<c r="${ref}"${style}/>`
    if (typeof cell === 'number' && Number.isFinite(cell)) return `<c r="${ref}"${style}><v>${cell}</v></c>`
    return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(cell)}</t></is></c>`
  }).join('')}</row>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData></worksheet>`
}

// sheets: [{ name, rows: [[header...], [cell...], ...] }]
export function xlsxBlob(sheets) {
  const names = sheets.map((s, i) => esc(String(s.name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Sheet${i + 1}`))
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0E7FF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0"/><xf fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'
  }
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(s.rows) })
  const zipped = zipSync(Object.fromEntries(Object.entries(files).map(([k, x]) => [k, strToU8(x)])))
  return new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
export const downloadXlsx = (sheets, filename) => saveBlob(xlsxBlob(sheets), filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)

// --- Sheets for the common exports ---
export const studentSheet = (rows) => ({
  name: 'Students',
  rows: [
    ['Rank', 'Name', 'Email', 'Batch', 'Tests taken', 'Tests missed', 'Average test %', 'Last test %', 'Practice answers', 'Practice accuracy %', 'Minutes practised', 'Active days (7)', 'Assignments done', 'Assignments due', 'Last active'],
    ...rows.map(r => [r.rank ?? '', r.name, r.email || '', r.batch || '', r.testsTaken, r.testsMissed, r.avgPercent ?? '', r.lastPercent ?? '', r.answers, r.accuracy ?? '', r.minutes, r.activeDays7, r.assignmentsDone, r.assignmentsDue, r.lastActive ? fmtDate(r.lastActive) : 'Never'])
  ]
})
export const subjectSheet = (subjects) => ({
  name: 'Subjects & chapters',
  rows: [
    ['Subject', 'Chapter', 'Answers', 'Accuracy %', 'Avg time (s)', 'Students'],
    ...subjects.flatMap(s => [[s.subject, '(all)', s.answers, s.accuracy ?? '', s.avgTimeSec, ''], ...s.chapters.map(c => [s.subject, c.chapter, c.answers, c.accuracy ?? '', c.avgTimeSec, c.students])])
  ]
})
export const testSheet = (tests) => ({
  name: 'Tests',
  rows: [['Test', 'Date', 'Batches', 'Questions', 'Attempts', 'Eligible', 'Average %', 'Top %'],
    ...tests.map(t => [t.title, fmtDate(t.scheduledAt), t.batches?.join(', ') || 'All', t.questionCount ?? '', t.attempts, t.eligible, t.avgPercent ?? '', t.topPercent ?? ''])]
})
export const weakSheet = (weak) => ({
  name: 'Weak chapters',
  rows: [['Subject', 'Chapter', 'Accuracy %', 'Points under average', 'Answers', 'Students under 40%'], ...weak.map(w => [w.subject, w.chapter, w.accuracy, w.gap, w.answers, w.strugglingStudents])]
})

export function batchWorkbook(report) {
  const name = report.batch?.name || 'All batches'
  downloadXlsx([
    studentSheet(report.students),
    { name: 'Leaderboard', rows: [['Rank', 'Name', 'Batch', 'Tests', 'Average %', 'Best %', 'Improvement (pts)'], ...report.leaderboard.rows.map(r => [r.rank, r.name, r.batch || '', r.tests, r.avgPercent, r.best, r.improvement ?? ''])] },
    testSheet(report.tests),
    subjectSheet(report.subjects),
    weakSheet(report.weaknesses.weak),
    { name: 'Course progress', rows: [['Batch', 'Subject', 'Chapter', 'Done', 'Done on', 'Students practised %'], ...report.syllabus.flatMap(b => b.subjects.flatMap(s => s.chapters.map(c => [b.batch, s.subject, c.chapter, c.done ? 'Yes' : 'No', c.doneAt ? fmtDate(c.doneAt) : '', c.practicedPct ?? ''])))] },
    { name: 'Insights', rows: [['Severity', 'Insight', 'Detail', 'Suggested action'], ...report.insights.map(i => [i.severity, i.title, i.detail, i.action || ''])] }
  ], `${fileSlug(report.centre.name)}-${fileSlug(name)}-report`)
}

export function studentWorkbook(r) {
  downloadXlsx([
    { name: 'Summary', rows: [['Field', 'Value'], ['Name', r.student.name], ['Email', r.student.email || ''], ['Batch', r.student.batch || ''], ['Batch rank', r.summary.rank ? `${r.summary.rank} of ${r.summary.batchSize}` : '-'], ['Average test %', r.summary.avgPercent ?? ''], ['Practice accuracy %', r.summary.accuracy ?? ''], ['Practice answers', r.summary.answers], ['Minutes practised', r.summary.minutes], ['Assignments', `${r.summary.assignmentsDone} of ${r.summary.assignmentsDue}`], ['Last active', r.summary.lastActive ? fmtDate(r.summary.lastActive) : 'Never']] },
    { name: 'Tests', rows: [['Test', 'Date', 'Score', 'Max', '%', 'Batch rank', 'Percentile', 'Centre avg %', 'Correct', 'Wrong', 'Skipped'], ...r.tests.map(t => [t.title, fmtDate(t.submittedAt), t.score, t.maxScore, t.percent, t.batchRank ? `${t.batchRank}/${t.batchSize}` : '', t.percentile ?? '', t.centreAvg ?? '', t.correct, t.incorrect, t.unanswered])] },
    subjectSheet(r.subjects),
    weakSheet(r.weaknesses.weak),
    { name: 'Assignments', rows: [['Assignment', 'Due', 'Submitted', 'Late', 'Marks', 'Max'], ...r.assignments.map(a => [a.title, fmtDate(a.dueAt), a.submittedAt ? fmtDate(a.submittedAt) : 'No', a.late ? 'Yes' : '', a.marks ?? '', a.maxMarks])] }
  ], `${fileSlug(r.student.name)}-report`)
}

// --- PDF ---
function pdfDoc(title, subtitle, demo) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 40
  let y = M
  const footer = () => {
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(safe(`ExamPrep coaching report${demo ? ' - DEMO DATA' : ''} - generated ${fmtDate(Date.now())}`), M, H - 20)
    doc.text(`Page ${doc.getNumberOfPages()}`, W - M, H - 20, { align: 'right' })
  }
  const ensure = (need) => {
    if (y + need > H - 40) {
      footer()
      doc.addPage()
      y = M
    }
  }
  doc.setFillColor(99, 102, 241)
  doc.rect(0, 0, W, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(20)
  doc.text(safe(title), M, y + 14)
  y += 30
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(safe(subtitle), M, y)
  y += 14
  if (demo) {
    doc.setFillColor(254, 243, 199)
    doc.roundedRect(M, y, 210, 18, 4, 4, 'F')
    doc.setTextColor(146, 64, 14)
    doc.setFontSize(9)
    doc.text('Demo data: made-up students for illustration', M + 8, y + 12)
    y += 24
  }
  y += 8
  const api = {
    doc,
    heading: (text) => {
      ensure(40)
      y += 8
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(30)
      doc.text(safe(text), M, y)
      y += 6
      doc.setDrawColor(226, 232, 240)
      doc.line(M, y, W - M, y)
      y += 14
    },
    stats: (items) => {
      ensure(52)
      const w = (W - M * 2 - 8 * (items.length - 1)) / items.length
      items.forEach(([label, value], i) => {
        const x = M + i * (w + 8)
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(x, y, w, 44, 6, 6, 'FD')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(110)
        doc.text(safe(label.toUpperCase()), x + 8, y + 14)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(20)
        doc.text(safe(value), x + 8, y + 34)
      })
      y += 56
    },
    para: (text, size = 9.5, color = 60) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(size)
      doc.setTextColor(color)
      doc.splitTextToSize(safe(text), W - M * 2).forEach(line => { ensure(14); doc.text(line, M, y); y += size + 3.5 })
      y += 3
    },
    // Accuracy bars: [label, value(0-100), note]
    bars: (rows) => {
      rows.forEach(([label, value, note]) => {
        ensure(16)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        doc.setTextColor(50)
        doc.text(safe(label).slice(0, 38), M, y + 7)
        const bx = M + 190
        const bw = W - M * 2 - 190 - 90
        doc.setFillColor(241, 245, 249)
        doc.roundedRect(bx, y, bw, 8, 3, 3, 'F')
        if (value) {
          if (value < 45) doc.setFillColor(225, 29, 72)
          else doc.setFillColor(99, 102, 241)
          doc.roundedRect(bx, y, Math.max(4, (bw * Math.min(100, value)) / 100), 8, 3, 3, 'F')
        }
        doc.setTextColor(40)
        doc.setFont('helvetica', 'bold')
        doc.text(`${v(value, '%')}`, bx + bw + 8, y + 7)
        if (note) {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(130)
          doc.text(safe(note), bx + bw + 40, y + 7)
        }
        y += 15
      })
      y += 4
    },
    // Table: columns [{ label, width (share), align }], rows of strings
    table: (cols, rows) => {
      const total = cols.reduce((n, c) => n + (c.width || 1), 0)
      const avail = W - M * 2
      const xs = []
      cols.reduce((x, c) => { xs.push(x); return x + (avail * (c.width || 1)) / total }, M)
      const head = () => {
        doc.setFillColor(238, 242, 255)
        doc.rect(M, y - 10, avail, 16, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(55, 48, 163)
        cols.forEach((c, i) => {
          const w = (avail * (c.width || 1)) / total
          doc.text(safe(c.label), c.align === 'right' ? xs[i] + w - 4 : xs[i] + 4, y, { align: c.align === 'right' ? 'right' : 'left' })
        })
        y += 14
      }
      ensure(40)
      head()
      rows.forEach((r, ri) => {
        if (y + 14 > H - 40) { footer(); doc.addPage(); y = M + 10; head() }
        if (ri % 2) { doc.setFillColor(250, 250, 252); doc.rect(M, y - 10, avail, 14, 'F') }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(40)
        cols.forEach((c, i) => {
          const w = (avail * (c.width || 1)) / total
          const text = doc.splitTextToSize(safe(r[i] ?? ''), w - 8)[0] || ''
          doc.text(text, c.align === 'right' ? xs[i] + w - 4 : xs[i] + 4, y, { align: c.align === 'right' ? 'right' : 'left' })
        })
        y += 14
      })
      y += 8
    },
    save: (filename) => {
      footer()
      doc.save(filename)
    }
  }
  return api
}

export function studentPdf(r, centre) {
  const p = pdfDoc(`${r.student.name}: progress report`, `${centre.name}${r.student.batch ? ` - ${r.student.batch}` : ''} - ${fmtDate(r.generatedAt)}`, centre.demo)
  const s = r.summary
  p.stats([
    ['Batch rank', s.rank ? `${s.rank} / ${s.batchSize}` : '-'],
    ['Average test', v(s.avgPercent, '%')],
    ['Practice accuracy', v(s.accuracy, '%')],
    ['Assignments', `${s.assignmentsDone} / ${s.assignmentsDue}`]
  ])
  p.stats([
    ['Tests taken', String(s.testsTaken)],
    ['Tests missed', String(s.testsMissed)],
    ['Practice answers', String(s.answers)],
    ['Course covered', r.syllabus ? v(r.syllabus.percent, '%') : '-']
  ])
  p.heading('Tests')
  p.table(
    [{ label: 'Test', width: 4 }, { label: 'Date', width: 1.6 }, { label: 'Score', width: 1.3, align: 'right' }, { label: '%', width: 1, align: 'right' }, { label: 'Batch rank', width: 1.3, align: 'right' }, { label: 'Centre avg', width: 1.3, align: 'right' }],
    r.tests.slice().reverse().map(t => [t.title, fmtDate(t.submittedAt), `${t.score}/${t.maxScore}`, v(t.percent, '%'), t.batchRank ? `${t.batchRank}/${t.batchSize}` : '-', v(t.centreAvg, '%')])
  )
  p.heading('Subject-wise accuracy (practice and tests)')
  p.bars(r.subjects.map(x => [x.subject, x.accuracy, `batch ${v(x.batchAccuracy, '%')}`]))
  p.heading('Weak chapters')
  if (r.weaknesses.weak.length) p.bars(r.weaknesses.weak.slice(0, 8).map(w => [`${w.chapter} (${w.subject})`, w.accuracy, `${w.answers} ans`]))
  else p.para('No weak chapters detected yet.')
  if (r.weaknesses.strong.length) {
    p.heading('Strong chapters')
    p.bars(r.weaknesses.strong.map(w => [`${w.chapter} (${w.subject})`, w.accuracy, `${w.answers} ans`]))
  }
  if (r.insights?.length) {
    p.heading('Automated insights')
    r.insights.forEach(i => p.para(`- ${i.title}: ${i.detail} ${i.action || ''}`))
  }
  p.heading('Assignments')
  p.table(
    [{ label: 'Assignment', width: 4 }, { label: 'Due', width: 1.5 }, { label: 'Submitted', width: 1.5 }, { label: 'Marks', width: 1, align: 'right' }],
    r.assignments.map(a => [a.title, fmtDate(a.dueAt), a.submittedAt ? `${fmtDate(a.submittedAt)}${a.late ? ' (late)' : ''}` : a.status === 'open' ? 'Pending' : 'Missed', a.marks !== null ? `${a.marks}/${a.maxMarks}` : '-'])
  )
  p.save(`${fileSlug(r.student.name)}-report.pdf`)
}

export function batchPdf(report) {
  const name = report.batch?.name || 'All batches'
  const p = pdfDoc(`${name}: batch report`, `${report.centre.name} - ${fmtDate(report.generatedAt)}`, report.centre.demo)
  const rows = report.students
  const avg = (list) => (list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 : null)
  p.stats([
    ['Students', String(rows.length)],
    ['Average test', v(avg(rows.filter(r => r.avgPercent !== null).map(r => r.avgPercent)), '%')],
    ['Tests held', String(report.tests.length)],
    ['Course covered', v(avg(report.syllabus.map(b => b.percent ?? 0)), '%')]
  ])
  p.heading('Leaderboard (average of tests taken)')
  p.table(
    [{ label: '#', width: 0.5 }, { label: 'Student', width: 3 }, { label: 'Batch', width: 2.2 }, { label: 'Tests', width: 0.8, align: 'right' }, { label: 'Average', width: 1, align: 'right' }, { label: 'Best', width: 1, align: 'right' }, { label: 'Change', width: 1, align: 'right' }],
    report.leaderboard.rows.slice(0, 25).map(r => [String(r.rank), r.name, r.batch || '', String(r.tests), v(r.avgPercent, '%'), v(r.best, '%'), r.improvement === null ? '-' : `${r.improvement > 0 ? '+' : ''}${r.improvement}`])
  )
  p.heading('Tests')
  p.table(
    [{ label: 'Test', width: 4 }, { label: 'Date', width: 1.6 }, { label: 'Attempts', width: 1.2, align: 'right' }, { label: 'Average', width: 1.1, align: 'right' }, { label: 'Top', width: 1, align: 'right' }],
    report.tests.map(t => [t.title, fmtDate(t.scheduledAt), `${t.attempts}/${t.eligible}`, v(t.avgPercent, '%'), v(t.topPercent, '%')])
  )
  p.heading('Subject-wise accuracy')
  p.bars(report.subjects.map(s => [s.subject, s.accuracy, `${s.answers} ans`]))
  p.heading('Weak chapters')
  if (report.weaknesses.weak.length) p.bars(report.weaknesses.weak.slice(0, 10).map(w => [`${w.chapter} (${w.subject})`, w.accuracy, `${w.strugglingStudents} under 40%`]))
  else p.para('No weak chapters detected yet.')
  p.heading('Automated insights')
  report.insights.slice(0, 10).forEach(i => p.para(`- ${i.title}: ${i.detail} ${i.action || ''}`))
  p.heading('All students')
  p.table(
    [{ label: 'Student', width: 3 }, { label: 'Tests', width: 0.9, align: 'right' }, { label: 'Avg %', width: 0.9, align: 'right' }, { label: 'Practice', width: 1.1, align: 'right' }, { label: 'Accuracy', width: 1.1, align: 'right' }, { label: 'Assignments', width: 1.3, align: 'right' }, { label: 'Last active', width: 1.6 }],
    rows.slice().sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).map(r => [r.name, String(r.testsTaken), v(r.avgPercent), String(r.answers), v(r.accuracy, '%'), `${r.assignmentsDone}/${r.assignmentsDue}`, r.lastActive ? fmtDate(r.lastActive) : 'Never'])
  )
  p.save(`${fileSlug(report.centre.name)}-${fileSlug(name)}-report.pdf`)
}

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Target, Flame, ClipboardList, Clock, Activity, Package, School, User, Award, Bookmark, NotebookPen, MessageSquare, Flag, CalendarCheck, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import { formatDuration, timeAgo } from '../../../src/utils/practiceStats'
import { activityStatus } from '../lib/instituteStats'
import { card, SectionTitle, StatTile, DailyBars, SubjectBars, MockTable, Spinner, ErrorBox, Pill, fmtPct, fmtDate, fmtDateTime, th, td } from '../components/ui'

export default function StudentDetailPage() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => api(`/api/admin/students/${id}`).then(d => setStudent(d.student)).catch(err => setError(err.message)), [id])
  useEffect(() => { load() }, [load])

  if (!student) return error ? <div className="space-y-3"><ErrorBox>{error}</ErrorBox><Link to="/students" className="text-sm font-bold text-primary">← Students</Link></div> : <Spinner />
  const status = activityStatus(student.lastActive)

  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-primary"><ArrowLeft size={14} /> Students</Link>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {student.avatar ? <img src={student.avatar} alt="" className="h-14 w-14 rounded-full bg-slate-100 object-cover" /> : <div className="h-14 w-14 rounded-full bg-slate-200" />}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 truncate">{student.name}</h1>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{student.email}</span>
            {student.phone && <span>· {student.phone}</span>}
            {student.targetYear && <span>· GATE {student.targetYear}</span>}
            <span>· {student.provider === 'google' ? 'Google account' : 'Email account'}</span>
            <Pill tone={status.tone}>{status.label}</Pill>
            {student.demo && <Pill tone="warning">Demo student</Pill>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile icon={CheckCircle} label="Solved" value={student.solved} sub={`of ${student.attempted} tried`} />
        <StatTile icon={Target} label="Accuracy" value={fmtPct(student.accuracy)} sub={`${student.totalAnswers} answers`} />
        <StatTile icon={Flame} label="Streak" value={`${student.streak} d`} sub={`Best ${student.longestStreak} days`} />
        <StatTile icon={ClipboardList} label="Mock tests" value={student.mockCount} sub={`Avg ${fmtPct(student.avgMockPercent)} · best ${fmtPct(student.bestMockPercent)}`} />
        <StatTile icon={Clock} label="Practice time" value={formatDuration(student.practiceSec)} sub={`${student.activeDays} active days`} />
        <StatTile icon={Activity} label="Last active" value={student.lastActive ? timeAgo(student.lastActive) : '–'} sub={`Signed up ${fmtDate(student.signedUpAt)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`${card} p-6 space-y-5`}>
          <SectionTitle title="Coaching centre and test series" />
          {student.centre ? (
            <p className="text-sm flex items-center gap-2">
              <School size={15} className="text-primary" />
              <Link to={`/centres/${student.centre.id}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-primary">{student.centre.name}</Link>
              <span className="text-xs text-slate-500">since {fmtDate(student.centre.joinedAt)}</span>
            </p>
          ) : <p className="text-xs text-slate-400">Not in a coaching centre.</p>}
          {student.access.length === 0 ? <p className="text-xs text-slate-400">No test series unlocked.</p> : (
            <ul className="space-y-1.5">
              {student.access.map(a => (
                <li key={a.seriesId} className="flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200"><Package size={13} className="text-primary" />{a.title}</span>
                  <span className="text-slate-500">Centre seat</span>
                </li>
              ))}
            </ul>
          )}
          <div className="pt-2">
            <SectionTitle title="Last 30 days" subtitle="Questions answered per day" />
            <DailyBars days={student.activity} detail={d => `${d.attempts} answers, ${d.correct} correct`} />
          </div>
        </div>
        <div className={`${card} p-6`}>
          <SectionTitle title="Subjects" subtitle="Accuracy across practice and mock tests. Under 60% is weak." />
          <SubjectBars rows={student.subjects} weak={student.weakestSubjects} />
        </div>
      </div>

      <div className={`${card} p-6`}>
        <SectionTitle title={`Mock tests (${student.mocks.length})`} subtitle="Counted attempts, scored by the server" />
        <MockTable mocks={student.mocks} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel icon={User} title="Profile">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <Fact label="Age">{student.profile?.age ?? '–'}{student.profile?.dob && <span className="text-slate-400"> ({student.profile.dob})</span>}</Fact>
            <Fact label="Target">{student.profile?.targetYear ? `GATE ${student.profile.targetYear}` : 'Not set'}</Fact>
            <Fact label="Goal">{student.profile?.targetGoal || '–'}</Fact>
            <Fact label="Onboarding">{student.profile?.profileCompleted ? 'Completed' : 'Not finished'}</Fact>
            <Fact label="Problem of the Day streak">{student.profile?.potdStreak || 0} days</Fact>
            <Fact label="Signed up">{fmtDateTime(student.signedUpAt)}</Fact>
          </dl>
          <div className="pt-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Award size={12} /> Badges ({student.profile?.badges?.length || 0})</p>
            {student.profile?.badges?.length ? (
              <div className="flex flex-wrap gap-1.5">{student.profile.badges.map(b => <Pill key={b.id} tone="info">{b.name} · {fmtDate(b.at)}</Pill>)}</div>
            ) : <p className="text-xs text-slate-400">None yet.</p>}
          </div>
        </Panel>

        <Panel icon={CalendarCheck} title={`Problem of the Day (${student.potd?.length || 0})`}>
          {student.potd?.length ? (
            <ul className="space-y-2 text-xs">
              {student.potd.map(p => (
                <li key={p.date} className="flex items-start justify-between gap-3">
                  <span className="min-w-0"><span className="font-bold text-slate-700 dark:text-slate-200">{fmtDate(p.date)}</span> <span className="text-slate-500">{p.label}</span></span>
                  {p.correct ? <Pill tone="good">Correct</Pill> : <Pill tone="critical">Wrong</Pill>}
                </li>
              ))}
            </ul>
          ) : <Empty>Has not tried the Problem of the Day.</Empty>}
        </Panel>

        <Panel icon={Bookmark} title={`Bookmarks (${student.bookmarks?.count || 0})`}>
          {student.bookmarks?.folders?.length ? (
            <ul className="space-y-1.5 text-xs">
              {student.bookmarks.folders.map(f => (
                <li key={f.name} className="flex items-center justify-between"><span className="font-bold text-slate-700 dark:text-slate-200">{f.name}</span><span className="text-slate-500">{f.count} {f.count === 1 ? 'question' : 'questions'}</span></li>
              ))}
            </ul>
          ) : <Empty>No bookmarks.</Empty>}
        </Panel>
      </div>

      <div className={`${card} p-6`}>
        <SectionTitle title={`Papers taken (${student.papers?.length || 0})`} subtitle="Every mock and PYQ paper the student submitted, including attempts that did not count" />
        {student.papers?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead><tr className="border-b border-border-light dark:border-border-dark">{['Paper', 'When', 'Score', 'Correct / wrong / skipped', 'Time', ''].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {student.papers.map((p, i) => (
                  <tr key={i}>
                    <td className={td}><span className="font-bold text-slate-800 dark:text-slate-200">{p.title}</span> <Pill tone="muted">{p.kind}</Pill></td>
                    <td className={`${td} text-slate-500 whitespace-nowrap`}>{fmtDateTime(p.at)}</td>
                    <td className={`${td} tabular-nums font-bold`}>{p.score ?? '–'} / {p.maxScore ?? '–'}</td>
                    <td className={`${td} tabular-nums`}>{p.correct ?? 0} / {p.incorrect ?? 0} / {p.unanswered ?? 0}</td>
                    <td className={`${td} tabular-nums text-slate-500`}>{p.timeTaken ? formatDuration(p.timeTaken) : '–'}</td>
                    <td className={td}>{p.counted ? <Pill tone="good">Counted</Pill> : <Pill tone="muted">Not counted</Pill>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No papers submitted.</Empty>}
      </div>

      <div className={`${card} p-6`}>
        <SectionTitle title={`Recent answers (${student.recentAnswers?.length || 0})`} subtitle="Latest practice answers, newest first" />
        {student.recentAnswers?.length ? (
          <ul className="divide-y divide-border-light dark:divide-border-dark text-xs">
            {student.recentAnswers.map(a => (
              <li key={a.questionId} className="py-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  {a.correct ? <CheckCircle size={14} className="text-emerald-500 shrink-0" /> : <XCircle size={14} className="text-rose-500 shrink-0" />}
                  <span className="truncate text-slate-700 dark:text-slate-200">{a.label}</span>
                  {a.type && <Pill tone="muted">{a.type}</Pill>}
                </span>
                <span className="text-slate-500 whitespace-nowrap">{a.attempts > 1 ? `${a.attempts} tries · ` : ''}{a.timeSpentSec ? `${a.timeSpentSec}s · ` : ''}{a.answeredAt ? timeAgo(a.answeredAt) : ''}</span>
              </li>
            ))}
          </ul>
        ) : <Empty>No practice answers yet.</Empty>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel icon={MessageSquare} title={`Forum posts (${student.posts?.length || 0})`}>
          {student.posts?.length ? (
            <ul className="space-y-3 text-xs">
              {student.posts.map((p, i) => (
                <li key={i} className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-500"><Pill tone={p.kind === 'Solution' ? 'info' : 'muted'}>{p.kind}</Pill><span className="truncate">{p.label}</span><span className="ml-auto whitespace-nowrap">{fmtDateTime(p.at)}</span></div>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{p.text}</p>
                  <p className="text-[10px] text-slate-400">{p.votes} votes · {p.replies} replies</p>
                </li>
              ))}
            </ul>
          ) : <Empty>No forum posts.</Empty>}
        </Panel>

        <div className="space-y-6">
          <Panel icon={NotebookPen} title={`Scratchpad notes (${student.notes?.length || 0})`}>
            {student.notes?.length ? (
              <ul className="space-y-3 text-xs">
                {student.notes.map(n => (
                  <li key={n.questionId} className="space-y-0.5">
                    <p className="text-slate-500">{n.label}</p>
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{n.text || <span className="text-slate-400">Drawing only</span>}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>No notes.</Empty>}
          </Panel>

          <Panel icon={Flag} title={`Issue reports (${student.reports?.length || 0})`}>
            {student.reports?.length ? (
              <ul className="space-y-3 text-xs">
                {student.reports.map(r => (
                  <li key={r.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-500"><Pill tone={r.status === 'resolved' ? 'good' : 'warning'}>{r.status}</Pill><span>{r.category}</span><span className="ml-auto whitespace-nowrap">{fmtDateTime(r.at)}</span></div>
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{r.message}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>No reports.</Empty>}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Panel({ icon: Icon, title, children }) {
  return (
    <div className={`${card} p-6 space-y-3`}>
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Icon size={15} className="text-primary" />{title}</h3>
      {children}
    </div>
  )
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="font-semibold text-slate-800 dark:text-slate-200 truncate">{children}</dd>
    </div>
  )
}

const Empty = ({ children }) => <p className="text-xs text-slate-400">{children}</p>

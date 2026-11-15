import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Target, Flame, ClipboardList, Clock, Activity, Package, School } from 'lucide-react'
import { api } from '../lib/api'
import { formatDuration, timeAgo } from '../../../src/utils/practiceStats'
import { activityStatus } from '../lib/instituteStats'
import { card, SectionTitle, StatTile, DailyBars, SubjectBars, MockTable, Spinner, ErrorBox, Pill, fmtPct, fmtDate } from '../components/ui'

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
        <SectionTitle title={`Mock tests (${student.mocks.length})`} />
        <MockTable mocks={student.mocks} />
      </div>
    </div>
  )
}

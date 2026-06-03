import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { Card, Button, Badge, Input } from '../common/UI';
import { FileText, Printer, Award, School } from 'lucide-react';
import { formatDate, gradeColor } from '../../utils/helpers';

export default function ReportsPage() {
  const { school } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const { data: classes } = useApi('/academics/classes');
  const { data: terms } = useApi('/academics/terms');
  const { data: studentsResp } = useApi(selectedClass ? `/students?class_id=${selectedClass}&limit=200` : null);

  const classList = Array.isArray(classes) ? classes : (classes?.classes || []);
  const termList = Array.isArray(terms) ? terms : (terms?.terms || []);
  const studentList = Array.isArray(studentsResp) ? studentsResp : (studentsResp?.students || []);

  const currentTerm = termList.find(t => t.is_current);
  useEffect(() => {
    if (currentTerm && !selectedTerm) setSelectedTerm(currentTerm.id);
  }, [currentTerm?.id]);

  const generateReport = async () => {
    if (!selectedStudentId || !selectedTerm) return;
    setReportLoading(true);
    setReportError(null);
    setReportData(null);
    try {
      const token = localStorage.getItem('sp_token');
      const res = await fetch(`/api/students/${selectedStudentId}/report-card/${selectedTerm}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load report card');
      setReportData(json.data);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="animate-fade-in">
      <style>{`
        @media print {
          aside, .mobile-header, .no-print { display: none !important; }
          .main-content { margin-left: 0 !important; padding: 0 !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border: none !important; page-break-inside: avoid; }
        }
      `}</style>

      {/* Page Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 700 }}>Report Cards</h2>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 4 }}>Generate and print student academic reports</p>
        </div>
        {reportData && (
          <Button onClick={handlePrint} icon={Printer}>Print Report Card</Button>
        )}
      </div>

      {/* Selector Card */}
      <Card className="no-print" style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-4)', alignItems: 'end' }}>
          <Input label="Term" type="select" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
            <option value="">Select term</option>
            {termList.map(t => <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' (Current)' : ''}</option>)}
          </Input>
          <Input label="Class" type="select" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudentId(''); setReportData(null); }}>
            <option value="">Select class</option>
            {classList.map(c => <option key={c.id} value={c.id}>{c.name} {c.section || ''}</option>)}
          </Input>
          <Input label="Student" type="select" value={selectedStudentId} onChange={e => { setSelectedStudentId(e.target.value); setReportData(null); }} disabled={!selectedClass}>
            <option value="">Select student</option>
            {studentList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
          </Input>
          <div style={{ paddingBottom: 'var(--sp-4)' }}>
            <Button onClick={generateReport} loading={reportLoading} disabled={!selectedStudentId || !selectedTerm} icon={FileText}>
              Generate Report
            </Button>
          </div>
        </div>
        {reportError && (
          <p style={{ color: 'var(--sp-danger)', fontSize: '0.8125rem', marginTop: 'var(--sp-2)' }}>
            {reportError}
          </p>
        )}
      </Card>

      {/* Empty State */}
      {!reportData && !reportLoading && (
        <Card style={{ padding: 'var(--sp-12)', textAlign: 'center' }} className="no-print">
          <Award size={48} style={{ color: 'var(--sp-slate-200)', marginBottom: 'var(--sp-4)' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 600, color: 'var(--sp-slate-600)', marginBottom: 'var(--sp-2)' }}>
            Select a student to view their report card
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--sp-slate-400)' }}>
            Choose a term, class, and student above, then click Generate Report
          </p>
        </Card>
      )}

      {/* Report Card */}
      {reportData && <ReportCard data={reportData} school={school} />}
    </div>
  );
}

/* ── Full Report Card Component ─────────────────────────────── */
function ReportCard({ data, school }) {
  const { student, term, academics, attendance, behavioural_traits } = data;
  const schoolData = data.school || school || {};

  // academics has { subjects: [...], summary: {...} } from generateReportCardData
  const grades = academics?.subjects || academics?.grades || [];
  const stats = academics?.summary || academics?.stats || {};

  const avg = stats.average || (grades.length ? (grades.reduce((s, g) => s + (g.total || 0), 0) / grades.length).toFixed(1) : 0);
  const totalScore = stats.total_score || grades.reduce((s, g) => s + (g.total || 0), 0);
  const highest = stats.highest || (grades.length ? Math.max(...grades.map(g => g.total || 0)) : 0);
  const lowest = stats.lowest || (grades.length ? Math.min(...grades.map(g => g.total || 0)) : 0);
  const position = stats.position || academics?.position;

  return (
    <div id="report-card">
      <Card className="print-card" style={{ marginBottom: 'var(--sp-4)', fontFamily: "'Inter', sans-serif" }}>

        {/* ── School Header ── */}
        <div style={{
          textAlign: 'center', paddingBottom: 'var(--sp-5)',
          borderBottom: '3px solid var(--sp-green-800)', marginBottom: 'var(--sp-5)',
        }}>
          {schoolData.logo_url && (
            <img src={schoolData.logo_url} alt="School Logo" style={{ height: 64, marginBottom: 'var(--sp-3)', objectFit: 'contain' }} />
          )}
          {!schoolData.logo_url && (
            <div style={{
              width: 60, height: 60, borderRadius: 14, margin: '0 auto var(--sp-3)',
              background: 'linear-gradient(135deg, var(--sp-green-800), var(--sp-green-600))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <School size={28} color="white" />
            </div>
          )}
          <h1 style={{ fontSize: '1.375rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--sp-green-900)', marginBottom: 4 }}>
            {schoolData.name || 'School Name'}
          </h1>
          {schoolData.address && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)', marginBottom: 2 }}>{schoolData.address}</p>
          )}
          {schoolData.motto && (
            <p style={{ fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--sp-slate-400)' }}>"{schoolData.motto}"</p>
          )}
          <div style={{ marginTop: 'var(--sp-3)', display: 'inline-block', padding: '4px 16px', background: 'var(--sp-green-900)', borderRadius: 'var(--radius-full)' }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'white', letterSpacing: '0.08em' }}>STUDENT ACADEMIC REPORT CARD</p>
          </div>
        </div>

        {/* ── Student Info Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-2) var(--sp-6)', marginBottom: 'var(--sp-5)', padding: 'var(--sp-4)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-border-subtle)' }}>
          <InfoRow label="Student Name" value={`${student?.first_name} ${student?.last_name}`} bold />
          <InfoRow label="Admission No." value={student?.admission_no} />
          <InfoRow label="Class" value={student?.class_name} />
          <InfoRow label="Term" value={term?.name} />
          <InfoRow label="Gender" value={student?.gender} capitalize />
          <InfoRow label="Date of Birth" value={formatDate(student?.date_of_birth)} />
        </div>

        {/* ── Performance Summary ── */}
        {grades.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)', padding: 'var(--sp-4)', background: 'var(--sp-green-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-green-200)' }}>
            <MiniStat label="Subjects" value={grades.length} color="var(--sp-green-700)" />
            <MiniStat label="Total Score" value={totalScore} color="var(--sp-green-800)" />
            <MiniStat label="Average" value={`${avg}%`} color="var(--sp-green-800)" />
            <MiniStat label="Highest" value={highest} color="var(--sp-success)" />
            <MiniStat label="Lowest" value={lowest} color="var(--sp-danger)" />
            {position && <MiniStat label="Class Pos." value={position} color="var(--sp-amber-700)" />}
          </div>
        )}

        {/* ── Grades Table ── */}
        {grades.length > 0 ? (
          <div style={{ overflowX: 'auto', marginBottom: 'var(--sp-5)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'var(--sp-green-900)', color: 'white' }}>
                  {['#', 'Subject', 'CA1\n(10)', 'CA2\n(10)', 'CA3\n(10)', 'Exam\n(70)', 'Total\n(100)', 'Grade', 'Remark', 'Class Pos.'].map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 10px', textAlign: i <= 1 ? 'left' : 'center',
                      fontWeight: 600, fontSize: '0.6875rem', whiteSpace: 'pre-line', lineHeight: 1.3,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grades.map((g, i) => (
                  <tr key={g.id || i} style={{ borderBottom: '1px solid var(--sp-border-subtle)', background: i % 2 === 0 ? 'white' : 'var(--sp-slate-50)' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--sp-slate-400)', fontSize: '0.75rem' }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{g.subject_name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{g.ca1 ?? g.ca1_score ?? '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{g.ca2 ?? g.ca2_score ?? '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{g.ca3 ?? g.ca3_score ?? '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{g.exam ?? g.exam_score ?? '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: '0.9375rem' }}>{g.total ?? '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      {(() => {
                        const letter = g.grade || g.grade_letter || '—';
                        return (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: '50%',
                            background: `${gradeColor(letter)}18`,
                            color: gradeColor(letter),
                            fontWeight: 800, fontSize: '0.75rem',
                          }}>
                            {letter}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '8px 10px', color: 'var(--sp-slate-500)', fontStyle: 'italic' }}>{g.remark || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--sp-slate-600)' }}>{g.position ?? g.class_position ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--sp-green-50)', borderTop: '2px solid var(--sp-green-200)' }}>
                  <td colSpan={6} style={{ padding: '8px 10px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--sp-green-900)' }}>Summary</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--sp-green-800)' }}>{avg}%</td>
                  <td colSpan={3} style={{ padding: '8px 10px', color: 'var(--sp-green-700)', fontWeight: 600, fontSize: '0.8125rem' }}>
                    Class Position: {position || '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--sp-slate-400)', marginBottom: 'var(--sp-5)' }}>
            <FileText size={32} style={{ marginBottom: 'var(--sp-2)' }} />
            <p style={{ fontWeight: 500 }}>No published grades for this term</p>
            <p style={{ fontSize: '0.8125rem', marginTop: 4 }}>Grades must be entered and published by the teacher first.</p>
          </div>
        )}

        {/* ── Attendance Summary ── */}
        {attendance && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-success-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sp-success)' }}>{attendance.present}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', marginTop: 2 }}>Days Present</p>
            </div>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-danger-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sp-danger)' }}>{attendance.absent}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', marginTop: 2 }}>Days Absent</p>
            </div>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-warning-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid #fed7aa' }}>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sp-warning)' }}>{attendance.late}</p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', marginTop: 2 }}>Days Late</p>
            </div>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--sp-border-subtle)' }}>
              <p style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sp-slate-700)' }}>
                {attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0}%
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', marginTop: 2 }}>Attendance Rate</p>
            </div>
          </div>
        )}

        {/* ── Behavioural Traits ── */}
        {behavioural_traits && (
          <div style={{ marginBottom: 'var(--sp-5)', padding: 'var(--sp-5)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-border-subtle)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--sp-4)', color: 'var(--sp-green-900)' }}>
              Behavioural & Affective Assessment
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
              {[
                ['Punctuality', behavioural_traits.punctuality],
                ['Attentiveness', behavioural_traits.attentiveness],
                ['Neatness', behavioural_traits.neatness],
                ['Politeness', behavioural_traits.politeness],
                ['Honesty', behavioural_traits.honesty],
                ['Self Control', behavioural_traits.self_control],
                ['Relationships', behavioural_traits.relationship_with_others],
                ['Leadership', behavioural_traits.leadership],
                ['Teamwork', behavioural_traits.teamwork],
                ['Critical Thinking', behavioural_traits.critical_thinking],
                ['Creativity', behavioural_traits.creativity],
                ['Sports & Games', behavioural_traits.sports],
              ].filter(([, v]) => v != null).map(([label, value]) => (
                <TraitBar key={label} label={label} value={value} />
              ))}
            </div>

            <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
              {behavioural_traits.class_teacher_remark && (
                <RemarkBox title="Class Teacher's Remark" text={behavioural_traits.class_teacher_remark} color="var(--sp-green-600)" bg="var(--sp-green-50)" />
              )}
              {behavioural_traits.head_teacher_remark && (
                <RemarkBox title="Head Teacher's Remark" text={behavioural_traits.head_teacher_remark} color="var(--sp-amber-500)" bg="var(--sp-amber-50)" />
              )}
            </div>
          </div>
        )}

        {/* ── Footer / Signature Lines ── */}
        <div style={{ borderTop: '1px dashed var(--sp-border)', paddingTop: 'var(--sp-5)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-4)' }}>
          {['Class Teacher', 'Head Teacher / Principal', 'Date / Stamp'].map(label => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid var(--sp-slate-400)', height: 36, marginBottom: 6 }} />
              <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-400)', textAlign: 'center', marginTop: 'var(--sp-4)' }}>
          Generated by SchoolPulse · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </Card>
    </div>
  );
}

/* ── Small helper components ──────────────────────────────── */
function InfoRow({ label, value, bold, capitalize }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'baseline' }}>
      <span style={{ color: 'var(--sp-slate-500)', fontSize: '0.8125rem', minWidth: 110, flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: bold ? 700 : 500, fontSize: '0.875rem', textTransform: capitalize ? 'capitalize' : 'none', color: 'var(--sp-slate-900)' }}>
        {value || '—'}
      </span>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: '1.375rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: color || 'var(--sp-slate-900)', lineHeight: 1.2 }}>{value}</p>
      <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', marginTop: 3 }}>{label}</p>
    </div>
  );
}

function TraitBar({ label, value }) {
  const pct = Math.min(100, (value / 5) * 100);
  const color = pct >= 80 ? 'var(--sp-success)' : pct >= 60 ? 'var(--sp-green-500)' : pct >= 40 ? 'var(--sp-amber-500)' : 'var(--sp-danger)';
  const display = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][Math.round(value)] || value;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--sp-slate-600)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{display}</span>
      </div>
      <div style={{ height: 6, background: 'var(--sp-slate-200)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 'var(--radius-full)', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function RemarkBox({ title, text, color, bg }) {
  return (
    <div style={{ padding: 'var(--sp-4)', background: bg, borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${color}` }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sp-slate-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <p style={{ fontSize: '0.875rem', color: 'var(--sp-slate-800)', lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}

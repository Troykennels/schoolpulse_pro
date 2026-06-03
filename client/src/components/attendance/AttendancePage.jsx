import { useEffect, useMemo, useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { Card, Button, Input, Badge, StatCard } from '../common/UI';
import { CalendarCheck, Check, X as XIcon, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

function groupedClasses(classes) {
  return classes.reduce((groups, cls) => {
    const key = cls.name?.startsWith('JSS') ? 'Junior Secondary' : cls.section || 'Senior Secondary';
    groups[key] = groups[key] || [];
    groups[key].push(cls);
    return groups;
  }, {});
}

export default function AttendancePage() {
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState([]);

  const { data: classes } = useApi('/academics/classes');
  const { data: terms } = useApi('/academics/terms');
  const { data: existing, loading, refetch } = useApi(
    classId && date ? `/attendance/class/${classId}/date/${date}` : null,
    { immediate: !!classId && !!date, deps: [classId, date] }
  );
  const { data: students } = useApi(classId ? `/students?class_id=${classId}&limit=100` : null, { immediate: !!classId, deps: [classId] });
  const { mutate, loading: saving } = useMutation();

  const termId = useMemo(() => (terms || []).find(t => t.is_current)?.id || terms?.[0]?.id || '', [terms]);
  const studentList = students?.students || students?.data || (Array.isArray(students) ? students : []);
  const attendanceRows = existing?.students || (Array.isArray(existing) ? existing : []);

  useEffect(() => {
    if (!classId) {
      setAttendance([]);
      return;
    }
    const source = attendanceRows.length ? attendanceRows : studentList;
    setAttendance(source.map(s => ({
      student_id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      status: s.status || 'present',
    })));
  }, [classId, studentList.length, attendanceRows.length, date]);

  const handleClassChange = (id) => {
    setClassId(id);
    setAttendance([]);
  };

  const toggleStatus = (idx, status) => {
    const updated = [...attendance];
    updated[idx] = { ...updated[idx], status };
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    if (!attendance.length) return;
    if (!termId) return toast.error('No active term found. Create or seed a current term first.');
    const payload = {
      class_id: classId, term_id: termId, date,
      records: attendance.map(a => ({ student_id: a.student_id, status: a.status }))
    };
    const { success: ok } = await mutate('/attendance', payload);
    if (ok) {
      toast.success('Attendance saved');
      refetch();
    } else {
      toast.error('Failed to save attendance');
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;

  const statusColors = {
    present: { bg: 'var(--sp-success-bg)', border: 'var(--sp-success)', text: 'var(--sp-success)' },
    absent: { bg: 'var(--sp-danger-bg)', border: 'var(--sp-danger)', text: 'var(--sp-danger)' },
    late: { bg: 'var(--sp-warning-bg)', border: 'var(--sp-warning)', text: 'var(--sp-warning)' },
    excused: { bg: 'var(--sp-info-bg)', border: 'var(--sp-info)', text: 'var(--sp-info)' },
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Attendance</h1>
        <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>Mark and track daily attendance</p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Input label="Class" type="select" value={classId} onChange={e => handleClassChange(e.target.value)}>
              <option value="">Select class</option>
              {Object.entries(groupedClasses(classes || [])).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </Input>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 180px', paddingBottom: 'var(--sp-4)', color: 'var(--sp-slate-500)', fontSize: '0.8125rem' }}>
            Term: {(terms || []).find(t => t.id === termId)?.name || 'No active term'}
          </div>
        </div>
      </Card>

      {/* Summary */}
      {attendance.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }} className="stagger-children">
          <StatCard label="Total" value={attendance.length} icon={Users} color="var(--sp-slate-600)" />
          <StatCard label="Present" value={presentCount} icon={Check} color="var(--sp-success)" />
          <StatCard label="Absent" value={absentCount} icon={XIcon} color="var(--sp-danger)" />
          <StatCard label="Late" value={lateCount} icon={Clock} color="var(--sp-warning)" />
        </div>
      )}

      {/* Attendance Grid */}
      {attendance.length > 0 ? (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Mark Attendance — {new Date(date).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <Button onClick={handleSubmit} loading={saving} icon={CalendarCheck}>Save Attendance</Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {attendance.map((a, i) => (
              <div key={a.student_id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--radius-md)',
                background: statusColors[a.status].bg,
                border: `1px solid ${statusColors[a.status].border}20`,
                transition: 'all var(--duration-fast)',
              }}>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--sp-slate-400)', marginRight: 'var(--sp-2)', fontSize: '0.75rem' }}>{i + 1}.</span>
                  {a.name}
                </span>

                <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
                  {['present', 'absent', 'late', 'excused'].map(status => (
                    <button
                      key={status}
                      onClick={() => toggleStatus(i, status)}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        border: a.status === status ? `2px solid ${statusColors[status].border}` : '2px solid transparent',
                        background: a.status === status ? statusColors[status].bg : 'var(--sp-surface)',
                        color: a.status === status ? statusColors[status].text : 'var(--sp-slate-400)',
                        fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer',
                        textTransform: 'capitalize', fontFamily: 'var(--font-body)',
                        transition: 'all var(--duration-fast)',
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : classId ? (
        <Card>
          <p style={{ textAlign: 'center', color: 'var(--sp-slate-400)', padding: 'var(--sp-8)' }}>No students found in this class</p>
        </Card>
      ) : null}
    </div>
  );
}

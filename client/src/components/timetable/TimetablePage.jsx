import { useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Modal } from '../common/UI';
import { formatTime } from '../../utils/helpers';
import { Clock, Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
];
const PERIOD_COLORS = [
  'var(--sp-green-100)', 'var(--sp-amber-100)', 'var(--sp-info-bg)',
  '#F3E8FF', '#DBEAFE', '#FCE7F3', '#FEF3C7', '#D1FAE5', '#E0E7FF', '#FEE2E2'
];

export default function TimetablePage() {
  const { isAdmin, isTeacher, user } = useAuth();
  const [classId, setClassId] = useState('');
  const [view, setView] = useState('class'); // class | teacher
  const [showCreate, setShowCreate] = useState(false);

  const { data: classes } = useApi('/academics/classes');
  const endpoint = view === 'class' && classId
    ? `/timetable/class/${classId}`
    : view === 'teacher'
      ? `/timetable/teacher/${user?.id}`
      : null;
  const { data: slots, loading, refetch } = useApi(endpoint, { immediate: !!endpoint, deps: [classId, view] });

  const timetableData = Array.isArray(slots)
    ? slots
    : slots
      ? Object.values(slots).flat()
      : [];

  // Group by day
  const byDay = {};
  DAYS.forEach(d => { byDay[d.key] = []; });
  timetableData.forEach(s => {
    if (byDay[s.day_of_week]) {
      byDay[s.day_of_week].push(s);
    }
  });
  // Sort each day by start_time
  Object.keys(byDay).forEach(d => {
    byDay[d].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  // Get unique time slots for grid
  const allTimes = [...new Set(timetableData.map(s => s.start_time))].sort();

  // Color map for subjects
  const subjectColors = {};
  let colorIdx = 0;
  timetableData.forEach(s => {
    const name = s.subject_name || s.subject;
    if (name && !subjectColors[name]) {
      subjectColors[name] = PERIOD_COLORS[colorIdx % PERIOD_COLORS.length];
      colorIdx++;
    }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Timetable</h1>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>Weekly class schedule</p>
        </div>
        {isTeacher && (
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <Button variant={view === 'class' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('class')}>Class View</Button>
            <Button variant={view === 'teacher' ? 'primary' : 'secondary'} size="sm" onClick={() => setView('teacher')}>My Schedule</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      {view === 'class' && (
        <Card style={{ marginBottom: 'var(--sp-4)' }}>
          <div style={{ maxWidth: 280 }}>
            <Input label="Class" type="select" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Select class</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Input>
          </div>
        </Card>
      )}

      {/* Timetable Grid */}
      {timetableData.length > 0 ? (
        <Card padding={false} style={{ overflow: 'hidden' }}>
          {/* Desktop grid */}
          <div style={{ overflowX: 'auto' }} className="timetable-desktop">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{
                    padding: 'var(--sp-3) var(--sp-4)', textAlign: 'left',
                    background: 'var(--sp-green-900)', color: 'white',
                    fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em',
                    fontFamily: 'var(--font-body)', width: 80,
                  }}>
                    <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> TIME
                  </th>
                  {DAYS.map(d => (
                    <th key={d.key} style={{
                      padding: 'var(--sp-3) var(--sp-4)', textAlign: 'center',
                      background: 'var(--sp-green-900)', color: 'white',
                      fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {d.label.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTimes.map((time, tIdx) => (
                  <tr key={time}>
                    <td style={{
                      padding: 'var(--sp-2) var(--sp-4)',
                      borderBottom: '1px solid var(--sp-border-subtle)',
                      fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sp-slate-500)',
                      background: 'var(--sp-slate-50)', whiteSpace: 'nowrap',
                    }}>
                      {formatTime(time)}
                    </td>
                    {DAYS.map(day => {
                      const slot = byDay[day.key].find(s => s.start_time === time);
                      return (
                        <td key={day.key} style={{
                          padding: 'var(--sp-1)',
                          borderBottom: '1px solid var(--sp-border-subtle)',
                          borderLeft: '1px solid var(--sp-border-subtle)',
                          verticalAlign: 'top',
                        }}>
                          {slot ? (
                            <div style={{
                              padding: 'var(--sp-2) var(--sp-3)',
                              borderRadius: 'var(--radius-md)',
                              background: subjectColors[slot.subject_name || slot.subject] || 'var(--sp-slate-100)',
                              border: '1px solid rgba(0,0,0,0.05)',
                              minHeight: 56,
                            }}>
                              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sp-slate-800)', lineHeight: 1.3 }}>
                                {slot.subject_name || slot.subject}
                              </p>
                              <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', marginTop: 2 }}>
                                {slot.teacher_name && `${slot.teacher_name} · `}
                                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                              </p>
                              {slot.room && (
                                <p style={{ fontSize: '0.625rem', color: 'var(--sp-slate-400)', marginTop: 2 }}>
                                  Room {slot.room}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--sp-slate-300)' }}>—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="timetable-mobile" style={{ display: 'none', padding: 'var(--sp-3)' }}>
            {DAYS.map(day => (
              byDay[day.key].length > 0 && (
                <div key={day.key} style={{ marginBottom: 'var(--sp-4)' }}>
                  <h4 style={{
                    fontSize: '0.8125rem', fontWeight: 700, color: 'var(--sp-green-800)',
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--sp-2)',
                    padding: 'var(--sp-1) 0', borderBottom: '2px solid var(--sp-green-200)',
                  }}>
                    {day.label}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {byDay[day.key].map((slot, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 'var(--sp-3)', alignItems: 'center',
                        padding: 'var(--sp-3)', borderRadius: 'var(--radius-md)',
                        background: subjectColors[slot.subject_name || slot.subject] || 'var(--sp-slate-50)',
                        border: '1px solid rgba(0,0,0,0.05)',
                      }}>
                        <div style={{ textAlign: 'center', minWidth: 50 }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sp-slate-700)' }}>{formatTime(slot.start_time)}</p>
                          <p style={{ fontSize: '0.625rem', color: 'var(--sp-slate-400)' }}>{formatTime(slot.end_time)}</p>
                        </div>
                        <div style={{ width: 1, height: 30, background: 'var(--sp-border)' }} />
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{slot.subject_name || slot.subject}</p>
                          <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)' }}>
                            {slot.teacher_name}{slot.room ? ` · Room ${slot.room}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </Card>
      ) : !loading && (classId || view === 'teacher') ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
            <Calendar size={40} style={{ color: 'var(--sp-slate-300)', margin: '0 auto var(--sp-3)' }} />
            <p style={{ color: 'var(--sp-slate-500)' }}>No timetable entries found</p>
          </div>
        </Card>
      ) : !classId && view === 'class' ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
            <Clock size={40} style={{ color: 'var(--sp-slate-300)', margin: '0 auto var(--sp-3)' }} />
            <p style={{ color: 'var(--sp-slate-500)' }}>Select a class to view the timetable</p>
          </div>
        </Card>
      ) : null}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      )}

      {isAdmin && (
        <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 20 }}>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>Add Timetable Slot</Button>
        </div>
      )}

      <CreateSlotModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        defaultClassId={classId}
        onSuccess={() => { setShowCreate(false); refetch(); }}
      />

      <style>{`
        @media (max-width: 767px) {
          .timetable-desktop { display: none !important; }
          .timetable-mobile { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function CreateSlotModal({ isOpen, onClose, defaultClassId, onSuccess }) {
  const [form, setForm] = useState({
    class_id: defaultClassId || '',
    subject_id: '',
    teacher_id: '',
    day_of_week: 'monday',
    start_time: '08:00',
    end_time: '08:45',
    room: '',
  });
  const { data: classes } = useApi('/academics/classes');
  const { data: subjects } = useApi('/academics/subjects');
  const { data: access } = useApi('/settings/access');
  const { mutate, loading } = useMutation();
  const teachers = (access?.users || []).filter((user) => user.role === 'teacher');
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.class_id || !form.subject_id || !form.teacher_id || !form.start_time || !form.end_time) {
      return toast.error('Class, subject, teacher and time are required');
    }
    const { success } = await mutate('/timetable', form);
    if (success) {
      toast.success('Timetable slot added');
      onSuccess();
    } else {
      toast.error('Could not add slot. Check for time conflicts.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Timetable Slot">
      <Input label="Class" type="select" value={form.class_id} onChange={e => set('class_id', e.target.value)}>
        <option value="">Select class</option>
        {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Input>
      <Input label="Subject" type="select" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
        <option value="">Select subject</option>
        {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Input>
      <Input label="Teacher" type="select" value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}>
        <option value="">Select teacher</option>
        {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
      </Input>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
        <Input label="Day" type="select" value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)}>
          {DAYS.map(day => <option key={day.key} value={day.key}>{day.label}</option>)}
        </Input>
        <Input label="Room" value={form.room} onChange={e => set('room', e.target.value)} placeholder="SS1-SCI" />
        <Input label="Start Time" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
        <Input label="End Time" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={loading} onClick={handleSubmit}>Save Slot</Button>
      </div>
    </Modal>
  );
}

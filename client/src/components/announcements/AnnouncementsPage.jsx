import { useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Modal, Badge, Tabs } from '../common/UI';
import { formatDate } from '../../utils/helpers';
import { Megaphone, Plus, AlertCircle, Users, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnnouncementsPage() {
  const { isAdmin, isTeacher, isParent } = useAuth();
  const [tab, setTab] = useState('announcements');
  const [showCreate, setShowCreate] = useState(false);
  const [showStudentUpdate, setShowStudentUpdate] = useState(false);
  const { data, loading, refetch } = useApi('/announcements');
  const { data: notifications, loading: notificationsLoading, refetch: refetchNotifications } = useApi('/notifications');

  const announcements = data?.data || data || [];
  const studentUpdates = notifications || [];

  const priorityBadge = (p) => p === 'high' ? 'danger' : p === 'urgent' ? 'warning' : 'default';
  const audienceIcon = (a) => a === 'parents' ? Users : a === 'teachers' ? MessageSquare : Megaphone;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Announcements</h1>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>School-wide communication and student-specific parent updates</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <Tabs tabs={[
            { key: 'announcements', label: 'Announcements' },
            { key: 'student_updates', label: isParent ? 'Child Updates' : 'Student Updates' },
          ]} active={tab} onChange={setTab} />
          {(isAdmin || isTeacher) && tab === 'announcements' && <Button icon={Plus} onClick={() => setShowCreate(true)}>New Announcement</Button>}
          {(isAdmin || isTeacher) && tab === 'student_updates' && <Button icon={Plus} onClick={() => setShowStudentUpdate(true)}>Student Update</Button>}
        </div>
      </div>

      {tab === 'announcements' && (loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : announcements.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} className="stagger-children">
          {announcements.map(a => {
            const AudienceIcon = audienceIcon(a.target_audience);
            return (
              <Card key={a.id} hover>
                <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: a.priority === 'high' ? 'var(--sp-danger-bg)' : 'var(--sp-green-50)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {a.priority === 'high' ? <AlertCircle size={20} style={{ color: 'var(--sp-danger)' }} /> : <AudienceIcon size={20} style={{ color: 'var(--sp-green-600)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{a.title}</h3>
                      <Badge variant={priorityBadge(a.priority)}>{a.priority}</Badge>
                      <Badge variant="green">{a.target_audience}</Badge>
                      {a.send_sms && <Badge variant="info">SMS</Badge>}
                      {a.send_whatsapp && <Badge variant="success">WhatsApp</Badge>}
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--sp-slate-600)', lineHeight: 1.6, marginBottom: 'var(--sp-2)' }}>{a.content}</p>
                    <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: '0.75rem', color: 'var(--sp-slate-400)' }}>
                      <span>By {a.author_name || 'Admin'}</span>
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
            <Megaphone size={40} style={{ color: 'var(--sp-slate-300)', margin: '0 auto var(--sp-3)' }} />
            <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.9375rem' }}>No announcements yet</p>
          </div>
        </Card>
      ))}

      {tab === 'student_updates' && <StudentUpdates updates={studentUpdates} loading={notificationsLoading} />}

      <CreateAnnouncementModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { refetch(); setShowCreate(false); }} />
      <StudentUpdateModal isOpen={showStudentUpdate} onClose={() => setShowStudentUpdate(false)} onSuccess={() => { refetchNotifications(); setShowStudentUpdate(false); }} />
    </div>
  );
}

function StudentUpdates({ updates, loading }) {
  if (loading) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--radius-lg)' }} />)}</div>;
  }

  if (!updates.length) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
          <MessageSquare size={40} style={{ color: 'var(--sp-slate-300)', margin: '0 auto var(--sp-3)' }} />
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.9375rem' }}>No student updates yet</p>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {updates.map((item) => (
        <Card key={item.id} hover>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-2)' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{item.title}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{item.student_first_name} {item.student_last_name} · {item.class_name} · {item.admission_no}</p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <Badge variant={item.priority === 'high' ? 'warning' : item.priority === 'urgent' ? 'danger' : 'default'}>{item.priority}</Badge>
              <Badge variant="green">{item.category}</Badge>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--sp-slate-700)', lineHeight: 1.6 }}>{item.message}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)', marginTop: 'var(--sp-3)' }}>By {item.author_name} · {formatDate(item.created_at)}</p>
        </Card>
      ))}
    </div>
  );
}

function StudentUpdateModal({ isOpen, onClose, onSuccess }) {
  const [classId, setClassId] = useState('');
  const [form, setForm] = useState({ student_id: '', title: '', message: '', category: 'general', priority: 'normal' });
  const { data: classes } = useApi('/academics/classes');
  const { data: studentsData } = useApi(classId ? `/students?class_id=${classId}&limit=100` : null, { immediate: !!classId, deps: [classId] });
  const { mutate, loading } = useMutation();

  const students = studentsData?.students || studentsData?.data || studentsData || [];
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.student_id || !form.title || !form.message) return toast.error('Select a student and write the update');
    const { success: ok } = await mutate('/notifications', form);
    if (ok) {
      toast.success('Student update sent to parent portal');
      onSuccess();
    } else {
      toast.error('Failed to send update');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Parent Update">
      <Input label="Class" type="select" value={classId} onChange={e => { setClassId(e.target.value); set('student_id', ''); }}>
        <option value="">Select class</option>
        {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Input>
      <Input label="Student" type="select" value={form.student_id} onChange={e => set('student_id', e.target.value)} disabled={!classId}>
        <option value="">Select student</option>
        {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
      </Input>
      <Input label="Title" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Assignment Support Required" />
      <Input label="Message" type="textarea" value={form.message} onChange={e => set('message', e.target.value)} placeholder="Write the note parents should see..." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
        <Input label="Category" type="select" value={form.category} onChange={e => set('category', e.target.value)}>
          <option value="academic">Academic</option>
          <option value="attendance">Attendance</option>
          <option value="fees">Fees</option>
          <option value="behaviour">Behaviour</option>
          <option value="health">Health</option>
          <option value="general">General</option>
        </Input>
        <Input label="Priority" type="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Input>
      </div>
      <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} icon={Send}>Send Update</Button>
      </div>
    </Modal>
  );
}

function CreateAnnouncementModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: '', content: '', target_audience: 'all', priority: 'normal',
    send_sms: false, send_whatsapp: false
  });
  const { mutate, loading } = useMutation();
  const set = (k, v) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!form.title || !form.content) return toast.error('Title and content required');
    const { success: ok } = await mutate('/announcements', form);
    if (ok) {
      toast.success('Announcement created');
      onSuccess();
    } else {
      toast.error('Failed to create announcement');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Announcement">
      <Input label="Title *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Mid-Term Examination Schedule" />
      <Input label="Content *" type="textarea" value={form.content} onChange={e => set('content', e.target.value)} placeholder="Write your announcement here..." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
        <Input label="Target Audience" type="select" value={form.target_audience} onChange={e => set('target_audience', e.target.value)}>
          <option value="all">Everyone</option>
          <option value="parents">Parents Only</option>
          <option value="teachers">Teachers Only</option>
          <option value="students">Students Only</option>
          <option value="staff">All Staff</option>
        </Input>
        <Input label="Priority" type="select" value={form.priority} onChange={e => set('priority', e.target.value)}>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Input>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input type="checkbox" checked={form.send_sms} onChange={e => set('send_sms', e.target.checked)} />
          Send SMS
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input type="checkbox" checked={form.send_whatsapp} onChange={e => set('send_whatsapp', e.target.checked)} />
          Send WhatsApp
        </label>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} icon={Send}>Publish</Button>
      </div>
    </Modal>
  );
}

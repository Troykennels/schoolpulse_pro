import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../hooks/useApi';
import { Card, Button, Badge, Input, Modal, StatCard } from '../common/UI';
import { ShieldAlert, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { formatDate, disciplineCategoryColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = ['minor', 'moderate', 'major', 'critical'];
const INFRACTION_TYPES = ['tardiness', 'dress_code', 'disruptive_behavior', 'bullying', 'cheating', 'property_damage', 'substance', 'fighting', 'insubordination', 'other'];

export default function DisciplinesPage() {
  const { user } = useAuth();
  const isAdmin = ['school_admin', 'super_admin'].includes(user?.role);
  const canCreate = ['school_admin', 'super_admin', 'teacher'].includes(user?.role);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');

  const { data, loading, refetch } = useApi('/disciplines');
  const { mutate: save, loading: saving } = useMutation();
  const records = data?.records || [];

  const [form, setForm] = useState({ student_id: '', title: '', description: '', category: 'minor', infraction_type: 'other', action_taken: '', demerit_points: 0, parent_notified: false });
  const set = (k, v) => setForm({ ...form, [k]: v });

  // Stats
  const stats = {
    total: records.length,
    pending: records.filter(r => r.status === 'pending' || r.status === 'under_review').length,
    resolved: records.filter(r => r.status === 'resolved').length,
    totalDemerits: records.reduce((s, r) => s + (r.demerit_points || 0), 0),
  };

  const handleSave = async () => {
    if (!form.student_id || !form.title || !form.description) return toast.error('Student, title, and description are required');
    const { success } = await save('/disciplines', form);
    if (success) { toast.success('Record created'); setShowForm(false); refetch(); }
  };

  const handleResolve = async (id) => {
    const { success } = await save(`/disciplines/${id}`, { status: 'resolved' }, 'PUT');
    if (success) { toast.success('Marked resolved'); refetch(); }
  };

  const filtered = filter ? records.filter(r => r.category === filter) : records;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-6)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 700 }}>Discipline Records</h2>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 4 }}>Track and manage student behaviour incidents</p>
        </div>
        {canCreate && <Button onClick={() => setShowForm(true)}><Plus size={16} /> Report Incident</Button>}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }} className="stagger-children">
        <StatCard label="Total Incidents" value={stats.total} icon={<ShieldAlert size={20} />} color="var(--sp-slate-600)" />
        <StatCard label="Pending Review" value={stats.pending} icon={<AlertTriangle size={20} />} color="var(--sp-warning)" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle size={20} />} color="var(--sp-success)" />
        <StatCard label="Total Demerits" value={stats.totalDemerits} icon={<XCircle size={20} />} color="var(--sp-danger)" />
      </div>

      {/* Filter */}
      <Card style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-3) var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('')} style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--sp-border)', background: !filter ? 'var(--sp-green-600)' : 'transparent', color: !filter ? 'white' : 'var(--sp-slate-600)', cursor: 'pointer', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>All</button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', border: `1px solid ${disciplineCategoryColor(c)}22`, background: filter === c ? disciplineCategoryColor(c) : 'transparent', color: filter === c ? 'white' : disciplineCategoryColor(c), cursor: 'pointer', fontSize: '0.8125rem', fontFamily: 'var(--font-body)', textTransform: 'capitalize' }}>{c}</button>
          ))}
        </div>
      </Card>

      {/* Records */}
      {loading ? (
        <Card style={{ padding: 'var(--sp-10)', textAlign: 'center' }}><p style={{ color: 'var(--sp-slate-400)' }}>Loading...</p></Card>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
          <ShieldAlert size={40} style={{ color: 'var(--sp-slate-300)', marginBottom: 'var(--sp-3)' }} />
          <p style={{ color: 'var(--sp-slate-500)' }}>No discipline records found</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} className="stagger-children">
          {filtered.map(rec => (
            <Card key={rec.id} style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 4 }}>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9375rem' }}>{rec.title}</h4>
                    <Badge style={{ background: disciplineCategoryColor(rec.category) + '18', color: disciplineCategoryColor(rec.category) }}>{rec.category}</Badge>
                    <Badge variant={rec.status === 'resolved' ? 'success' : rec.status === 'dismissed' ? 'default' : 'warning'}>{rec.status}</Badge>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>
                    <strong>{rec.student_name}</strong> ({rec.admission_no}) — {rec.class_name} • {formatDate(rec.incident_date || rec.created_at)}
                  </p>
                </div>
                {rec.demerit_points > 0 && (
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sp-danger)', background: 'var(--sp-danger-bg)', padding: '2px 10px', borderRadius: 'var(--radius-full)' }}>
                    {rec.demerit_points} pts
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-600)', lineHeight: 1.6, marginBottom: 'var(--sp-2)' }}>{rec.description}</p>
              {rec.action_taken && <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}><strong>Action:</strong> {rec.action_taken}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-2)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)' }}>Reported by: {rec.reporter_name}{rec.parent_notified ? ' • Parent notified' : ''}</p>
                {rec.status !== 'resolved' && rec.status !== 'dismissed' && isAdmin && (
                  <Button size="sm" variant="secondary" onClick={() => handleResolve(rec.id)}>Mark Resolved</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Incident Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Report Discipline Incident" width={520}>
        <Input label="Student ID" placeholder="Enter student UUID" value={form.student_id} onChange={e => set('student_id', e.target.value)} />
        <Input label="Incident Title" value={form.title} onChange={e => set('title', e.target.value)} />
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--sp-slate-700)', marginBottom: 4 }}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-border)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', resize: 'vertical', background: 'var(--sp-slate-50)', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--sp-slate-700)', marginBottom: 4 }}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-border)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: 'var(--sp-slate-50)' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--sp-slate-700)', marginBottom: 4 }}>Type</label>
            <select value={form.infraction_type} onChange={e => set('infraction_type', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-border)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', background: 'var(--sp-slate-50)' }}>
              {INFRACTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
        </div>
        <Input label="Action Taken" value={form.action_taken} onChange={e => set('action_taken', e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)', alignItems: 'center' }}>
          <Input label="Demerit Points" type="number" value={form.demerit_points} onChange={e => set('demerit_points', parseInt(e.target.value) || 0)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: '0.8125rem', cursor: 'pointer', marginTop: 'var(--sp-4)' }}>
            <input type="checkbox" checked={form.parent_notified} onChange={e => set('parent_notified', e.target.checked)} />
            Notify Parent
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>Submit Report</Button>
        </div>
      </Modal>
    </div>
  );
}

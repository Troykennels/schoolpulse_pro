import { useState } from 'react';
import { useQuery, useMutation } from '../../hooks/useApi';
import { Button, Input, Modal, Badge, Card } from '../common/UI';
import { UserPlus, Search, Filter, UserCog, Mail, Phone, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffPage() {
  const { data: users = [], refetch } = useQuery('/users');
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', role: 'teacher', password: '' });
  const createUser = useMutation('post', '/auth/register');

  const staffUsers = users.filter(u => ['teacher', 'accountant', 'staff', 'school_admin'].includes(u.role));
  const filtered = staffUsers.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      return toast.error('Please fill all required fields');
    }
    try {
      await createUser.mutate(form);
      toast.success('Staff member created');
      setShowAdd(false);
      setForm({ first_name: '', last_name: '', email: '', phone: '', role: 'teacher', password: '' });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const roleBadge = { teacher: '#3b82f6', accountant: '#f59e0b', staff: '#8b5cf6', school_admin: '#22A97A', super_admin: '#ef4444' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>Staff & HR</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{staffUsers.length} staff members</p>
        </div>
        <Button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#22A97A', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          <UserPlus size={16} /> Add Staff
        </Button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(u => (
          <div key={u.id} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #f0f0f0', transition: 'box-shadow 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#22A97A' }}>
                {u.first_name?.[0]}{u.last_name?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{u.first_name} {u.last_name}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: roleBadge[u.role] || '#6b7280', background: `${roleBadge[u.role] || '#6b7280'}15`, padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>
                  {u.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {u.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} /> {u.email}</div>}
              {u.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} /> {u.phone}</div>}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <UserCog size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>No staff members found</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Click "Add Staff" to create user accounts</p>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Staff Member" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>First Name *</label>
                <Input value={form.first_name} onChange={e => u('first_name', e.target.value)} placeholder="First name" /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Last Name *</label>
                <Input value={form.last_name} onChange={e => u('last_name', e.target.value)} placeholder="Last name" /></div>
            </div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Email *</label>
              <Input type="email" value={form.email} onChange={e => u('email', e.target.value)} placeholder="email@school.edu" /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Phone</label>
              <Input value={form.phone} onChange={e => u('phone', e.target.value)} placeholder="+234..." /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Role *</label>
              <select value={form.role} onChange={e => u('role', e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                <option value="teacher">Teacher</option>
                <option value="accountant">Accountant</option>
                <option value="staff">Staff</option>
                <option value="school_admin">School Admin</option>
              </select></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Password * (min 8 chars)</label>
              <Input type="password" value={form.password} onChange={e => u('password', e.target.value)} placeholder="Set initial password" /></div>
            <button onClick={handleCreate} disabled={createUser.loading}
              style={{ marginTop: 8, padding: 12, borderRadius: 8, background: '#22A97A', color: 'white', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {createUser.loading ? 'Creating...' : 'Create Staff Account'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

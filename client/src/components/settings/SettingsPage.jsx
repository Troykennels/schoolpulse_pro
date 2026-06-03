import { useEffect, useState } from 'react';
import { Card, Badge, DataTable, StatCard, Button, Modal, Input } from '../common/UI';
import { useApi, useMutation } from '../../hooks/useApi';
import { Users, GraduationCap, ShieldCheck, UserRoundCheck, UserPlus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const { data, loading, refetch } = useApi('/settings/access');
  const { mutate: disableUser } = useMutation('delete');

  const users = (data?.users || []).filter((user) => {
    const term = search.toLowerCase();
    return !term || `${user.first_name} ${user.last_name} ${user.email} ${user.phone} ${user.role}`.toLowerCase().includes(term);
  });
  const students = data?.students || [];
  const classes = data?.classes || [];

  const userColumns = [
    { header: 'Name', key: 'name', render: r => <div><p style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</p><p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-500)' }}>{r.email}</p></div> },
    { header: 'Role', key: 'role', render: r => <Badge variant={r.role === 'school_admin' ? 'success' : r.role === 'teacher' ? 'green' : r.role === 'parent' ? 'info' : 'warning'}>{r.role.replace('_', ' ')}</Badge> },
    { header: 'Phone', key: 'phone', nowrap: true },
    { header: 'Status', key: 'is_active', render: r => <Badge variant={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Active' : 'Disabled'}</Badge> },
    {
      header: '', key: 'actions', align: 'right', render: r => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(r)}>Edit</Button>
          <Button variant="ghost" size="sm" icon={Trash2} disabled={!r.is_active} onClick={() => handleDisable(r)}>Disable</Button>
        </div>
      )
    },
  ];

  const studentColumns = [
    { header: 'Student', key: 'student', render: r => <div><p style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</p><p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-500)' }}>{r.admission_no}</p></div> },
    { header: 'Class', key: 'class_name' },
    { header: 'Parent Login', key: 'parent_email', render: r => <div><p>{r.parent_email || 'Not linked'}</p><p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-500)' }}>{r.parent_phone}</p></div> },
  ];

  const handleDisable = async (user) => {
    if (!window.confirm(`Disable login for ${user.first_name} ${user.last_name}?`)) return;
    const { success } = await disableUser(`/users/${user.id}`);
    if (success) {
      toast.success('User disabled');
      refetch();
    } else {
      toast.error('Could not disable user');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Settings</h1>
            <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>
              Admin-only access control, login visibility, class ownership, and parent-child links.
            </p>
          </div>
          <Button icon={UserPlus} onClick={() => setShowCreate(true)}>Add User</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <StatCard label="User Accounts" value={users.length} icon={Users} color="var(--sp-green-600)" />
        <StatCard label="Parent Logins" value={data?.counts?.parent || 0} icon={UserRoundCheck} color="var(--sp-info)" />
        <StatCard label="Teachers" value={data?.counts?.teacher || 0} icon={GraduationCap} color="var(--sp-amber-600)" />
        <StatCard label="Admin Control" value="Enabled" icon={ShieldCheck} color="var(--sp-green-700)" />
      </div>

      <Card style={{ marginBottom: 'var(--sp-5)' }}>
        <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>Class Ownership</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)' }}>
          {classes.map((cls) => (
            <div key={cls.id} style={{ padding: 'var(--sp-3)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontWeight: 700 }}>{cls.name}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{cls.class_teacher || 'No teacher assigned'}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card padding={false} style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ padding: 'var(--sp-5)', borderBottom: '1px solid var(--sp-border-subtle)', display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Login Accounts</h3>
          <div style={{ width: 260 }}>
            <Input icon={Search} placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 0 }} />
          </div>
        </div>
        <DataTable columns={userColumns} data={users} loading={loading} emptyMessage="No accounts found" />
      </Card>

      <Card padding={false}>
        <div style={{ padding: 'var(--sp-5)', borderBottom: '1px solid var(--sp-border-subtle)' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Parent-Child Portal Links</h3>
        </div>
        <DataTable columns={studentColumns} data={students} loading={loading} emptyMessage="No linked students found" />
      </Card>

      <CreateUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); refetch(); }} />
      <CreateUserModal isOpen={!!editing} initialUser={editing} onClose={() => setEditing(null)} onSuccess={() => { setEditing(null); refetch(); }} />
    </div>
  );
}

function CreateUserModal({ isOpen, onClose, onSuccess, initialUser = null }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'teacher',
    password: 'password123',
    avatar_url: '',
    qualification: '',
    address: '',
  });
  const { mutate: createUser, loading: creating } = useMutation();
  const { mutate: updateUser, loading: updating } = useMutation('put');
  const loading = creating || updating;
  const set = (key, value) => setForm({ ...form, [key]: value });

  useEffect(() => {
    if (!initialUser) return;
    setForm({
      id: initialUser.id,
      first_name: initialUser.first_name || '',
      last_name: initialUser.last_name || '',
      email: initialUser.email || '',
      phone: initialUser.phone || '',
      role: initialUser.role || 'teacher',
      password: '',
      avatar_url: initialUser.avatar_url || '',
      qualification: initialUser.qualification || '',
      address: initialUser.address || '',
    });
  }, [initialUser]);

  const handleSubmit = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.role) {
      return toast.error('Name, email and role are required');
    }

    const payload = { ...form };
    if (initialUser) delete payload.password;
    const { success } = initialUser
      ? await updateUser(`/users/${initialUser.id}`, payload)
      : await createUser('/users', payload);
    if (success) {
      toast.success(initialUser ? 'User account updated' : 'User account created');
      onSuccess();
    } else {
      toast.error('Could not create user');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialUser ? 'Edit User Account' : 'Add User Account'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
        <Input label="First Name" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
        <Input label="Last Name" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
        <Input label="Email/Login" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
        <Input label="Role" type="select" value={form.role} onChange={e => set('role', e.target.value)}>
          <option value="teacher">Teacher</option>
          <option value="parent">Parent</option>
          <option value="student">Student</option>
          <option value="accountant">Accountant</option>
          <option value="staff">Staff</option>
          <option value="school_admin">School Admin</option>
        </Input>
        {!initialUser && <Input label="Temporary Password" value={form.password} onChange={e => set('password', e.target.value)} />}
      </div>
      <Input label="Profile Photo URL" value={form.avatar_url} onChange={e => set('avatar_url', e.target.value)} placeholder="https://..." />
      <Input label="Qualification / Staff Note" value={form.qualification} onChange={e => set('qualification', e.target.value)} placeholder="B.Ed Mathematics" />
      <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={loading} onClick={handleSubmit}>{initialUser ? 'Save Changes' : 'Create Login'}</Button>
      </div>
    </Modal>
  );
}

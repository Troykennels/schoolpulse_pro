import { useEffect, useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Input, Modal, DataTable, Badge, Avatar, Tabs } from '../common/UI';
import { formatDate } from '../../utils/helpers';
import { Plus, Search, UserPlus, Eye, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

function groupedClasses(classes) {
  return classes.reduce((groups, cls) => {
    const key = cls.name?.startsWith('JSS') ? 'Junior Secondary' : cls.section || 'Senior Secondary';
    groups[key] = groups[key] || [];
    groups[key].push(cls);
    return groups;
  }, {});
}

export default function StudentsPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);

  const queryParams = `?page=${page}&limit=25${search ? `&search=${search}` : ''}${classFilter ? `&class_id=${classFilter}` : ''}`;
  const { data, loading, refetch } = useApi(`/students${queryParams}`, { deps: [page, search, classFilter] });
  const { data: classes } = useApi('/academics/classes');
  const { data: access } = useApi(isAdmin ? '/settings/access' : null, { immediate: isAdmin });
  const { mutate, loading: saving } = useMutation();
  const { mutate: updateStudent, loading: updating } = useMutation('put');
  const { mutate: deleteStudent, loading: deleting } = useMutation('delete');

  const students = data?.students || (Array.isArray(data) ? data : []);

  const columns = [
    {
      header: 'Student', key: 'name', render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <Avatar firstName={row.first_name} lastName={row.last_name} size={32} />
          <div>
            <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{row.first_name} {row.last_name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)' }}>{row.admission_no}</p>
          </div>
        </div>
      )
    },
    { header: 'Class', key: 'class_name', nowrap: true },
    { header: 'Gender', key: 'gender', render: r => <Badge variant={r.gender === 'male' ? 'info' : 'amber'}>{r.gender === 'male' ? 'Male' : 'Female'}</Badge> },
    { header: 'D.O.B', key: 'date_of_birth', render: r => formatDate(r.date_of_birth), nowrap: true },
    { header: 'Parent Phone', key: 'parent_phone', nowrap: true },
    {
      header: '', key: 'actions', align: 'right', render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' }}>
          <Button variant="ghost" size="sm" icon={Eye} onClick={(e) => { e.stopPropagation(); setSelected(row); }}>View</Button>
          {isAdmin && <Button variant="ghost" size="sm" icon={Pencil} onClick={(e) => { e.stopPropagation(); setEditing(row); }}>Edit</Button>}
          {isAdmin && <Button variant="ghost" size="sm" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>Withdraw</Button>}
        </div>
      )
    },
  ];

  const handleAdd = async (formData) => {
    const { success: ok, data: created } = await mutate('/students', formData);
    if (ok) {
      const parentLogin = created?.parent?.email ? ` Parent login: ${created.parent.email}` : '';
      toast.success(`Student added successfully.${parentLogin}`);
      setShowAdd(false);
      refetch();
    } else {
      toast.error('Failed to add student');
    }
  };

  const handleEdit = async (formData) => {
    const payload = { ...formData };
    delete payload.parent;
    const { success: ok } = await updateStudent(`/students/${editing.id}`, payload);
    if (ok) {
      toast.success('Student updated');
      setEditing(null);
      refetch();
    } else {
      toast.error('Failed to update student');
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Withdraw ${student.first_name} ${student.last_name}?`)) return;
    const { success: ok } = await deleteStudent(`/students/${student.id}`);
    if (ok) {
      toast.success('Student withdrawn');
      refetch();
    } else {
      toast.error('Failed to withdraw student');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Students</h1>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>
            {Array.isArray(students) ? students.length : 0} students enrolled
          </p>
        </div>
        <Button icon={UserPlus} onClick={() => setShowAdd(true)}>Add Student</Button>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <Input
              icon={Search}
              placeholder="Search by name or admission no..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div style={{ flex: '0 1 200px' }}>
            <Input type="select" value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1); }}>
              <option value="">All Classes</option>
              {Object.entries(groupedClasses(classes || [])).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </Input>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        <DataTable columns={columns} data={students} loading={loading} onRowClick={setSelected} emptyMessage="No students found" />
      </Card>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAdd}
        classes={classes || []}
        parents={(access?.users || []).filter(u => u.role === 'parent')}
        loading={saving}
      />

      <AddStudentModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
        classes={classes || []}
        parents={(access?.users || []).filter(u => u.role === 'parent')}
        loading={updating || deleting}
        initialStudent={editing}
        mode="edit"
      />

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function AddStudentModal({ isOpen, onClose, onSubmit, classes, parents, loading, initialStudent = null, mode = 'create' }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: 'male', date_of_birth: '',
    class_id: '', admission_no: '', parent_id: '', photo_url: '', address: '',
    blood_group: '', genotype: '', state_of_origin: '', religion: '',
    parent: { first_name: '', last_name: '', email: '', phone: '', password: 'password123', address: '' }
  });

  useEffect(() => {
    if (!initialStudent) return;
    setForm({
      first_name: initialStudent.first_name || '',
      last_name: initialStudent.last_name || '',
      gender: initialStudent.gender || 'male',
      date_of_birth: initialStudent.date_of_birth ? initialStudent.date_of_birth.slice(0, 10) : '',
      class_id: initialStudent.class_id || '',
      admission_no: initialStudent.admission_no || '',
      parent_id: initialStudent.parent_id || '',
      photo_url: initialStudent.photo_url || '',
      address: initialStudent.address || '',
      blood_group: initialStudent.blood_group || '',
      genotype: initialStudent.genotype || '',
      state_of_origin: initialStudent.state_of_origin || '',
      religion: initialStudent.religion || '',
      parent: { first_name: '', last_name: '', email: '', phone: '', password: 'password123', address: '' },
    });
  }, [initialStudent]);

  const set = (k, v) => setForm({ ...form, [k]: v });
  const setParent = (k, v) => setForm({ ...form, parent: { ...form.parent, [k]: v } });

  const handleSubmit = () => {
    if (!form.first_name || !form.last_name || !form.class_id || !form.admission_no) {
      return toast.error('Please fill required fields');
    }
    const payload = { ...form };
    const parentComplete = payload.parent?.first_name && payload.parent?.last_name && payload.parent?.email;
    if (mode === 'create' && !payload.parent_id && !parentComplete) {
      return toast.error('Add parent details or link an existing parent login');
    }
    if (!parentComplete) delete payload.parent;
    onSubmit(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'edit' ? 'Edit Student' : 'Add New Student'} width={720}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-4)' }}>
        <Input label="First Name *" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Tunde" />
        <Input label="Last Name *" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Bakare" />
        <Input label="Gender *" type="select" value={form.gender} onChange={e => set('gender', e.target.value)}>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </Input>
        <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
        <Input label="Class *" type="select" value={form.class_id} onChange={e => set('class_id', e.target.value)}>
          <option value="">Select class</option>
          {Object.entries(groupedClasses(classes)).map(([group, items]) => (
            <optgroup key={group} label={group}>
              {items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </Input>
        <Input label="Admission No *" value={form.admission_no} onChange={e => set('admission_no', e.target.value)} placeholder="GMS/2025/001" />
        <Input label="Existing Parent Login" type="select" value={form.parent_id || ''} onChange={e => set('parent_id', e.target.value || null)}>
          <option value="">Create/link from parent details below</option>
          {parents.map(parent => <option key={parent.id} value={parent.id}>{parent.first_name} {parent.last_name} - {parent.email}</option>)}
        </Input>
        <Input label="Blood Group" type="select" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
          <option value="">Select</option>
          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
        </Input>
        <Input label="Genotype" type="select" value={form.genotype} onChange={e => set('genotype', e.target.value)}>
          <option value="">Select</option>
          {['AA','AS','AC','SS','SC'].map(g => <option key={g} value={g}>{g}</option>)}
        </Input>
        <Input label="State of Origin" value={form.state_of_origin} onChange={e => set('state_of_origin', e.target.value)} placeholder="Lagos" />
        <Input label="Religion" type="select" value={form.religion} onChange={e => set('religion', e.target.value)}>
          <option value="">Select</option>
          <option value="Christianity">Christianity</option>
          <option value="Islam">Islam</option>
          <option value="Traditional">Traditional</option>
          <option value="Other">Other</option>
        </Input>
      </div>
      <Input label="Profile Photo URL" value={form.photo_url} onChange={e => set('photo_url', e.target.value)} placeholder="https://..." />
      <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="14 Adelabu Street, Surulere" />
      {mode === 'create' && !form.parent_id && (
        <>
          <div style={{ margin: 'var(--sp-4) 0', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--sp-border-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 'var(--sp-3)' }}>Parent Login Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-4)' }}>
              <Input label="Parent First Name *" value={form.parent.first_name} onChange={e => setParent('first_name', e.target.value)} />
              <Input label="Parent Last Name *" value={form.parent.last_name} onChange={e => setParent('last_name', e.target.value)} />
              <Input label="Parent Email/Login *" type="email" value={form.parent.email} onChange={e => setParent('email', e.target.value)} />
              <Input label="Parent Phone" value={form.parent.phone} onChange={e => setParent('phone', e.target.value)} />
              <Input label="Temporary Password" value={form.parent.password} onChange={e => setParent('password', e.target.value)} />
              <Input label="Parent Address" value={form.parent.address} onChange={e => setParent('address', e.target.value)} />
            </div>
          </div>
        </>
      )}
      <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} icon={mode === 'edit' ? Pencil : Plus}>{mode === 'edit' ? 'Save Changes' : 'Add Student'}</Button>
      </div>
    </Modal>
  );
}

function StudentDetailModal({ student, onClose }) {
  if (!student) return null;

  const fields = [
    ['Admission No', student.admission_no],
    ['Class', student.class_name],
    ['Gender', student.gender === 'male' ? 'Male' : 'Female'],
    ['Date of Birth', formatDate(student.date_of_birth)],
    ['Blood Group', student.blood_group],
    ['Genotype', student.genotype],
    ['State of Origin', student.state_of_origin],
    ['Religion', student.religion],
    ['Parent Phone', student.parent_phone],
    ['Address', student.address],
  ].filter(([, v]) => v);

  return (
    <Modal isOpen={!!student} onClose={onClose} title="Student Profile" width={520}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <Avatar firstName={student.first_name} lastName={student.last_name} size={56} />
        <div>
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {student.first_name} {student.last_name}
          </h3>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem' }}>{student.class_name}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
        {fields.map(([label, val]) => (
          <div key={label} style={{ padding: 'var(--sp-3)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 2, color: 'var(--sp-slate-800)' }}>{val}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { Card, Button, Input, Modal, DataTable, Badge, Tabs } from '../common/UI';
import { gradeColor, formatDate } from '../../utils/helpers';
import { BookOpen, Upload, CheckCircle, UserCog, Clock, Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function AcademicsPage() {
  const { isTeacher, isAdmin } = useAuth();
  const [tab, setTab] = useState('grades');
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const { data: classes, refetch: refetchClasses } = useApi('/academics/classes');
  const { data: terms, refetch: refetchTerms } = useApi('/academics/terms');
  const { data: grades, loading, refetch } = useApi(
    classId && termId ? `/academics/grades/class/${classId}/term/${termId}` : null,
    { immediate: !!classId && !!termId, deps: [classId, termId] }
  );
  const { data: subjects, refetch: refetchSubjects } = useApi('/academics/subjects');

  const currentTerm = (terms || []).find(t => t.is_current);

  useEffect(() => {
    if (currentTerm && !termId) setTermId(currentTerm.id);
  }, [currentTerm?.id, termId]);

  const tabs = [
    { key: 'grades', label: 'Grades' },
    ...(isAdmin ? [{ key: 'classes', label: 'Classes' }] : []),
    { key: 'subjects', label: 'Subjects' },
    ...(isAdmin ? [{ key: 'terms', label: 'Terms & Years' }] : []),
    ...(isTeacher || isAdmin ? [{ key: 'teaching', label: 'Teaching Profile' }] : []),
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Academics</h1>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>Manage grades, subjects, and results</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>
      </div>

      {tab === 'grades' && (
        <GradesTab
          classes={classes || []} terms={terms || []}
          classId={classId} setClassId={setClassId}
          termId={termId} setTermId={setTermId}
          grades={grades} loading={loading}
          refetch={refetch}
          showBulkModal={showBulkModal} setShowBulkModal={setShowBulkModal}
        />
      )}

      {tab === 'classes' && <ClassesTab classes={classes || []} onRefresh={refetchClasses} />}
      {tab === 'subjects' && <SubjectsTab subjects={subjects || []} onRefresh={refetchSubjects} />}
      {tab === 'terms' && <TermsTab terms={terms || []} onRefresh={refetchTerms} />}
      {tab === 'teaching' && <TeachingProfileTab />}
    </div>
  );
}

function groupedClasses(classes) {
  return classes.reduce((groups, cls) => {
    const key = cls.name?.startsWith('JSS') ? 'Junior Secondary' : cls.section || 'Senior Secondary';
    groups[key] = groups[key] || [];
    groups[key].push(cls);
    return groups;
  }, {});
}

function GradesTab({ classes, terms, classId, setClassId, termId, setTermId, grades, loading, refetch, showBulkModal, setShowBulkModal }) {
  const { mutate: publishMutate, loading: publishing } = useMutation();

  const gradeData = grades || [];

  // Group grades by student
  const studentMap = {};
  gradeData.forEach(g => {
    const key = g.student_id;
    if (!studentMap[key]) {
      studentMap[key] = { student_id: g.student_id, name: `${g.first_name || ''} ${g.last_name || ''}`.trim(), admission_no: g.admission_no, grades: [] };
    }
    studentMap[key].grades.push(g);
  });
  const studentList = Object.values(studentMap).map(s => {
    const avg = s.grades.length ? Math.round(s.grades.reduce((a, g) => a + parseFloat(g.total || 0), 0) / s.grades.length) : 0;
    const gradeLetter = avg >= 70 ? 'A' : avg >= 60 ? 'B' : avg >= 50 ? 'C' : avg >= 45 ? 'D' : avg >= 40 ? 'E' : 'F';
    return { ...s, average: avg, grade: gradeLetter };
  }).sort((a, b) => b.average - a.average);

  const columns = [
    { header: 'Student', key: 'name', render: r => (
      <div>
        <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.name}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)' }}>{r.admission_no}</p>
      </div>
    )},
    { header: 'Subjects', key: 'subjects', render: r => r.grades.length },
    { header: 'Average', key: 'average', align: 'center', render: r => (
      <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{r.average}</span>
    )},
    { header: 'Grade', key: 'grade', align: 'center', render: r => (
      <Badge variant={r.grade === 'A' ? 'success' : r.grade === 'B' ? 'green' : r.grade === 'F' ? 'danger' : 'warning'}>
        {r.grade}
      </Badge>
    )},
    { header: 'Details', key: 'details', render: r => (
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {r.grades.map((g, i) => (
          <span key={i} style={{
            display: 'inline-block', padding: '2px 6px', borderRadius: 'var(--radius-sm)',
            fontSize: '0.6875rem', fontWeight: 600, background: `${gradeColor(g.grade_letter)}15`, color: gradeColor(g.grade_letter)
          }}>
            {g.subject_name?.substring(0, 3) || 'SUB'}: {g.total}
          </span>
        ))}
      </div>
    )},
  ];

  const handlePublish = async () => {
    if (!classId || !termId) return;
    const { success: ok } = await publishMutate(`/academics/grades/publish/${classId}/${termId}`, {});
    if (ok) {
      toast.success('Results published successfully');
      refetch();
    } else {
      toast.error('Failed to publish');
    }
  };

  return (
    <>
      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <Input label="Class" type="select" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Select class</option>
              {Object.entries(groupedClasses(classes)).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </Input>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <Input label="Term" type="select" value={termId} onChange={e => setTermId(e.target.value)}>
              <option value="">Select term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.is_current ? '(Current)' : ''}</option>)}
            </Input>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', paddingBottom: 'var(--sp-4)' }}>
            <Button variant="secondary" icon={Upload} onClick={() => setShowBulkModal(true)} disabled={!classId || !termId}>
              Bulk Entry
            </Button>
            <Button variant="amber" icon={CheckCircle} onClick={handlePublish} loading={publishing} disabled={!classId || !termId}>
              Publish
            </Button>
          </div>
        </div>
      </Card>

      <Card padding={false}>
        <DataTable columns={columns} data={studentList} loading={loading} emptyMessage="Select a class and term to view grades" />
      </Card>

      <BulkGradeModal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} classId={classId} termId={termId} onSuccess={refetch} />
    </>
  );
}

function BulkGradeModal({ isOpen, onClose, classId, termId, onSuccess }) {
  const [subjectId, setSubjectId] = useState('');
  const [entries, setEntries] = useState([]);
  const { data: subjects } = useApi('/academics/subjects');
  const { data: students } = useApi(classId ? `/students?class_id=${classId}&limit=100` : null, { immediate: !!classId });
  const { mutate, loading } = useMutation();

  const studentList = students?.students || students?.data || (Array.isArray(students) ? students : []);

  const initEntries = () => {
    setEntries(studentList.map(s => ({
      student_id: s.id, name: `${s.first_name} ${s.last_name}`,
      ca1: '', ca2: '', ca3: '', exam: ''
    })));
  };

  const handleSubjectChange = (id) => {
    setSubjectId(id);
    if (id && studentList.length) initEntries();
  };

  const updateEntry = (idx, field, val) => {
    const updated = [...entries];
    updated[idx] = { ...updated[idx], [field]: val };
    setEntries(updated);
  };

  const handleSubmit = async () => {
    const grades = entries
      .filter(e => e.ca1 || e.ca2 || e.ca3 || e.exam)
      .map(e => ({
        student_id: e.student_id,
        ca1_score: parseFloat(e.ca1) || 0,
        ca2_score: parseFloat(e.ca2) || 0,
        ca3_score: parseFloat(e.ca3) || 0,
        exam_score: parseFloat(e.exam) || 0
      }));

    if (!grades.length) return toast.error('Please enter at least one grade');

    const { success: ok } = await mutate('/academics/grades/bulk', { subject_id: subjectId, class_id: classId, term_id: termId, grades });
    if (ok) {
      toast.success(`${grades.length} grades saved`);
      onClose();
      onSuccess();
    } else {
      toast.error('Failed to save grades');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Grade Entry" width={700}>
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <Input label="Subject" type="select" value={subjectId} onChange={e => handleSubjectChange(e.target.value)}>
          <option value="">Select subject</option>
          {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Input>
      </div>

      {entries.length > 0 && (
        <div style={{ overflowX: 'auto', maxHeight: 400 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr>
                {['Student', 'CA1 (10)', 'CA2 (10)', 'CA3 (10)', 'Exam (70)'].map(h => (
                  <th key={h} style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid var(--sp-border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--sp-slate-500)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.student_id}>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--sp-border-subtle)', fontWeight: 500 }}>{e.name}</td>
                  {['ca1', 'ca2', 'ca3', 'exam'].map(f => (
                    <td key={f} style={{ padding: '4px 8px', borderBottom: '1px solid var(--sp-border-subtle)' }}>
                      <input
                        type="number" min="0" max={f === 'exam' ? 70 : 10}
                        value={e[f]} onChange={ev => updateEntry(i, f, ev.target.value)}
                        style={{
                          width: 60, padding: '4px 6px', border: '1px solid var(--sp-border)',
                          borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)',
                          textAlign: 'center', outline: 'none'
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} disabled={!entries.length}>Save Grades</Button>
      </div>
    </Modal>
  );
}

function SubjectsTab({ subjects, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', category: 'core', credit_units: 1, is_elective: false });
  const { mutate: create, loading: creating } = useMutation('post');
  const { mutate: update, loading: updating } = useMutation('put');
  const { mutate: remove } = useMutation('delete');
  const saving = creating || updating;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', category: 'core', credit_units: 1, is_elective: false });
    setShowModal(true);
  };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name || '', code: s.code || '', category: s.category || 'core', credit_units: s.credit_units || 1, is_elective: !!s.is_elective });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) return toast.error('Subject name and code are required');
    const { success } = editing
      ? await update(`/academics/subjects/${editing.id}`, form)
      : await create('/academics/subjects', form);
    if (success) {
      toast.success(editing ? 'Subject updated' : 'Subject added');
      setShowModal(false);
      onRefresh?.();
    } else {
      toast.error(editing ? 'Could not update subject' : 'Could not add subject');
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Remove "${s.name}"? Existing grades will not be deleted.`)) return;
    const { success } = await remove(`/academics/subjects/${s.id}`);
    if (success) {
      toast.success('Subject removed');
      onRefresh?.();
    } else {
      toast.error('Could not remove subject');
    }
  };

  const columns = [
    { header: 'Subject', key: 'name', render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--sp-green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={16} style={{ color: 'var(--sp-green-600)' }} />
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>{r.name}</span>
          {r.is_elective && <span style={{ marginLeft: 6, fontSize: '0.6875rem', color: 'var(--sp-amber-700)', background: 'var(--sp-amber-50)', padding: '1px 6px', borderRadius: 20, fontWeight: 600 }}>Elective</span>}
        </div>
      </div>
    )},
    { header: 'Code', key: 'code', render: r => (
      <code style={{ fontSize: '0.8125rem', background: 'var(--sp-slate-100)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>{r.code}</code>
    )},
    { header: 'Category', key: 'category', render: r => <Badge variant="green">{r.category}</Badge> },
    { header: 'Credits', key: 'credit_units', align: 'center' },
    { header: '', key: 'actions', align: 'right', render: r => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</Button>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDelete(r); }}>Remove</Button>
      </div>
    )},
  ];

  return (
    <>
      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Subject Catalogue</h3>
            <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.8125rem' }}>{subjects.length} subjects registered in the school.</p>
          </div>
          <Button icon={Plus} onClick={openCreate}>Add Subject</Button>
        </div>
      </Card>
      <Card padding={false}>
        <DataTable columns={columns} data={subjects} emptyMessage="No subjects added yet" />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Subject' : 'Add Subject'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
          <Input label="Subject Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Mathematics" />
          <Input label="Subject Code *" value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. MTH" />
          <Input label="Category" type="select" value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="core">Core</option>
            <option value="science">Science</option>
            <option value="arts">Arts</option>
            <option value="commercial">Commercial</option>
            <option value="social_science">Social Science</option>
            <option value="languages">Languages</option>
            <option value="vocational">Vocational</option>
            <option value="elective">Elective</option>
          </Input>
          <Input label="Credit Units" type="number" value={form.credit_units} onChange={e => set('credit_units', parseInt(e.target.value) || 1)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_elective} onChange={e => set('is_elective', e.target.checked)} />
          This is an elective subject
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>{editing ? 'Save Changes' : 'Add Subject'}</Button>
        </div>
      </Modal>
    </>
  );
}

/* ── Terms & Academic Years Tab ─────────────────────────────── */
function TermsTab({ terms, onRefresh }) {
  const [showTermModal, setShowTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [termForm, setTermForm] = useState({ name: '', term_number: 1, start_date: '', end_date: '', is_current: false, academic_year_id: '' });
  const { data: years, refetch: refetchYears } = useApi('/academics/years');
  const [showYearModal, setShowYearModal] = useState(false);
  const [yearForm, setYearForm] = useState({ name: '', start_date: '', end_date: '', is_current: false });
  const { mutate: createTerm, loading: creatingTerm } = useMutation('post');
  const { mutate: updateTerm, loading: updatingTerm } = useMutation('put');
  const { mutate: deleteTerm } = useMutation('delete');
  const { mutate: createYear, loading: creatingYear } = useMutation('post');
  const savingTerm = creatingTerm || updatingTerm;
  const setT = (k, v) => setTermForm(f => ({ ...f, [k]: v }));
  const setY = (k, v) => setYearForm(f => ({ ...f, [k]: v }));

  const openCreateTerm = () => {
    setEditingTerm(null);
    setTermForm({ name: '', term_number: 1, start_date: '', end_date: '', is_current: false, academic_year_id: '' });
    setShowTermModal(true);
  };
  const openEditTerm = (t) => {
    setEditingTerm(t);
    setTermForm({
      name: t.name || '', term_number: t.term_number || 1,
      start_date: t.start_date?.slice(0, 10) || '',
      end_date: t.end_date?.slice(0, 10) || '',
      is_current: !!t.is_current,
      academic_year_id: t.academic_year_id || '',
    });
    setShowTermModal(true);
  };

  const saveTerm = async () => {
    if (!termForm.name) return toast.error('Term name is required');
    const { success } = editingTerm
      ? await updateTerm(`/academics/terms/${editingTerm.id}`, termForm)
      : await createTerm('/academics/terms', termForm);
    if (success) {
      toast.success(editingTerm ? 'Term updated' : 'Term created');
      setShowTermModal(false);
      onRefresh?.();
    } else {
      toast.error('Could not save term');
    }
  };

  const handleDeleteTerm = async (t) => {
    if (!window.confirm(`Delete term "${t.name}"? This cannot be undone if it has data.`)) return;
    const { success } = await deleteTerm(`/academics/terms/${t.id}`);
    if (success) {
      toast.success('Term deleted');
      onRefresh?.();
    } else {
      toast.error('Could not delete term — it has linked grades or payments');
    }
  };

  const saveYear = async () => {
    if (!yearForm.name) return toast.error('Academic year name is required');
    const { success } = await createYear('/academics/years', yearForm);
    if (success) {
      toast.success('Academic year created');
      setShowYearModal(false);
      refetchYears?.();
    } else {
      toast.error('Could not create academic year');
    }
  };

  const termColumns = [
    { header: 'Term / Period', key: 'name', render: r => (
      <div>
        <p style={{ fontWeight: 600 }}>{r.name}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)' }}>{r.academic_year || 'No academic year'}</p>
      </div>
    )},
    { header: 'Number', key: 'term_number', align: 'center' },
    { header: 'Dates', key: 'dates', render: r => (
      <span style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-600)' }}>
        {r.start_date ? `${formatDate(r.start_date)} → ${formatDate(r.end_date)}` : '—'}
      </span>
    )},
    { header: 'Status', key: 'is_current', render: r => (
      <Badge variant={r.is_current ? 'success' : 'default'} dot={r.is_current}>
        {r.is_current ? 'Current' : 'Past'}
      </Badge>
    )},
    { header: '', key: 'actions', align: 'right', render: r => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); openEditTerm(r); }}>Edit</Button>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDeleteTerm(r); }}>Delete</Button>
      </div>
    )},
  ];

  const yearColumns = [
    { header: 'Academic Year', key: 'name', render: r => <strong>{r.name}</strong> },
    { header: 'Start', key: 'start_date', render: r => r.start_date ? formatDate(r.start_date) : '—', nowrap: true },
    { header: 'End', key: 'end_date', render: r => r.end_date ? formatDate(r.end_date) : '—', nowrap: true },
    { header: 'Status', key: 'is_current', render: r => (
      <Badge variant={r.is_current ? 'success' : 'default'} dot={r.is_current}>
        {r.is_current ? 'Current Year' : 'Archived'}
      </Badge>
    )},
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-5)' }}>
      {/* Academic Years */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Academic Years</h3>
            <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.8125rem' }}>e.g. 2025/2026, 2024/2025</p>
          </div>
          <Button icon={Plus} size="sm" onClick={() => { setYearForm({ name: '', start_date: '', end_date: '', is_current: false }); setShowYearModal(true); }}>Add Year</Button>
        </div>
        <DataTable columns={yearColumns} data={years || []} emptyMessage="No academic years created" />
      </Card>

      {/* Terms */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Terms / Semesters</h3>
            <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.8125rem' }}>
              Set the current term — this drives the default selection on attendance, fees, and grades.
            </p>
          </div>
          <Button icon={CalendarDays} size="sm" onClick={openCreateTerm}>Add Term</Button>
        </div>
        <DataTable columns={termColumns} data={terms} emptyMessage="No terms created yet" />
      </Card>

      {/* Term Modal */}
      <Modal isOpen={showTermModal} onClose={() => setShowTermModal(false)} title={editingTerm ? 'Edit Term' : 'Add Term'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
          <Input label="Term Name *" value={termForm.name} onChange={e => setT('name', e.target.value)} placeholder="e.g. First Term 2025/26" />
          <Input label="Term Number" type="number" value={termForm.term_number} onChange={e => setT('term_number', parseInt(e.target.value) || 1)} />
          <Input label="Start Date" type="date" value={termForm.start_date} onChange={e => setT('start_date', e.target.value)} />
          <Input label="End Date" type="date" value={termForm.end_date} onChange={e => setT('end_date', e.target.value)} />
        </div>
        <Input label="Academic Year" type="select" value={termForm.academic_year_id} onChange={e => setT('academic_year_id', e.target.value || null)}>
          <option value="">No academic year</option>
          {(years || []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </Input>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={termForm.is_current} onChange={e => setT('is_current', e.target.checked)} />
          <strong>Set as current term</strong> — this will unset all other terms
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" onClick={() => setShowTermModal(false)}>Cancel</Button>
          <Button loading={savingTerm} onClick={saveTerm}>{editingTerm ? 'Save Changes' : 'Create Term'}</Button>
        </div>
      </Modal>

      {/* Academic Year Modal */}
      <Modal isOpen={showYearModal} onClose={() => setShowYearModal(false)} title="Add Academic Year">
        <Input label="Year Name *" value={yearForm.name} onChange={e => setY('name', e.target.value)} placeholder="e.g. 2025/2026" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--sp-3)' }}>
          <Input label="Start Date" type="date" value={yearForm.start_date} onChange={e => setY('start_date', e.target.value)} />
          <Input label="End Date" type="date" value={yearForm.end_date} onChange={e => setY('end_date', e.target.value)} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={yearForm.is_current} onChange={e => setY('is_current', e.target.checked)} />
          <strong>Set as current academic year</strong>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" onClick={() => setShowYearModal(false)}>Cancel</Button>
          <Button loading={creatingYear} onClick={saveYear}>Create Year</Button>
        </div>
      </Modal>
    </div>
  );
}

function ClassesTab({ classes, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', section: 'Junior Secondary', level: 'junior_secondary', capacity: 40, room_number: '', order_index: 0 });
  const { mutate: createClass, loading: creating } = useMutation('post');
  const { mutate: updateClass, loading: updating } = useMutation('put');
  const { mutate: removeClass } = useMutation('delete');
  const loading = creating || updating;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', section: 'Junior Secondary', level: 'junior_secondary', capacity: 40, room_number: '', order_index: classes.length + 1 });
    setShowModal(true);
  };
  const openEdit = (cls) => {
    setEditing(cls);
    setForm({
      name: cls.name || '',
      section: cls.section || '',
      level: cls.level || 'junior_secondary',
      capacity: cls.capacity || 40,
      room_number: cls.room_number || '',
      order_index: cls.order_index || 0,
    });
    setShowModal(true);
  };
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!form.name || !form.level) return toast.error('Class name and level are required');
    const { success } = editing
      ? await updateClass(`/academics/classes/${editing.id}`, form)
      : await createClass('/academics/classes', form);
    if (success) {
      toast.success(editing ? 'Class updated' : 'Class added');
      setShowModal(false);
      onRefresh?.();
    } else {
      toast.error('Could not save class');
    }
  };
  const del = async (cls) => {
    if (!confirm(`Remove ${cls.name}? Students are not deleted.`)) return;
    const { success } = await removeClass(`/academics/classes/${cls.id}`);
    if (success) {
      toast.success('Class removed');
      onRefresh?.();
    } else {
      toast.error('Could not remove class');
    }
  };

  const columns = [
    { header: 'Class', key: 'name', render: r => <strong>{r.name}</strong> },
    { header: 'Section / Arm', key: 'section', render: r => r.section || '-' },
    { header: 'Level', key: 'level', render: r => <Badge variant="green">{r.level?.replaceAll('_', ' ')}</Badge> },
    { header: 'Students', key: 'student_count' },
    { header: 'Room', key: 'room_number', render: r => r.room_number || '-' },
    { header: 'Actions', key: 'actions', render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        <Button size="sm" variant="secondary" icon={Pencil} onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</Button>
        <Button size="sm" variant="danger" icon={Trash2} onClick={(e) => { e.stopPropagation(); del(r); }}>Delete</Button>
      </div>
    )},
  ];

  return (
    <>
      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>School Classes</h3>
            <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.8125rem' }}>Use any class naming your school needs, including arms and senior streams.</p>
          </div>
          <Button icon={Plus} onClick={openCreate}>Add Class</Button>
        </div>
      </Card>
      <Card padding={false}>
        <DataTable columns={columns} data={classes} emptyMessage="No classes configured" />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Class' : 'Add Class'}>
        <Input label="Class Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="JSS 1A, SS 1 Science, SS 2 Commercial" />
        <Input label="Section / Arm / Stream" value={form.section} onChange={e => set('section', e.target.value)} placeholder="Junior Secondary, Science, Commercial, Arts, A" />
        <Input label="Level" type="select" value={form.level} onChange={e => set('level', e.target.value)}>
          <option value="junior_secondary">Junior Secondary</option>
          <option value="senior_secondary">Senior Secondary</option>
          <option value="primary">Primary</option>
          <option value="nursery">Nursery</option>
          <option value="grade_6_8">Middle School</option>
          <option value="grade_9_12">High School</option>
          <option value="a_level">A-Level / Sixth Form</option>
        </Input>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 var(--sp-3)' }}>
          <Input label="Capacity" type="number" value={form.capacity} onChange={e => set('capacity', e.target.value)} />
          <Input label="Order" type="number" value={form.order_index} onChange={e => set('order_index', e.target.value)} />
          <Input label="Room" value={form.room_number} onChange={e => set('room_number', e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button loading={loading} onClick={save}>Save Class</Button>
        </div>
      </Modal>
    </>
  );
}

function TeachingProfileTab() {
  const { user, isAdmin } = useAuth();
  const [teacherId, setTeacherId] = useState(user?.role === 'teacher' ? user.id : '');
  const [form, setForm] = useState({ class_id: '', subject_id: '', day_of_week: 'monday', start_time: '', end_time: '', room: '', is_class_teacher: false });
  const { data: teachers } = useApi(isAdmin ? '/users?role=teacher' : null, { immediate: isAdmin });
  const { data, loading, refetch } = useApi(teacherId ? `/academics/teaching-profile${isAdmin ? `?teacher_id=${teacherId}` : ''}` : null, { immediate: !!teacherId, deps: [teacherId] });
  const { mutate, loading: saving } = useMutation();

  const classes = data?.classes || [];
  const subjects = data?.subjects || [];
  const assignments = data?.assignments || [];
  const timetable = data?.timetable || [];
  const set = (key, value) => setForm({ ...form, [key]: value });

  const submit = async () => {
    if (!form.class_id || !form.subject_id) return toast.error('Select class and subject');
    const { success } = await mutate('/academics/teaching-profile', { ...form, teacher_id: teacherId });
    if (success) {
      toast.success('Teaching profile updated');
      setForm({ class_id: '', subject_id: '', day_of_week: 'monday', start_time: '', end_time: '', room: '', is_class_teacher: false });
      refetch();
    } else {
      toast.error('Could not update teaching profile');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-5)' }}>
      {isAdmin && (
        <Card>
          <Input label="Teacher" type="select" value={teacherId} onChange={e => setTeacherId(e.target.value)}>
            <option value="">Select teacher</option>
            {(teachers || []).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
          </Input>
        </Card>
      )}

      {teacherId && (
        <Card>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>Add Subject, Class and Time</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 var(--sp-3)' }}>
            <Input label="Class" type="select" value={form.class_id} onChange={e => set('class_id', e.target.value)}>
              <option value="">Select class</option>
              {Object.entries(groupedClasses(classes)).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </Input>
            <Input label="Subject" type="select" value={form.subject_id} onChange={e => set('subject_id', e.target.value)}>
              <option value="">Select subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Input>
            <Input label="Day" type="select" value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)}>
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => <option key={day} value={day}>{day[0].toUpperCase() + day.slice(1)}</option>)}
            </Input>
            <Input label="Start" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            <Input label="End" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            <Input label="Room" value={form.room} onChange={e => set('room', e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-4)', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.is_class_teacher} onChange={e => set('is_class_teacher', e.target.checked)} />
            Assign me as class teacher for this class
          </label>
          <Button icon={UserCog} loading={saving} onClick={submit}>Save Teaching Profile</Button>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-4)' }}>
        <Card>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>Subjects Offered</h3>
          {loading ? <p>Loading...</p> : assignments.length ? assignments.map(item => (
            <div key={item.id} style={{ padding: 'var(--sp-3)', borderBottom: '1px solid var(--sp-border-subtle)' }}>
              <p style={{ fontWeight: 700 }}>{item.subject_name}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{item.class_name}</p>
            </div>
          )) : <p style={{ color: 'var(--sp-slate-400)' }}>No subject assignment yet.</p>}
        </Card>
        <Card>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>Timetable</h3>
          {timetable.length ? timetable.map(slot => (
            <div key={slot.id} style={{ padding: 'var(--sp-3)', borderBottom: '1px solid var(--sp-border-subtle)', display: 'flex', gap: 'var(--sp-3)' }}>
              <Clock size={16} style={{ color: 'var(--sp-green-600)', marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 700 }}>{slot.subject_name} - {slot.class_name}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)', textTransform: 'capitalize' }}>{slot.day_of_week}, {slot.start_time} - {slot.end_time}{slot.room ? `, ${slot.room}` : ''}</p>
              </div>
            </div>
          )) : <p style={{ color: 'var(--sp-slate-400)' }}>No timetable slots yet.</p>}
        </Card>
      </div>
    </div>
  );
}

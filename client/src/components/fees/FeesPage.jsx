import { useState, useEffect } from 'react';
import { useApi, useMutation } from '../../hooks/useApi';
import { Card, Button, Input, Modal, DataTable, Badge, StatCard, ProgressBar, Tabs } from '../common/UI';
import { formatNaira, formatDate } from '../../utils/helpers';
import { Wallet, Plus, Receipt, AlertCircle, CheckCircle2, Pencil, Trash2, Settings, List } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeesPage() {
  const [tab, setTab] = useState('payments');
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);

  const { data: classes } = useApi('/academics/classes');
  const { data: terms } = useApi('/academics/terms');
  const { data: feeReport, loading, refetch } = useApi(
    classId && termId ? `/fees/class/${classId}/term/${termId}` : null,
    { immediate: !!(classId && termId), deps: [classId, termId] }
  );
  const { data: feeStructures, refetch: refetchStructures } = useApi(
    classId && termId ? `/fees/structures/${classId}/${termId}` : null,
    { immediate: !!(classId && termId), deps: [classId, termId] }
  );
  const { mutate: deleteStructure } = useMutation('delete');

  const currentTerm = (terms || []).find(t => t.is_current);
  useEffect(() => {
    if (currentTerm && !termId) setTermId(currentTerm.id);
  }, [currentTerm?.id]);

  const report = feeReport?.report || [];
  const summary = feeReport?.summary || {};
  const feeItems = feeStructures?.fees || [];

  const handleDeleteStructure = async (fee) => {
    if (!window.confirm(`Delete "${fee.fee_type}" fee of ${formatNaira(fee.amount)}?`)) return;
    const { success } = await deleteStructure(`/fees/structures/${fee.id}`);
    if (success) {
      toast.success('Fee structure deleted');
      refetchStructures();
      refetch();
    } else {
      toast.error('Could not delete fee structure');
    }
  };

  const paymentColumns = [
    { header: 'Student', key: 'name', render: r => (
      <div>
        <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{r.first_name} {r.last_name}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)' }}>{r.admission_no}</p>
      </div>
    )},
    { header: 'Expected', key: 'total_expected', align: 'right', render: r => formatNaira(r.total_expected), nowrap: true },
    { header: 'Paid', key: 'total_paid', align: 'right', render: r => (
      <span style={{ color: 'var(--sp-success)', fontWeight: 600 }}>{formatNaira(r.total_paid)}</span>
    ), nowrap: true },
    { header: 'Balance', key: 'balance', align: 'right', render: r => (
      <span style={{ color: r.balance > 0 ? 'var(--sp-danger)' : 'var(--sp-success)', fontWeight: 600 }}>
        {formatNaira(r.balance)}
      </span>
    ), nowrap: true },
    { header: 'Progress', key: 'percentage', render: r => (
      <div style={{ minWidth: 100 }}>
        <ProgressBar value={r.percentage} showLabel />
      </div>
    )},
    { header: 'Status', key: 'status', align: 'center', render: r => {
      const v = r.balance <= 0 ? 'success' : r.total_paid > 0 ? 'warning' : 'danger';
      const l = r.balance <= 0 ? 'Paid' : r.total_paid > 0 ? 'Partial' : 'Unpaid';
      return <Badge variant={v} dot>{l}</Badge>;
    }},
  ];

  const structureColumns = [
    { header: 'Fee Type', key: 'fee_type', render: r => (
      <div>
        <p style={{ fontWeight: 600, textTransform: 'capitalize' }}>{r.fee_type?.replace(/_/g, ' ')}</p>
        {r.name && <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)' }}>{r.name}</p>}
      </div>
    )},
    { header: 'Amount', key: 'amount', align: 'right', render: r => (
      <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
        {formatNaira(r.amount)}
      </span>
    ), nowrap: true },
    { header: 'Due Date', key: 'due_date', render: r => r.due_date ? formatDate(r.due_date) : <span style={{ color: 'var(--sp-slate-400)' }}>—</span>, nowrap: true },
    { header: '', key: 'actions', align: 'right', render: r => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Button size="sm" variant="ghost" icon={Pencil} onClick={(e) => { e.stopPropagation(); setEditingStructure(r); setShowStructure(true); }}>Edit</Button>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={(e) => { e.stopPropagation(); handleDeleteStructure(r); }}>Delete</Button>
      </div>
    )},
  ];

  const tabs = [
    { key: 'payments', label: 'Fee Collection' },
    { key: 'structures', label: 'Fee Structures' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Fees & Payments</h1>
          <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>
            Manage fee structures and track student payments
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          {tab === 'structures' ? (
            <Button icon={Plus} onClick={() => { setEditingStructure(null); setShowStructure(true); }} disabled={!classId || !termId}>
              Add Fee
            </Button>
          ) : (
            <Button icon={Plus} onClick={() => setShowPayment(true)} disabled={!classId || !termId}>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Class & Term Selector */}
      <Card style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Input label="Class" type="select" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Select class</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Input>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <Input label="Term" type="select" value={termId} onChange={e => setTermId(e.target.value)}>
              <option value="">Select term</option>
              {(terms || []).map(t => <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' (Current)' : ''}</option>)}
            </Input>
          </div>
          {!classId && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-400)', paddingBottom: 'var(--sp-4)', flex: '2 1 300px' }}>
              Select a class and term to view fees.
            </p>
          )}
        </div>
      </Card>

      {/* ── FEE COLLECTION TAB ─────────────────────── */}
      {tab === 'payments' && (
        <>
          {summary.total_students > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }} className="stagger-children">
              <StatCard label="Expected" value={formatNaira(summary.total_expected)} icon={Receipt} color="var(--sp-slate-600)" />
              <StatCard label="Collected" value={formatNaira(summary.total_collected)} icon={Wallet} color="var(--sp-success)" />
              <StatCard label="Fully Paid" value={summary.fully_paid} icon={CheckCircle2} color="var(--sp-green-600)" />
              <StatCard label="Defaulting" value={summary.unpaid} icon={AlertCircle} color="var(--sp-danger)" />
            </div>
          )}

          {/* Fee Breakdown pills */}
          {feeItems.length > 0 && (
            <Card style={{ marginBottom: 'var(--sp-4)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>Fee Breakdown</h3>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                {feeItems.map(f => (
                  <div key={f.id} style={{
                    padding: 'var(--sp-2) var(--sp-3)', background: 'var(--sp-slate-50)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-border-subtle)',
                  }}>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-500)', fontWeight: 600, textTransform: 'capitalize' }}>
                      {f.fee_type?.replace(/_/g, ' ')}
                    </p>
                    <p style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                      {formatNaira(f.amount)}
                    </p>
                  </div>
                ))}
                <div style={{ padding: 'var(--sp-2) var(--sp-3)', background: 'var(--sp-green-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-green-200)' }}>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--sp-green-600)', fontWeight: 600 }}>TOTAL</p>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--sp-green-700)' }}>
                    {formatNaira(feeStructures?.total)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card padding={false}>
            <DataTable
              columns={paymentColumns}
              data={report}
              loading={loading}
              emptyMessage={classId && termId ? 'No students in this class, or no fee structures set up' : 'Select a class and term to view fee report'}
            />
          </Card>
        </>
      )}

      {/* ── FEE STRUCTURES TAB ────────────────────── */}
      {tab === 'structures' && (
        <>
          {!classId || !termId ? (
            <Card>
              <p style={{ color: 'var(--sp-slate-400)', textAlign: 'center', padding: 'var(--sp-8)', fontSize: '0.875rem' }}>
                Select a class and term above to manage fee structures.
              </p>
            </Card>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
                <StatCard label="Fee Lines" value={feeItems.length} icon={List} color="var(--sp-info)" />
                <StatCard label="Total Per Student" value={formatNaira(feeStructures?.total)} icon={Wallet} color="var(--sp-green-600)" />
              </div>
              <Card padding={false}>
                <div style={{ padding: 'var(--sp-5)', borderBottom: '1px solid var(--sp-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Fee Lines</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)', marginTop: 2 }}>
                      Each line is billed per student. Add all fee components for this class/term.
                    </p>
                  </div>
                </div>
                <DataTable
                  columns={structureColumns}
                  data={feeItems}
                  emptyMessage="No fee structures yet. Click 'Add Fee' to create one."
                />
              </Card>
            </>
          )}
        </>
      )}

      {/* ── MODALS ────────────────────────────────── */}
      <RecordPaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        classId={classId}
        termId={termId}
        students={report}
        feeStructures={feeItems}
        onSuccess={() => { refetch(); setShowPayment(false); }}
      />

      <FeeStructureModal
        isOpen={showStructure}
        onClose={() => { setShowStructure(false); setEditingStructure(null); }}
        classId={classId}
        termId={termId}
        editing={editingStructure}
        onSuccess={() => { refetchStructures(); refetch(); setShowStructure(false); setEditingStructure(null); }}
      />
    </div>
  );
}

/* ── Record Payment Modal ─────────────────────────────────── */
function RecordPaymentModal({ isOpen, onClose, students, feeStructures, onSuccess }) {
  const [form, setForm] = useState({
    student_id: '', fee_structure_id: '', amount: '', payment_method: 'cash', reference: '', notes: '',
  });
  const { mutate, loading } = useMutation();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.student_id || !form.fee_structure_id || !form.amount) return toast.error('Fill required fields');
    const { success } = await mutate('/fees/payments', form);
    if (success) {
      toast.success('Payment recorded');
      setForm({ student_id: '', fee_structure_id: '', amount: '', payment_method: 'cash', reference: '', notes: '' });
      onSuccess();
    } else {
      toast.error('Failed to record payment');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <Input label="Student *" type="select" value={form.student_id} onChange={e => set('student_id', e.target.value)}>
        <option value="">Select student</option>
        {students.map(s => (
          <option key={s.id} value={s.id}>
            {s.first_name} {s.last_name} ({s.admission_no}) — Balance: {formatNaira(s.balance)}
          </option>
        ))}
      </Input>
      <Input label="Fee Type *" type="select" value={form.fee_structure_id} onChange={e => {
        set('fee_structure_id', e.target.value);
        const fee = feeStructures.find(f => f.id === e.target.value);
        if (fee) set('amount', fee.amount);
      }}>
        <option value="">Select fee</option>
        {feeStructures.map(f => (
          <option key={f.id} value={f.id}>
            {f.fee_type?.replace(/_/g, ' ')} — {formatNaira(f.amount)}
          </option>
        ))}
      </Input>
      <Input label="Amount Paid (₦) *" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="50000" />
      <Input label="Payment Method" type="select" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="pos">POS / Card</option>
        <option value="paystack">Paystack</option>
        <option value="flutterwave">Flutterwave</option>
        <option value="cheque">Cheque</option>
      </Input>
      <Input label="Reference No." value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Receipt number or transfer reference" />
      <Input label="Notes" type="textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional payment note" />
      <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} icon={Wallet}>Record Payment</Button>
      </div>
    </Modal>
  );
}

/* ── Fee Structure Modal ───────────────────────────────────── */
function FeeStructureModal({ isOpen, onClose, classId, termId, editing, onSuccess }) {
  const [form, setForm] = useState({
    fee_type: 'tuition', name: '', amount: '', description: '', due_date: '',
  });
  const { mutate: create, loading: creating } = useMutation('post');
  const { mutate: update, loading: updating } = useMutation('put');
  const loading = creating || updating;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (editing) {
      setForm({
        fee_type: editing.fee_type || 'tuition',
        name: editing.name || '',
        amount: editing.amount || '',
        description: editing.description || '',
        due_date: editing.due_date ? editing.due_date.slice(0, 10) : '',
      });
    } else {
      setForm({ fee_type: 'tuition', name: '', amount: '', description: '', due_date: '' });
    }
  }, [editing, isOpen]);

  const handleSubmit = async () => {
    if (!form.fee_type || !form.amount) return toast.error('Fee type and amount are required');
    const payload = { ...form, class_id: classId, term_id: termId, amount: parseFloat(form.amount) };
    const { success } = editing
      ? await update(`/fees/structures/${editing.id}`, payload)
      : await create('/fees/structures', payload);
    if (success) {
      toast.success(editing ? 'Fee updated' : 'Fee structure created');
      onSuccess();
    } else {
      toast.error(editing ? 'Could not update fee' : 'Could not create fee structure');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit Fee Structure' : 'Add Fee Structure'}>
      <Input label="Fee Type *" type="select" value={form.fee_type} onChange={e => set('fee_type', e.target.value)}>
        <option value="tuition">Tuition</option>
        <option value="development_levy">Development Levy</option>
        <option value="pta">PTA Levy</option>
        <option value="hostel">Hostel</option>
        <option value="transport">Transport</option>
        <option value="uniform">Uniform</option>
        <option value="books">Books & Stationery</option>
        <option value="exam">Exam / WAEC / NECO</option>
        <option value="sports">Sports</option>
        <option value="computer">Computer / ICT</option>
        <option value="other">Other</option>
      </Input>
      <Input label="Custom Name (optional)" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. 2025/2026 Tuition" />
      <Input label="Amount (₦) *" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="e.g. 150000" />
      <Input label="Due Date" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
      <Input label="Description" type="textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" />
      <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={loading} onClick={handleSubmit} icon={editing ? Pencil : Plus}>
          {editing ? 'Save Changes' : 'Create Fee'}
        </Button>
      </div>
    </Modal>
  );
}

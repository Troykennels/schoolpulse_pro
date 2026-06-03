import { useState } from 'react';
import { useQuery, useMutation } from '../../hooks/useApi';
import { Button, Input, Modal } from '../common/UI';
import { Wallet, Plus, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PayrollPage() {
  const { data: records = [], refetch } = useQuery('/payroll');
  const { data: payments = [] } = useQuery('/payroll/payments');
  const [tab, setTab] = useState('records');

  const totalPayroll = records.reduce((sum, r) => sum + parseFloat(r.net_salary || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Staff Payroll</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{records.length} staff on payroll</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Staff on Payroll', value: records.length, color: '#22A97A' },
          { label: 'Total Monthly Payroll', value: `₦${totalPayroll.toLocaleString()}`, color: '#3b82f6' },
          { label: 'Payments This Month', value: payments.filter(p => p.month === new Date().toISOString().slice(0, 7)).length, color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 18, border: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['records', 'payments'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600,
            background: tab === t ? '#22A97A' : '#f3f4f6', color: tab === t ? 'white' : '#6b7280',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {tab === 'records' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Staff</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Basic</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Net Salary</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', textTransform: 'capitalize' }}>{r.role?.replace('_', ' ')}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>₦{parseFloat(r.basic_salary).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#22A97A' }}>₦{parseFloat(r.net_salary).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {records.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
              <Wallet size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p>No payroll records yet</p>
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Staff</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Month</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.first_name} {p.last_name}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{p.month}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>₦{parseFloat(p.net_amount).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: p.status === 'paid' ? '#f0fdf4' : '#fef9c3', color: p.status === 'paid' ? '#16a34a' : '#ca8a04' }}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
              <Calendar size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
              <p>No salary payments recorded yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

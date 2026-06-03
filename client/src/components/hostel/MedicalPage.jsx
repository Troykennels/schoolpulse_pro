import { useState } from 'react';
import { useQuery } from '../../hooks/useApi';
import { HeartPulse, Stethoscope } from 'lucide-react';

export default function MedicalPage() {
  const { data: records = [] } = useQuery('/medical');

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Medical Records</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{records.length} records</p>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Student</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Complaint</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{new Date(r.visit_date).toLocaleDateString()}</td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#6b7280' }}>{r.visit_type?.replace('_', ' ')}</td>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{r.complaint || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
            <HeartPulse size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p>No medical records yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '../../hooks/useApi';
import { Building2, BedDouble } from 'lucide-react';

export default function HostelPage() {
  const { data: hostels = [] } = useQuery('/hostels');

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Hostel Management</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{hostels.length} hostels</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {hostels.map(h => (
          <div key={h.id} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Building2 size={20} color="#22A97A" />
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{h.name}</div>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>Type: <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>{h.type}</span></div>
              <div>Rooms: <span style={{ fontWeight: 500, color: '#374151' }}>{h.total_rooms}</span></div>
              <div>Beds: <span style={{ fontWeight: 500, color: '#374151' }}>{h.total_beds}</span></div>
            </div>
          </div>
        ))}
      </div>

      {hostels.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>No hostels configured</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Add hostels to manage boarding students</p>
        </div>
      )}
    </div>
  );
}

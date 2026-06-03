import { useState } from 'react';
import { useQuery } from '../../hooks/useApi';
import { Bus, MapPin } from 'lucide-react';

export default function TransportPage() {
  const { data: routes = [] } = useQuery('/transport/routes');

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Transport Management</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{routes.length} routes</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {routes.map(r => (
          <div key={r.id} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Bus size={20} color="#3b82f6" />
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{r.route_name}</div>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>Vehicle: <span style={{ fontWeight: 500, color: '#374151' }}>{r.vehicle_number || '—'}</span></div>
              <div>Driver: <span style={{ fontWeight: 500, color: '#374151' }}>{r.driver_name || '—'}</span></div>
              <div>Capacity: <span style={{ fontWeight: 500, color: '#374151' }}>{r.capacity} seats</span></div>
              {r.fee_per_term > 0 && <div>Fee: <span style={{ fontWeight: 600, color: '#22A97A' }}>₦{parseFloat(r.fee_per_term).toLocaleString()}/term</span></div>}
            </div>
          </div>
        ))}
      </div>

      {routes.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <Bus size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>No transport routes configured</p>
        </div>
      )}
    </div>
  );
}

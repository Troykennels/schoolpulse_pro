import { useState } from 'react';
import { useQuery } from '../../hooks/useApi';
import { Package, AlertTriangle } from 'lucide-react';

export default function InventoryPage() {
  const { data: items = [] } = useQuery('/inventory');
  const lowStock = items.filter(i => i.quantity <= i.minimum_stock);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Inventory & Assets</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{items.length} items tracked</p>

      {lowStock.length > 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="#ca8a04" />
          <span style={{ fontSize: 13, color: '#92400e', fontWeight: 500 }}>{lowStock.length} item(s) below minimum stock level</span>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Item</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Qty</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{i.item_name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280', textTransform: 'capitalize' }}>{i.category}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: i.quantity <= i.minimum_stock ? '#ef4444' : '#111827' }}>{i.quantity}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{i.location || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
            <Package size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p>No inventory items yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

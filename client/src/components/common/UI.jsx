import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

/* ═══ BUTTON ═══ */
export function Button({ children, variant = 'primary', size = 'md', loading, icon: Icon, className = '', ...props }) {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, var(--sp-green-800) 0%, var(--sp-green-600) 100%)',
      color: 'white',
      border: 'none',
      boxShadow: '0 2px 12px rgba(11,61,46,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
    },
    secondary: {
      background: 'var(--sp-surface)',
      color: 'var(--sp-slate-700)',
      border: '1px solid var(--sp-border)',
      boxShadow: 'var(--shadow-sm)',
    },
    danger: {
      background: 'linear-gradient(135deg, #c53030, #e53e3e)',
      color: 'white',
      border: 'none',
      boxShadow: '0 2px 12px rgba(229,62,62,0.25)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--sp-slate-600)',
      border: '1px solid transparent',
    },
    amber: {
      background: 'linear-gradient(135deg, var(--sp-amber-600), var(--sp-amber-400))',
      color: 'white',
      border: 'none',
      boxShadow: '0 2px 12px rgba(245,158,11,0.25)',
    },
  };

  const sizes = {
    sm: { padding: '6px 14px', fontSize: '0.75rem', gap: 5 },
    md: { padding: '10px 20px', fontSize: '0.8125rem', gap: 7 },
    lg: { padding: '14px 28px', fontSize: '0.9375rem', gap: 8 },
  };

  const s = styles[variant] || styles.primary;
  const sz = sizes[size] || sizes.md;

  return (
    <button
      className={className}
      disabled={loading || props.disabled}
      {...props}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: sz.gap, padding: sz.padding, fontSize: sz.fontSize,
        fontFamily: 'var(--font-body)', fontWeight: 600, letterSpacing: '0.01em',
        borderRadius: 'var(--radius-md)', cursor: loading ? 'wait' : props.disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--duration-fast) var(--ease-out)',
        opacity: props.disabled ? 0.5 : 1,
        ...s,
        ...props.style,
      }}
      onMouseEnter={e => { if (!props.disabled && !loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.08)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'brightness(1)'; }}
      onMouseDown={e => { if (!props.disabled) e.currentTarget.style.transform = 'translateY(0) scale(0.98)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px) scale(1)'; }}
    >
      {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

/* ═══ CARD ═══ */
export function Card({ children, className = '', padding = true, hover = false, glow = false, ...props }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--sp-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--sp-border-subtle)',
        boxShadow: glow ? 'var(--shadow-md), var(--shadow-glow)' : 'var(--shadow-sm)',
        padding: padding ? 'var(--sp-6)' : 0,
        transition: 'all var(--duration-normal) var(--ease-out)',
        position: 'relative',
        overflow: 'hidden',
        ...(hover ? { cursor: 'pointer' } : {}),
        ...props.style,
      }}
      onMouseEnter={hover ? (e) => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--sp-green-200)'; } : undefined}
      onMouseLeave={hover ? (e) => { e.currentTarget.style.boxShadow = glow ? 'var(--shadow-md), var(--shadow-glow)' : 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--sp-border-subtle)'; } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

/* ═══ STAT CARD ═══ */
export function StatCard({ label, value, subtitle, icon, color = 'var(--sp-green-600)', trend, onClick }) {
  const Icon = icon;

  return (
    <Card hover={!!onClick} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {/* Decorative accent */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${color}06`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-500)', marginBottom: 'var(--sp-2)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
          <p style={{ fontSize: '1.875rem', fontWeight: 800, fontFamily: 'var(--font-body)', color: 'var(--sp-slate-950)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{value}</p>
          {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)', marginTop: 'var(--sp-2)', fontWeight: 400 }}>{subtitle}</p>}
          {trend !== undefined && (
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, marginTop: 'var(--sp-2)', display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              background: trend >= 0 ? 'var(--sp-success-bg)' : 'var(--sp-danger-bg)',
              color: trend >= 0 ? 'var(--sp-success)' : 'var(--sp-danger)',
            }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        {icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: `linear-gradient(135deg, ${color}15, ${color}08)`,
            border: `1px solid ${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {React.isValidElement(icon) ? icon : <Icon size={22} style={{ color }} />}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ═══ BADGE ═══ */
export function Badge({ children, variant = 'default', dot = false, ...props }) {
  const styles = {
    default: { bg: 'var(--sp-slate-100)', color: 'var(--sp-slate-600)', border: 'var(--sp-slate-200)' },
    success: { bg: 'var(--sp-success-bg)', color: 'var(--sp-success)', border: '#bbf7d0' },
    danger: { bg: 'var(--sp-danger-bg)', color: 'var(--sp-danger)', border: '#fecaca' },
    warning: { bg: 'var(--sp-warning-bg)', color: 'var(--sp-warning)', border: '#fed7aa' },
    info: { bg: 'var(--sp-info-bg)', color: 'var(--sp-info)', border: '#bfdbfe' },
    green: { bg: 'var(--sp-green-50)', color: 'var(--sp-green-700)', border: 'var(--sp-green-200)' },
    amber: { bg: 'var(--sp-amber-50)', color: 'var(--sp-amber-700)', border: 'var(--sp-amber-200)' },
  };
  const s = styles[variant] || styles.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.2rem 0.7rem', borderRadius: 'var(--radius-full)',
      fontSize: '0.6875rem', fontWeight: 600, fontFamily: 'var(--font-body)',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      lineHeight: 1.5, whiteSpace: 'nowrap', letterSpacing: '0.01em',
      ...props.style,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />}
      {children}
    </span>
  );
}

/* ═══ INPUT ═══ */
export function Input({ label, error, icon: Icon, ...props }) {
  const [focused, setFocused] = useState(false);

  const inputStyle = {
    width: '100%', padding: '0.7rem 0.9rem', paddingLeft: Icon ? 40 : '0.9rem',
    borderRadius: 'var(--radius-md)',
    border: `1.5px solid ${error ? 'var(--sp-danger)' : focused ? 'var(--sp-green-400)' : 'var(--sp-border)'}`,
    fontSize: '0.875rem', fontFamily: 'var(--font-body)', fontWeight: 400,
    transition: 'all var(--duration-fast)',
    outline: 'none', background: focused ? 'white' : 'var(--sp-slate-50)',
    boxShadow: focused ? '0 0 0 3px rgba(34,169,122,0.08)' : 'none',
    boxSizing: 'border-box',
    ...props.style,
  };

  return (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      {label && <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--sp-slate-600)', marginBottom: 6, letterSpacing: '0.02em' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={17} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: focused ? 'var(--sp-green-500)' : 'var(--sp-slate-400)', transition: 'color 0.15s' }} />}
        {props.type === 'textarea' ? (
          <textarea {...props} style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} />
        ) : props.type === 'select' ? (
          <select {...props} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23636977' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36 }} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}>
            {props.children}
          </select>
        ) : (
          <input {...props} style={inputStyle} onFocus={(e) => { setFocused(true); props.onFocus?.(e); }} onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} />
        )}
      </div>
      {error && <p style={{ fontSize: '0.6875rem', color: 'var(--sp-danger)', marginTop: 5, fontWeight: 500 }}>{error}</p>}
    </div>
  );
}

/* ═══ MODAL ═══ */
export function Modal({ isOpen, onClose, title, children, width = 520 }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--sp-4)',
    }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,17,20,0.5)', backdropFilter: 'blur(8px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', background: 'var(--sp-surface)', borderRadius: 'var(--radius-xl)',
          width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto',
          boxShadow: 'var(--shadow-xl)', animation: 'scaleIn var(--duration-normal) var(--ease-spring)',
          border: '1px solid var(--sp-border-subtle)',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--sp-5) var(--sp-6)', borderBottom: '1px solid var(--sp-border-subtle)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--sp-slate-50)', border: '1px solid var(--sp-border-subtle)',
              cursor: 'pointer', padding: 6, borderRadius: 'var(--radius-sm)',
              color: 'var(--sp-slate-400)', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--sp-danger-bg)'; e.currentTarget.style.color = 'var(--sp-danger)'; e.currentTarget.style.borderColor = '#fecaca'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--sp-slate-50)'; e.currentTarget.style.color = 'var(--sp-slate-400)'; e.currentTarget.style.borderColor = 'var(--sp-border-subtle)'; }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 'var(--sp-6)' }}>{children}</div>
      </div>
    </div>
  );
}

/* ═══ DATA TABLE ═══ */
export function DataTable({ columns, data, onRowClick, emptyMessage = 'No data found', loading: isLoading }) {
  if (isLoading) {
    return (
      <div style={{ padding: 'var(--sp-10)', textAlign: 'center' }}>
        <Loader2 size={28} style={{ color: 'var(--sp-green-500)', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <p style={{ color: 'var(--sp-slate-400)', marginTop: 'var(--sp-3)', fontSize: '0.8125rem', fontWeight: 500 }}>Loading data...</p>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div style={{ padding: 'var(--sp-12)', textAlign: 'center' }}>
        <p style={{ color: 'var(--sp-slate-400)', fontSize: '0.875rem' }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{
                textAlign: col.align || 'left', padding: '0.75rem 1rem',
                borderBottom: '2px solid var(--sp-green-100)', color: 'var(--sp-slate-500)',
                fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
              }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={ri}
              onClick={() => onRowClick?.(row)}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background var(--duration-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sp-green-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map((col, ci) => (
                <td key={ci} style={{
                  padding: '0.8rem 1rem', borderBottom: '1px solid var(--sp-border-subtle)',
                  textAlign: col.align || 'left', color: 'var(--sp-slate-800)',
                  whiteSpace: col.nowrap ? 'nowrap' : 'normal', fontWeight: 400,
                }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══ AVATAR ═══ */
export function Avatar({ firstName, lastName, size = 36, src, color }) {
  const initials = `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  const bgColor = color || `hsl(${(firstName || '').charCodeAt(0) * 7 % 360}, 40%, 50%)`;

  if (src) {
    return <img src={src} alt={initials} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />;
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 700, fontSize: size * 0.36, fontFamily: 'var(--font-body)',
      flexShrink: 0, letterSpacing: '0.02em',
      boxShadow: `0 2px 8px ${bgColor}33`,
    }}>
      {initials}
    </div>
  );
}

/* ═══ PROGRESS BAR ═══ */
export function ProgressBar({ value, max = 100, color, height = 8, showLabel = false }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = color || (pct >= 80 ? 'var(--sp-success)' : pct >= 50 ? 'var(--sp-amber-500)' : 'var(--sp-danger)');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%' }}>
      <div style={{ flex: 1, height, background: 'var(--sp-slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
          borderRadius: 'var(--radius-full)', transition: 'width 0.8s var(--ease-out)',
          boxShadow: `0 0 8px ${barColor}30`,
        }} />
      </div>
      {showLabel && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: barColor, minWidth: 36, textAlign: 'right' }}>{pct}%</span>}
    </div>
  );
}

/* ═══ TABS ═══ */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 2, background: 'var(--sp-slate-100)',
      padding: 4, borderRadius: 'var(--radius-md)',
      border: '1px solid var(--sp-border-subtle)',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: active === tab.key ? 'var(--sp-surface)' : 'transparent',
            boxShadow: active === tab.key ? 'var(--shadow-sm)' : 'none',
            color: active === tab.key ? 'var(--sp-green-700)' : 'var(--sp-slate-500)',
            fontWeight: active === tab.key ? 700 : 500, fontSize: '0.8125rem',
            cursor: 'pointer', transition: 'all var(--duration-fast)', fontFamily: 'var(--font-body)',
            letterSpacing: '0.01em',
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              marginLeft: 6, fontSize: '0.625rem', fontWeight: 700,
              background: active === tab.key ? 'var(--sp-green-100)' : 'var(--sp-slate-200)',
              color: active === tab.key ? 'var(--sp-green-700)' : 'var(--sp-slate-500)',
              padding: '1px 7px', borderRadius: 'var(--radius-full)',
            }}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

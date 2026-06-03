const CURRENCY_LOCALES = {
  NGN: 'en-NG', USD: 'en-US', GBP: 'en-GB', EUR: 'de-DE',
  INR: 'en-IN', CNY: 'zh-CN', AED: 'ar-AE', ZAR: 'en-ZA',
  KES: 'en-KE', GHS: 'en-GH', XOF: 'fr-SN', XAF: 'fr-CM',
};

export function formatCurrency(amount, currency = 'NGN') {
  const locale = CURRENCY_LOCALES[currency] || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount || 0);
}

// Backward compatible alias
export const formatNaira = (amount) => formatCurrency(amount, 'NGN');

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${ampm}`;
}

export function getInitials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

export function gradeColor(letter) {
  const colors = {
    'A*': '#0D9488', A: '#16A34A', 'A+': '#16A34A', 'A-': '#22A97A',
    B: '#22A97A', 'B+': '#22A97A', 'B-': '#4DC49A',
    C: '#F59E0B', 'C+': '#F59E0B', 'C-': '#EA9A0B',
    D: '#EA580C', E: '#DC2626', F: '#991B1B', G: '#7F1D1D', U: '#525252',
  };
  return colors[letter] || '#8A8A8A';
}

export function attendanceColor(status) {
  const colors = { present: '#16A34A', absent: '#DC2626', late: '#F59E0B', excused: '#2563EB', sick: '#7C3AED' };
  return colors[status] || '#8A8A8A';
}

export function percentageColor(pct) {
  if (pct >= 80) return 'var(--sp-success)';
  if (pct >= 60) return 'var(--sp-green-500)';
  if (pct >= 40) return 'var(--sp-warning)';
  return 'var(--sp-danger)';
}

export function eventTypeColor(type) {
  const colors = {
    academic: '#22A97A', holiday: '#F59E0B', sports: '#DC2626',
    exam: '#7C3AED', meeting: '#2563EB', cultural: '#EC4899',
    other: '#8A8A8A',
  };
  return colors[type] || '#8A8A8A';
}

export function disciplineCategoryColor(cat) {
  const colors = { minor: '#F59E0B', moderate: '#EA580C', major: '#DC2626', critical: '#991B1B' };
  return colors[cat] || '#8A8A8A';
}

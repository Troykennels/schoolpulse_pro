import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, CalendarCheck, Wallet,
  Megaphone, Clock, Settings, LogOut, Menu, X, School,
  MessageCircle, BookOpenCheck, CalendarDays, ShieldAlert, Library, FileText,
  UserCog, Building2, Bus, HeartPulse, Package, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

const NAV_SECTIONS = [
  {
    title: 'Main',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['super_admin', 'school_admin', 'teacher', 'parent', 'student', 'accountant', 'staff'] },
      { key: 'students', label: 'Students', icon: Users, path: '/students', roles: ['super_admin', 'school_admin', 'teacher'] },
      { key: 'staff', label: 'Staff & HR', icon: UserCog, path: '/staff', roles: ['super_admin', 'school_admin', 'accountant'] },
    ],
  },
  {
    title: 'Academics',
    items: [
      { key: 'academics', label: 'Academics', icon: GraduationCap, path: '/academics', roles: ['super_admin', 'school_admin', 'teacher'] },
      { key: 'attendance', label: 'Attendance', icon: CalendarCheck, path: '/attendance', roles: ['super_admin', 'school_admin', 'teacher'] },
      { key: 'timetable', label: 'Timetable', icon: Clock, path: '/timetable', roles: ['super_admin', 'school_admin', 'teacher', 'parent', 'student'] },
      { key: 'reports', label: 'Report Cards', icon: FileText, path: '/reports', roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
      { key: 'learning', label: 'Learning Hub', icon: BookOpenCheck, path: '/learning', roles: ['super_admin', 'school_admin', 'teacher', 'parent', 'student'] },
    ],
  },
  {
    title: 'Finance',
    items: [
      { key: 'fees', label: 'Fees & Payments', icon: Wallet, path: '/fees', roles: ['super_admin', 'school_admin', 'accountant'] },
      { key: 'payroll', label: 'Staff Payroll', icon: Wallet, path: '/payroll', roles: ['super_admin', 'school_admin', 'accountant'] },
      { key: 'inventory', label: 'Inventory', icon: Package, path: '/inventory', roles: ['super_admin', 'school_admin', 'accountant', 'staff'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { key: 'hostel', label: 'Hostel', icon: Building2, path: '/hostel', roles: ['super_admin', 'school_admin', 'staff'] },
      { key: 'transport', label: 'Transport', icon: Bus, path: '/transport', roles: ['super_admin', 'school_admin', 'staff'] },
      { key: 'medical', label: 'Medical', icon: HeartPulse, path: '/medical', roles: ['super_admin', 'school_admin', 'teacher', 'staff'] },
      { key: 'library', label: 'Library', icon: Library, path: '/library', roles: ['super_admin', 'school_admin', 'teacher', 'staff', 'student'] },
    ],
  },
  {
    title: 'Communication',
    items: [
      { key: 'announcements', label: 'Announcements', icon: Megaphone, path: '/announcements', roles: ['super_admin', 'school_admin', 'teacher', 'parent'] },
      { key: 'events', label: 'Events', icon: CalendarDays, path: '/events', roles: ['super_admin', 'school_admin', 'teacher', 'parent', 'student'] },
      { key: 'disciplines', label: 'Discipline', icon: ShieldAlert, path: '/disciplines', roles: ['super_admin', 'school_admin', 'teacher'] },
      { key: 'chat', label: 'Staff Chat', icon: MessageCircle, path: '/chat', roles: ['super_admin', 'school_admin', 'teacher', 'accountant', 'staff'] },
    ],
  },
  {
    title: 'System',
    items: [
      { key: 'settings', label: 'Settings', icon: Settings, path: '/settings', roles: ['super_admin', 'school_admin'] },
    ],
  },
];

export default function Layout({ children }) {
  const { user, school, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const activePath = location.pathname;

  const toggleSection = (title) => {
    setCollapsed(c => ({ ...c, [title]: !c[title] }));
  };

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '?';
  const roleLabel = {
    super_admin: 'Super Admin',
    school_admin: 'School Admin',
    teacher: 'Teacher',
    parent: 'Parent',
    student: 'Student',
    accountant: 'Accountant',
    staff: 'Staff',
  }[user?.role] || user?.role;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafb' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .sidebar-link { display: flex; align-items: center; gap: 10px; padding: 9px 14px;
          border-radius: 8px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.45);
          text-decoration: none; cursor: pointer; transition: all 0.15s; border: none;
          background: transparent; width: 100%; text-align: left; font-family: 'Inter', sans-serif; }
        .sidebar-link:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
        .sidebar-link.active { background: rgba(34,169,122,0.15); color: #4ade80; }
        .section-title { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.2);
          letter-spacing: 0.12em; padding: 18px 16px 6px; text-transform: uppercase;
          cursor: pointer; display: flex; justify-content: space-between; align-items: center;
          user-select: none; }
        .section-title:hover { color: rgba(255,255,255,0.35); }
        @media (min-width: 1024px) {
          .sidebar { left: 0 !important; box-shadow: none !important; }
          .mobile-overlay { display: none !important; }
          .main-content { margin-left: 260px !important; }
          .mobile-header { display: none !important; }
        }
        @media (max-width: 1023px) {
          .sidebar { left: -280px; }
          .sidebar.open { left: 0; animation: slideIn 0.3s ease-out; }
          .main-content { margin-left: 0 !important; }
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 40 }} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: 260, position: 'fixed', top: 0, bottom: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        background: 'linear-gradient(185deg, #0a2e22 0%, #07241a 40%, #041a12 100%)',
        boxShadow: sidebarOpen ? '8px 0 40px rgba(0,0,0,0.3)' : 'none',
      }}>
        {/* Logo */}
        <div style={{ padding: '22px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #22A97A, #1a8f66)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(34,169,122,0.25)',
            }}>
              <School size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.1 }}>SchoolPulse</div>
              <div style={{ fontSize: 9, opacity: 0.3, letterSpacing: '0.1em', fontWeight: 600, marginTop: 1 }}>ORION SOFT</div>
            </div>
          </div>
          {school && (
            <p style={{ fontSize: 11, opacity: 0.3, marginTop: 12, lineHeight: 1.4, paddingLeft: 2 }}>
              {school.name}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '4px 10px 20px', overflowY: 'auto' }}>
          {NAV_SECTIONS.map(section => {
            const visibleItems = section.items.filter(item => item.roles.includes(user?.role));
            if (visibleItems.length === 0) return null;
            const isCollapsed = collapsed[section.title];

            return (
              <div key={section.title}>
                <div className="section-title" onClick={() => toggleSection(section.title)}>
                  <span>{section.title}</span>
                  <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }} />
                </div>
                {!isCollapsed && visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path));
                  return (
                    <button key={item.key}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={() => { navigate(item.path); setSidebarOpen(false); }}>
                      <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div style={{ padding: '14px 14px 18px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '0 4px' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(34,169,122,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#4ade80',
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: 10, color: '#22A97A', fontWeight: 600, letterSpacing: '0.04em' }}>{roleLabel}</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); toast.success('Signed out'); }}
            className="sidebar-link" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content" style={{ flex: 1, marginLeft: 260, minHeight: '100vh' }}>
        {/* Mobile header */}
        <div className="mobile-header" style={{
          position: 'sticky', top: 0, zIndex: 30, padding: '12px 16px',
          background: 'white', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#374151' }}>
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <School size={18} color="#22A97A" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>SchoolPulse</span>
          </div>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: '#f0fdf4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#22A97A',
          }}>{initials}</div>
        </div>

        {/* Page content */}
        <div style={{ padding: 'clamp(16px, 2.5vw, 28px)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

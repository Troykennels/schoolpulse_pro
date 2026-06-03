import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';

// Lazy load all pages
const DashboardPage = lazy(() => import('./components/dashboard/DashboardPage'));
const StudentsPage = lazy(() => import('./components/students/StudentsPage'));
const StaffPage = lazy(() => import('./components/staff/StaffPage'));
const AcademicsPage = lazy(() => import('./components/academics/AcademicsPage'));
const AttendancePage = lazy(() => import('./components/attendance/AttendancePage'));
const FeesPage = lazy(() => import('./components/fees/FeesPage'));
const PayrollPage = lazy(() => import('./components/staff/PayrollPage'));
const AnnouncementsPage = lazy(() => import('./components/announcements/AnnouncementsPage'));
const TimetablePage = lazy(() => import('./components/timetable/TimetablePage'));
const SettingsPage = lazy(() => import('./components/settings/SettingsPage'));
const StaffChatPage = lazy(() => import('./components/chat/StaffChatPage'));
const LearningPage = lazy(() => import('./components/learning/LearningPage'));
const EventsPage = lazy(() => import('./components/events/EventsPage'));
const DisciplinesPage = lazy(() => import('./components/disciplines/DisciplinesPage'));
const LibraryPage = lazy(() => import('./components/library/LibraryPage'));
const ReportsPage = lazy(() => import('./components/reports/ReportsPage'));
const HostelPage = lazy(() => import('./components/hostel/HostelPage'));
const TransportPage = lazy(() => import('./components/transport/TransportPage'));
const MedicalPage = lazy(() => import('./components/hostel/MedicalPage'));
const InventoryPage = lazy(() => import('./components/staff/InventoryPage'));

function PageLoader() {
  return (
    <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: 14 }}>
      <div style={{
        width: 20, height: 20, border: '2px solid #e5e7eb',
        borderTopColor: '#22A97A', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#f8fafb',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, border: '3px solid #e5e7eb',
            borderTopColor: '#22A97A', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>Loading SchoolPulse...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      <Route path="/students" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher']}><StudentsPage /></ProtectedRoute>
      } />

      <Route path="/staff" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'accountant']}><StaffPage /></ProtectedRoute>
      } />

      <Route path="/academics" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher']}><AcademicsPage /></ProtectedRoute>
      } />

      <Route path="/attendance" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher']}><AttendancePage /></ProtectedRoute>
      } />

      <Route path="/fees" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'accountant']}><FeesPage /></ProtectedRoute>
      } />

      <Route path="/payroll" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'accountant']}><PayrollPage /></ProtectedRoute>
      } />

      <Route path="/hostel" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'staff']}><HostelPage /></ProtectedRoute>
      } />

      <Route path="/transport" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'staff']}><TransportPage /></ProtectedRoute>
      } />

      <Route path="/medical" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher', 'staff']}><MedicalPage /></ProtectedRoute>
      } />

      <Route path="/inventory" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'accountant', 'staff']}><InventoryPage /></ProtectedRoute>
      } />

      <Route path="/events" element={
        <ProtectedRoute><EventsPage /></ProtectedRoute>
      } />

      <Route path="/disciplines" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher']}><DisciplinesPage /></ProtectedRoute>
      } />

      <Route path="/library" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher', 'staff', 'student']}><LibraryPage /></ProtectedRoute>
      } />

      <Route path="/announcements" element={
        <ProtectedRoute><AnnouncementsPage /></ProtectedRoute>
      } />

      <Route path="/chat" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher', 'accountant', 'staff']}><StaffChatPage /></ProtectedRoute>
      } />

      <Route path="/learning" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher', 'parent', 'student']}><LearningPage /></ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute roles={['super_admin', 'school_admin', 'teacher', 'parent']}><ReportsPage /></ProtectedRoute>
      } />

      <Route path="/timetable" element={
        <ProtectedRoute><TimetablePage /></ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute roles={['super_admin', 'school_admin']}><SettingsPage /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

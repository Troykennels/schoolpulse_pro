import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { StatCard, Card, Badge, ProgressBar, Button } from '../common/UI';
import { formatCurrency, formatNaira, formatDate } from '../../utils/helpers';
import { Users, GraduationCap, CalendarCheck, Wallet, Megaphone, TrendingUp, AlertCircle, BookOpen, ClipboardCheck, Award, Target, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { user, isAdmin, isParent, isTeacher, isStudent } = useAuth();
  const navigate = useNavigate();
  const dashboardUrl = isParent ? '/dashboard/parent' : isTeacher ? '/dashboard/teacher' : isStudent ? '/dashboard/student' : isAdmin ? '/dashboard/overview' : '/dashboard/staff';
  const { data: overview, loading } = useApi(dashboardUrl);
  const { data: trends } = useApi(isAdmin ? '/dashboard/attendance-trends?days=14' : null, { immediate: isAdmin });

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (isParent && overview) return <ParentDashboard data={overview} />;
  if (isTeacher && overview) return <TeacherDashboard data={overview} user={user} />;
  if (isStudent && overview) return <StudentDashboard data={overview} user={user} navigate={navigate} />;
  if (!isAdmin && overview) return <StaffDashboard data={overview} user={user} />;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.first_name}
        </h1>
        <p style={{ color: 'var(--sp-slate-500)', marginTop: 'var(--sp-1)', fontSize: '0.9375rem' }}>
          Here's what's happening at your school today
        </p>
      </div>

      {/* Stat Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }} className="stagger-children">
        <StatCard label="Total Students" value={overview?.counts?.students || 0} icon={Users} color="var(--sp-green-600)" onClick={() => navigate('/students')} />
        <StatCard label="Staff Members" value={overview?.counts?.staff || 0} icon={GraduationCap} color="var(--sp-info)" onClick={() => navigate('/settings')} />
        <StatCard
          label="Attendance Today"
          value={`${overview?.attendance_today?.rate || 0}%`}
          subtitle={`${overview?.attendance_today?.present || 0} of ${overview?.attendance_today?.total_marked || 0} present`}
          icon={CalendarCheck}
          color="var(--sp-amber-600)"
          onClick={() => navigate('/attendance')}
        />
        <StatCard
          label="Fee Collection"
          value={`${overview?.fee_collection?.collection_rate || 0}%`}
          subtitle={formatNaira(overview?.fee_collection?.total_collected)}
          icon={Wallet}
          color="var(--sp-green-700)"
          onClick={() => navigate('/fees')}
        />
      </div>

      <Card style={{ marginBottom: 'var(--sp-6)' }}>
        <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--sp-4)' }}>School Operations</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" icon={MessageSquare} onClick={() => navigate('/chat')}>Open Staff Chat</Button>
          <Button variant="secondary" icon={BookOpen} onClick={() => navigate('/learning')}>Open Learning Hub</Button>
          <Button variant="secondary" icon={Users} onClick={() => navigate('/settings')}>Manage Logins</Button>
        </div>
      </Card>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        {/* Attendance Trend */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Attendance Trend</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)', marginTop: 2 }}>Last 14 days</p>
            </div>
            <TrendingUp size={18} style={{ color: 'var(--sp-green-500)' }} />
          </div>
          <div style={{ height: 200 }}>
            {trends?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22A97A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22A97A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8A8A8A' }} tickFormatter={d => new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short' })} />
                  <YAxis tick={{ fontSize: 11, fill: '#8A8A8A' }} domain={[0, 100]} />
                  <Tooltip formatter={v => `${v}%`} labelFormatter={d => formatDate(d)} contentStyle={{ borderRadius: 8, border: '1px solid var(--sp-border)', fontSize: 13 }} />
                  <Area type="monotone" dataKey="rate" stroke="#22A97A" strokeWidth={2} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--sp-slate-400)', fontSize: '0.875rem' }}>
                No attendance data yet
              </div>
            )}
          </div>
        </Card>

        {/* Fee Collection Progress */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-5)' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Fee Collection</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)', marginTop: 2 }}>
                {overview?.current_term?.name || 'Current Term'}
              </p>
            </div>
            <Wallet size={18} style={{ color: 'var(--sp-amber-500)' }} />
          </div>

          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-600)' }}>Collected</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sp-slate-800)' }}>
                {formatNaira(overview?.fee_collection?.total_collected)} / {formatNaira(overview?.fee_collection?.total_expected)}
              </span>
            </div>
            <ProgressBar value={overview?.fee_collection?.collection_rate || 0} showLabel />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-green-50)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sp-green-600)', fontWeight: 600 }}>COLLECTED</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--sp-green-800)' }}>
                {formatNaira(overview?.fee_collection?.total_collected)}
              </p>
            </div>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-amber-50)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sp-amber-700)', fontWeight: 600 }}>OUTSTANDING</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--sp-amber-800)' }}>
                {formatNaira((overview?.fee_collection?.total_expected || 0) - (overview?.fee_collection?.total_collected || 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Announcements */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Recent Announcements</h3>
          <Megaphone size={18} style={{ color: 'var(--sp-slate-400)' }} />
        </div>
        {overview?.recent_announcements?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {overview.recent_announcements.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                padding: 'var(--sp-3)', borderRadius: 'var(--radius-md)',
                background: a.priority === 'high' ? 'var(--sp-danger-bg)' : 'var(--sp-slate-50)',
                border: `1px solid ${a.priority === 'high' ? '#FECACA' : 'var(--sp-border-subtle)'}`,
              }}>
                {a.priority === 'high' && <AlertCircle size={16} style={{ color: 'var(--sp-danger)', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-400)' }}>{formatDate(a.created_at)}</p>
                </div>
                <Badge variant={a.priority === 'high' ? 'danger' : 'default'}>{a.target_audience}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--sp-slate-400)', fontSize: '0.875rem', textAlign: 'center', padding: 'var(--sp-6)' }}>No announcements yet</p>
        )}
      </Card>
    </div>
  );
}

function StudentDashboard({ data, user, navigate }) {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Learning Workspace</h1>
        <p style={{ color: 'var(--sp-slate-500)', marginTop: 'var(--sp-1)', fontSize: '0.9375rem' }}>
          Welcome, {user?.first_name}. Continue WAEC practice, school quizzes, and revision tasks from one place.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <StatCard label="Available Quizzes" value={data.counts?.quiz_banks || 0} icon={BookOpen} color="var(--sp-green-600)" onClick={() => navigate('/learning')} />
        <StatCard label="Attempts" value={data.counts?.attempts || 0} icon={ClipboardCheck} color="var(--sp-info)" onClick={() => navigate('/learning')} />
        <StatCard label="Average Score" value={`${data.average_score || 0}%`} icon={Award} color="var(--sp-amber-600)" onClick={() => navigate('/learning')} />
      </div>
      <Card>
        <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 'var(--sp-4)' }}>Recent Practice</h3>
        {(data.recent_attempts || []).length ? data.recent_attempts.map((attempt) => (
          <div key={attempt.id} style={{ padding: 'var(--sp-3)', borderBottom: '1px solid var(--sp-border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>{formatDate(attempt.created_at)}</span>
            <Badge variant="green">{attempt.score}/{attempt.total}</Badge>
          </div>
        )) : (
          <p style={{ color: 'var(--sp-slate-400)', fontSize: '0.875rem' }}>No quiz attempts yet</p>
        )}
      </Card>
    </div>
  );
}

function StaffDashboard({ data, user }) {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Staff Workspace</h1>
        <p style={{ color: 'var(--sp-slate-500)', marginTop: 'var(--sp-1)', fontSize: '0.9375rem' }}>
          Welcome, {user?.first_name}. Your access is limited to the operations your role is allowed to manage.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <StatCard label="Active Students" value={data.counts?.students || 0} icon={Users} color="var(--sp-green-600)" />
        <StatCard label="Payments Recorded" value={data.counts?.payments || 0} icon={Wallet} color="var(--sp-amber-600)" />
        <StatCard label="Collected" value={formatNaira(data.fee_collection?.total_collected)} icon={TrendingUp} color="var(--sp-green-700)" />
      </div>
      <Card style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" icon={MessageSquare} onClick={() => navigate('/chat')}>Open Staff Chat</Button>
        </div>
      </Card>
      <Card>
        <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 'var(--sp-4)' }}>Recent Announcements</h3>
        {(data.recent_announcements || []).map((item) => (
          <div key={item.id} style={{ padding: 'var(--sp-3)', borderBottom: '1px solid var(--sp-border-subtle)' }}>
            <p style={{ fontWeight: 600 }}>{item.title}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{formatDate(item.created_at)}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}

function TeacherDashboard({ data, user }) {
  const navigate = useNavigate();
  const classes = data.assigned_classes || [];
  const subjects = data.taught_subjects || [];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Class Teacher Workspace
        </h1>
        <p style={{ color: 'var(--sp-slate-500)', marginTop: 'var(--sp-1)', fontSize: '0.9375rem' }}>
          Welcome, {user?.first_name}. Track your classes, learners, attendance, and academic risk in one place.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <StatCard label="Assigned Classes" value={data.counts?.assigned_classes || 0} icon={Users} color="var(--sp-green-600)" />
        <StatCard label="Teaching Loads" value={data.counts?.taught_subjects || 0} icon={BookOpen} color="var(--sp-info)" />
        <StatCard label="Current Term" value={data.current_term?.name || 'Active'} icon={GraduationCap} color="var(--sp-amber-600)" />
        <StatCard label="Marked Today" value={data.counts?.attendance_marked_today || 0} icon={ClipboardCheck} color="var(--sp-green-700)" />
      </div>

      <Card style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-3)' }}>
          <Button variant="secondary" icon={MessageSquare} onClick={() => navigate('/chat')}>Open Staff Chat</Button>
          <Button variant="secondary" icon={BookOpen} onClick={() => navigate('/learning')}>Create / Review Quizzes</Button>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--sp-4)' }}>
        <Card padding={false}>
          <div style={{ padding: 'var(--sp-5)', borderBottom: '1px solid var(--sp-border-subtle)' }}>
            <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>My Class Intelligence</h3>
          </div>
          {classes.length ? classes.map((cls) => (
            <div key={cls.id} style={{ padding: 'var(--sp-5)', borderBottom: '1px solid var(--sp-border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-4)', flexWrap: 'wrap', marginBottom: 'var(--sp-3)' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{cls.name}</h4>
                  <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.8125rem' }}>{cls.student_count} active students</p>
                </div>
                <Badge variant={cls.at_risk > 0 ? 'warning' : 'success'}>{cls.at_risk} need support</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--sp-3)' }}>
                <MetricTile label="Class Average" value={`${cls.class_average || 0}%`} icon={Award} />
                <MetricTile label="Attendance" value={`${cls.attendance_rate || 0}%`} icon={CalendarCheck} />
                <MetricTile label="Intervention" value={cls.at_risk ? 'Required' : 'Stable'} icon={Target} />
              </div>
            </div>
          )) : (
            <p style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--sp-slate-400)' }}>No class has been assigned to this teacher yet.</p>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 'var(--sp-4)' }}>Teaching Timetable Load</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {subjects.slice(0, 12).map((item, index) => (
              <div key={`${item.class_id}-${item.subject_code}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.subject_name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-500)' }}>{item.class_name}</p>
                </div>
                <Badge variant="green">{item.subject_code}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricTile({ label, value, icon: Icon }) {
  return (
    <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--sp-slate-500)', marginBottom: 'var(--sp-1)' }}>
        <Icon size={15} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{label}</span>
      </div>
      <p style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{value}</p>
    </div>
  );
}

/* ── Parent-specific Dashboard ── */
function ParentDashboard({ data }) {
  const navigate = useNavigate();
  const { children = [], current_term } = data;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>My Children</h1>
        <p style={{ color: 'var(--sp-slate-500)', marginTop: 'var(--sp-1)', fontSize: '0.9375rem' }}>
          {current_term?.name || 'Current Term'} Overview
        </p>
      </div>
      <Card style={{ marginBottom: 'var(--sp-6)' }}>
        <Button variant="secondary" icon={BookOpen} onClick={() => navigate('/learning')}>Open Learning Hub</Button>
      </Card>

      {children.length ? children.map(child => (
        <Card key={child.id} style={{ marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--sp-green-400), var(--sp-green-700))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1.125rem'
            }}>
              {child.first_name[0]}{child.last_name[0]}
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{child.first_name} {child.last_name}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{child.class_name} · {child.admission_no}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--sp-slate-900)' }}>
                {child.performance?.average || 0}%
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-500)' }}>Average</p>
            </div>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-green-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--sp-green-700)' }}>
                {child.attendance?.total ? Math.round((child.attendance.present / child.attendance.total) * 100) : 0}%
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sp-green-600)' }}>Attendance</p>
            </div>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-amber-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--sp-amber-700)' }}>
                {formatNaira(child.fees?.balance)}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--sp-amber-600)' }}>Fee Balance</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-green-50)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--sp-green-700)', fontWeight: 700, marginBottom: 4 }}>Strongest Subject</p>
              <p style={{ fontWeight: 600 }}>{child.performance?.strongest_subject?.subject || 'Pending results'}</p>
              {child.performance?.strongest_subject && <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{child.performance.strongest_subject.total}% - {child.performance.strongest_subject.remark}</p>}
            </div>
            <div style={{ padding: 'var(--sp-3)', background: 'var(--sp-amber-50)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--sp-amber-700)', fontWeight: 700, marginBottom: 4 }}>Support Focus</p>
              <p style={{ fontWeight: 600 }}>{child.performance?.support_subject?.subject || 'Pending results'}</p>
              {child.performance?.support_subject && <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{child.performance.support_subject.total}% - {child.performance.support_subject.remark}</p>}
            </div>
          </div>

          {child.grades?.length > 0 && (
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sp-slate-700)', marginBottom: 'var(--sp-2)' }}>Subject Results</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--sp-2)' }}>
                {child.grades.map((g, i) => (
                  <div key={i} style={{
                    padding: 'var(--sp-2) var(--sp-3)', background: 'var(--sp-slate-50)',
                    borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sp-slate-600)' }}>{g.subject}</span>
                    <Badge variant={g.grade_letter === 'A' ? 'success' : g.grade_letter === 'B' ? 'green' : g.grade_letter === 'F' ? 'danger' : 'warning'}>
                      {g.grade_letter} ({g.total})
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {child.behavioural_traits && (
            <div style={{ marginTop: 'var(--sp-5)', padding: 'var(--sp-4)', background: 'var(--sp-slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--sp-border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                <MessageSquare size={17} style={{ color: 'var(--sp-green-700)' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>Teacher and Head Teacher Remarks</p>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--sp-slate-700)', marginBottom: 'var(--sp-2)' }}>{child.behavioural_traits.class_teacher_remark}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--sp-slate-500)' }}>{child.behavioural_traits.head_teacher_remark}</p>
            </div>
          )}
        </Card>
      )) : (
        <Card>
          <p style={{ textAlign: 'center', color: 'var(--sp-slate-400)', padding: 'var(--sp-8)' }}>No children linked to your account yet</p>
        </Card>
      )}
    </div>
  );
}

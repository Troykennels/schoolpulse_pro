import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2, Shield, School, User, Lock, Mail, Phone, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('loading'); // 'loading' | 'login' | 'setup'
  const [form, setForm] = useState({ login: '', password: '' });
  const [setupForm, setSetupForm] = useState({
    email: '', password: '', confirm_password: '', first_name: '', last_name: '', phone: '',
    school_name: '', school_code: '', country: 'Nigeria', curriculum: 'nigerian',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState(1);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const res = await api.get('/auth/check-setup');
      setMode(res.data.data.needsSetup ? 'setup' : 'login');
    } catch {
      setMode('login');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.login || !form.password) return toast.error('Please enter your credentials');
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    if (setupForm.password !== setupForm.confirm_password) {
      return toast.error('Passwords do not match');
    }
    if (setupForm.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/setup', setupForm);
      const { token, user } = res.data.data;
      localStorage.setItem('sp_token', token);
      toast.success('School created successfully! Welcome aboard.');
      window.location.href = '/';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const u = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const us = (key, val) => setSetupForm(f => ({ ...f, [key]: val }));

  if (mode === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1a14' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#22A97A' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(145deg, #061210 0%, #0a1f18 40%, #071712 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .sp-input { width: 100%; padding: 13px 16px; border-radius: 10px; font-size: 14px;
          font-family: 'Inter', sans-serif; outline: none; transition: all 0.25s;
          background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.08);
          color: #e2e8f0; box-sizing: border-box; }
        .sp-input:focus { background: rgba(255,255,255,0.08); border-color: #22A97A;
          box-shadow: 0 0 0 3px rgba(34,169,122,0.15); }
        .sp-input::placeholder { color: rgba(255,255,255,0.25); }
        .sp-btn { width: 100%; padding: 14px; border-radius: 10px; border: none;
          font-size: 15px; font-weight: 600; font-family: 'Inter', sans-serif;
          cursor: pointer; transition: all 0.25s; display: flex; align-items: center;
          justify-content: center; gap: 8px; }
        .sp-btn-primary { background: linear-gradient(135deg, #22A97A, #1a8f66);
          color: white; box-shadow: 0 4px 20px rgba(34,169,122,0.3); }
        .sp-btn-primary:hover { box-shadow: 0 8px 28px rgba(34,169,122,0.4); transform: translateY(-1px); }
        .sp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .sp-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5);
          margin-bottom: 6px; display: block; letter-spacing: 0.04em; }
        @media (max-width: 900px) {
          .login-left { display: none !important; }
          .login-right { flex: 1 !important; padding: 40px 24px !important; }
        }
      `}</style>

      {/* Background effects */}
      <div style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,169,122,0.08) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: -150, left: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.015, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Left panel — branding */}
      <div className="login-left" style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '4rem 5rem', color: 'white', position: 'relative',
      }}>
        <div style={{ maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #22A97A, #1a8f66)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 28px rgba(34,169,122,0.3)',
            }}>
              <School size={26} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>SchoolPulse</span>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', opacity: 0.35, textTransform: 'uppercase', marginTop: -2 }}>
                by Orion Soft Limited
              </p>
            </div>
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24 }}>
            School management,<br />
            <span style={{ background: 'linear-gradient(135deg, #22A97A, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              redefined.
            </span>
          </h2>

          <p style={{ fontSize: 16, lineHeight: 1.8, opacity: 0.4, maxWidth: 400 }}>
            Complete school administration — academics, fees, attendance, staff payroll, hostel,
            transport, and more. One intelligent platform for every school.
          </p>

          <div style={{ display: 'flex', gap: 24, marginTop: 48 }}>
            {[
              { num: '30+', label: 'Modules' },
              { num: '7', label: 'User Roles' },
              { num: '100%', label: 'Cloud Based' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#22A97A' }}>{s.num}</div>
                <div style={{ fontSize: 11, opacity: 0.35, fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-right" style={{
        width: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '4rem 3.5rem', position: 'relative',
      }}>
        <div className="fade-in">

          {/* ═══ LOGIN MODE ═══ */}
          {mode === 'login' && (
            <>
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Shield size={18} color="#22A97A" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#22A97A', letterSpacing: '0.08em' }}>SECURE LOGIN</span>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>Welcome back</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Sign in to your SchoolPulse account</p>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="sp-label">Email or Phone</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 14, top: 15, color: 'rgba(255,255,255,0.2)' }} />
                    <input className="sp-input" style={{ paddingLeft: 40 }}
                      type="text" placeholder="Enter your email or phone"
                      value={form.login} onChange={e => u('login', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="sp-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 14, top: 15, color: 'rgba(255,255,255,0.2)' }} />
                    <input className="sp-input" style={{ paddingLeft: 40, paddingRight: 44 }}
                      type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                      value={form.password} onChange={e => u('password', e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="sp-btn sp-btn-primary" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <>Sign In <ArrowRight size={16} /></>}
                </button>
              </form>

              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 24, lineHeight: 1.7 }}>
                Protected by rate limiting and account lockout.<br />
                Contact your administrator if you need access.
              </p>
            </>
          )}

          {/* ═══ SETUP MODE ═══ */}
          {mode === 'setup' && (
            <>
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <School size={18} color="#22A97A" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#22A97A', letterSpacing: '0.08em' }}>FIRST-TIME SETUP</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
                  {setupStep === 1 ? 'Create Your School' : 'Create Admin Account'}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                  Step {setupStep} of 2 — {setupStep === 1 ? 'School details' : 'Your admin credentials'}
                </p>
                {/* Progress bar */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#22A97A' }} />
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: setupStep >= 2 ? '#22A97A' : 'rgba(255,255,255,0.08)' }} />
                </div>
              </div>

              <form onSubmit={setupStep === 1 ? (e) => { e.preventDefault(); setSetupStep(2); } : handleSetup}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {setupStep === 1 && (
                  <>
                    <div>
                      <label className="sp-label">School Name *</label>
                      <input className="sp-input" placeholder="e.g. Greenfield International School"
                        value={setupForm.school_name} onChange={e => us('school_name', e.target.value)} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="sp-label">School Code</label>
                        <input className="sp-input" placeholder="e.g. GIS"
                          value={setupForm.school_code} onChange={e => us('school_code', e.target.value)} />
                      </div>
                      <div>
                        <label className="sp-label">Country</label>
                        <select className="sp-input" value={setupForm.country} onChange={e => us('country', e.target.value)}>
                          <option value="Nigeria">Nigeria</option>
                          <option value="Ghana">Ghana</option>
                          <option value="Kenya">Kenya</option>
                          <option value="South Africa">South Africa</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="United States">United States</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="sp-label">Curriculum</label>
                      <select className="sp-input" value={setupForm.curriculum} onChange={e => us('curriculum', e.target.value)}>
                        <option value="nigerian">Nigerian (WAEC/NECO)</option>
                        <option value="british">British (IGCSE/A-Levels)</option>
                        <option value="american">American</option>
                        <option value="ib">International Baccalaureate (IB)</option>
                        <option value="cbse">Indian (CBSE)</option>
                        <option value="french">French</option>
                        <option value="custom">Custom / Mixed</option>
                      </select>
                    </div>
                    <button type="submit" className="sp-btn sp-btn-primary" style={{ marginTop: 4 }}
                      disabled={!setupForm.school_name}>
                      Continue <ArrowRight size={16} />
                    </button>
                  </>
                )}

                {setupStep === 2 && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="sp-label">First Name *</label>
                        <input className="sp-input" placeholder="Your first name"
                          value={setupForm.first_name} onChange={e => us('first_name', e.target.value)} required />
                      </div>
                      <div>
                        <label className="sp-label">Last Name *</label>
                        <input className="sp-input" placeholder="Your last name"
                          value={setupForm.last_name} onChange={e => us('last_name', e.target.value)} required />
                      </div>
                    </div>
                    <div>
                      <label className="sp-label">Email Address *</label>
                      <input className="sp-input" type="email" placeholder="admin@yourschool.edu"
                        value={setupForm.email} onChange={e => us('email', e.target.value)} required />
                    </div>
                    <div>
                      <label className="sp-label">Phone Number</label>
                      <input className="sp-input" placeholder="+234..."
                        value={setupForm.phone} onChange={e => us('phone', e.target.value)} />
                    </div>
                    <div>
                      <label className="sp-label">Password * (min 8 characters)</label>
                      <input className="sp-input" type="password" placeholder="Create a strong password"
                        value={setupForm.password} onChange={e => us('password', e.target.value)} required minLength={8} />
                    </div>
                    <div>
                      <label className="sp-label">Confirm Password *</label>
                      <input className="sp-input" type="password" placeholder="Re-enter your password"
                        value={setupForm.confirm_password} onChange={e => us('confirm_password', e.target.value)} required />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button type="button" onClick={() => setSetupStep(1)}
                        style={{ flex: 1, padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        Back
                      </button>
                      <button type="submit" className="sp-btn sp-btn-primary" style={{ flex: 2 }} disabled={loading}>
                        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <>Create School & Login <ArrowRight size={16} /></>}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </>
          )}

          {/* Footer */}
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
              SchoolPulse by Orion Soft Limited — orionsoftlimited.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

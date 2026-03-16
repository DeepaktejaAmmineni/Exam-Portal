import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function AuthPage() {
  const [mode, setMode]       = useState('login');
  const [form, setForm]       = useState({ full_name: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register }   = useAuth();
  const navigate              = useNavigate();

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(form.email, form.password);
        navigate(user.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        await register(form.full_name, form.email, form.password);
        setMode('login');
        alert('Registered successfully! Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">EP</div>
          <span>ExamPortal</span>
        </div>
        <div className="auth-hero">
          <h1>Technical Assessment<br />Platform</h1>
          <p>Conduct, manage, and analyse technical exams — all in one place.</p>
        </div>
        <div className="auth-features">
          {['MCQ & Coding Exams','Live Timer Engine','Instant Results','Admin Analytics'].map(f => (
            <div className="auth-feature" key={f}>
              <span className="auth-feature-dot" />
              {f}
            </div>
          ))}
        </div>
        <div className="auth-grid-bg" />
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Sign In</button>
            <button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Register</button>
          </div>

          <form onSubmit={submit} className="auth-form">
            <h2>{mode==='login' ? 'Welcome back' : 'Create account'}</h2>
            <p className="auth-sub">
              {mode==='login'
                ? 'Enter your credentials to continue'
                : 'Register as a student to take exams'}
            </p>

            {mode==='register' && (
              <div className="field">
                <label>Full Name</label>
                <input name="full_name" placeholder="John Smith" value={form.full_name} onChange={handle} required />
              </div>
            )}

            <div className="field">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handle} required />
            </div>

            <div className="field">
              <label>Password</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handle} required />
            </div>

            {/* NOTE: No role selector here — public registration always creates students.
                Admin accounts are created only from the Admin Panel > Users page. */}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (mode==='login' ? 'Sign In' : 'Create Student Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import API from '../utils/api';

const emptyForm = { full_name: '', email: '', password: '', role: 'student' };

export default function AdminUsers() {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(emptyForm);
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = () => {
    API.get('/api/users/').then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  const createUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await API.post('/api/users/create-admin', form);
      loadUsers();
      setShowForm(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error creating user');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    await API.put(`/api/users/${id}/deactivate`);
    setUsers(us => us.map(u => u.id === id ? { ...u, is_active: false } : u));
  };

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);
  const students  = users.filter(u => u.role === 'student');
  const admins    = users.filter(u => u.role === 'admin');
  const active    = users.filter(u => u.is_active);

  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;

  return (
    <div style={{maxWidth:1000}}>
      <div className="page-header" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <h1>Users</h1>
          <p>{users.length} registered users</p>
        </div>
        <button className="btn-sm-primary" onClick={() => { setShowForm(!showForm); setFormError(''); }}>
          {showForm ? 'Cancel' : '+ Create User'}
        </button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <div className="card" style={{marginBottom:24,background:'var(--blue-50)',border:'1.5px solid var(--blue-200)'}}>
          <h3 style={{marginBottom:4,color:'var(--blue-600)'}}>Create New User</h3>
          <p style={{fontSize:'0.8rem',color:'var(--text-muted)',marginBottom:20}}>
            This is the only way to create admin accounts. Students can self-register from the login page.
          </p>
          <form onSubmit={createUser}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
              <div className="field">
                <label>Full Name</label>
                <input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="John Smith" required />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="john@example.com" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Min 6 characters" required />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                  <option value="student">🎓 Student</option>
                  <option value="admin">🛡 Admin</option>
                </select>
              </div>
            </div>
            {formError && (
              <div className="auth-error" style={{marginBottom:12}}>{formError}</div>
            )}
            <div style={{display:'flex',gap:10}}>
              <button type="submit" className="btn-sm-primary" disabled={saving}>
                {saving ? 'Creating…' : `Create ${form.role === 'admin' ? 'Admin' : 'Student'}`}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid" style={{marginBottom:24}}>
        <div className="stat-card blue">
          <div className="stat-icon">👥</div>
          <div className="stat-val">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">🎓</div>
          <div className="stat-val">{students.length}</div>
          <div className="stat-label">Students</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">🛡</div>
          <div className="stat-val">{admins.length}</div>
          <div className="stat-label">Admins</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">✅</div>
          <div className="stat-val">{active.length}</div>
          <div className="stat-label">Active</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['all','student','admin'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 18px', borderRadius:'99px', border:'1.5px solid',
            borderColor: filter===f ? 'var(--blue-400)' : 'var(--border)',
            background: filter===f ? 'var(--blue-400)' : '#fff',
            color: filter===f ? '#fff' : 'var(--text-secondary)',
            fontSize:'0.8rem', fontWeight:600, cursor:'pointer', fontFamily:'var(--font-body)',
          }}>
            {f === 'all' ? 'All Users' : f === 'student' ? '🎓 Students' : '🛡 Admins'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg-page)',borderBottom:'1px solid var(--border)'}}>
              {['#','Name','Email','Role','Status','Joined',''].map(h => (
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{padding:32,textAlign:'center',color:'var(--text-muted)'}}>No users found</td></tr>
            )}
            {filtered.map((u, i) => (
              <tr key={u.id} style={{borderBottom:'1px solid var(--border)'}}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-page)'}
                onMouseLeave={e => e.currentTarget.style.background=''}
              >
                <td style={{padding:'12px 16px',fontSize:'0.8rem',color:'var(--text-muted)'}}>{i+1}</td>
                <td style={{padding:'12px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:32,height:32,borderRadius:8,background:'var(--blue-400)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'0.8rem',flexShrink:0}}>
                      {u.full_name?.[0]?.toUpperCase()}
                    </div>
                    <span style={{fontSize:'0.875rem',fontWeight:600}}>{u.full_name}</span>
                  </div>
                </td>
                <td style={{padding:'12px 16px',fontSize:'0.875rem',color:'var(--text-secondary)'}}>{u.email}</td>
                <td style={{padding:'12px 16px'}}>
                  <span style={{
                    padding:'3px 10px', borderRadius:'99px', fontSize:'0.75rem', fontWeight:700,
                    background: u.role==='admin' ? '#ede9fe' : 'var(--blue-50)',
                    color: u.role==='admin' ? '#5b21b6' : 'var(--blue-500)',
                  }}>{u.role === 'admin' ? '🛡 Admin' : '🎓 Student'}</span>
                </td>
                <td style={{padding:'12px 16px'}}>
                  <span style={{
                    padding:'3px 10px', borderRadius:'99px', fontSize:'0.75rem', fontWeight:700,
                    background: u.is_active ? '#d1fae5' : '#fee2e2',
                    color: u.is_active ? '#065f46' : '#991b1b',
                  }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td style={{padding:'12px 16px',fontSize:'0.8rem',color:'var(--text-muted)'}}>
                  {new Date(u.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </td>
                <td style={{padding:'12px 16px'}}>
                  {u.is_active && u.role !== 'admin' && (
                    <button className="btn-sm-danger" onClick={() => deactivate(u.id)}>Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

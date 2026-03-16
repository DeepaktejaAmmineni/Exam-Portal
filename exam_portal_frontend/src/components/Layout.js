import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const studentNav = [
  { to: '/dashboard',  icon: '⊞', label: 'Dashboard' },
  { to: '/exams',      icon: '📋', label: 'Available Exams' },
  { to: '/my-results', icon: '📊', label: 'My Results' },
];

const adminNav = [
  { to: '/admin',          icon: '⊞', label: 'Overview' },
  { to: '/admin/exams',    icon: '📋', label: 'Manage Exams' },
  { to: '/admin/results',  icon: '📊', label: 'All Results' },
  { to: '/admin/users',    icon: '👥', label: 'Users' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const nav = user?.role === 'admin' ? adminNav : studentNav;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">EP</div>
          {!collapsed && <span className="sidebar-brand">ExamPortal</span>}
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <div className="sidebar-role-badge">
          {!collapsed && <span>{user?.role === 'admin' ? '🛡 Admin' : '🎓 Student'}</span>}
        </div>

        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to} end className={({isActive}) => `nav-item ${isActive?'active':''}`}>
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">{user?.full_name?.[0]?.toUpperCase()}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.full_name}</div>
                <div className="sidebar-user-email">{user?.email}</div>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <span>⎋</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">
              {nav.find(n => window.location.pathname.startsWith(n.to))?.label || 'ExamPortal'}
            </h2>
          </div>
          <div className="topbar-right">
            <div className="topbar-avatar">{user?.full_name?.[0]?.toUpperCase()}</div>
            <span className="topbar-name">{user?.full_name}</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

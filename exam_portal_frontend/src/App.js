import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import AuthPage        from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import ExamList        from './pages/ExamList';
import ExamEngine      from './pages/ExamEngine';
import MyResults       from './pages/MyResults';
import AdminDashboard  from './pages/AdminDashboard';
import AdminExams      from './pages/AdminExams';
import AdminResults    from './pages/AdminResults';
import AdminUsers      from './pages/AdminUsers';

// ── Guards ────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireStudent({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'student') return <Navigate to="/admin" replace />;
  return children;
}

// ── Root redirect ─────────────────────────────────────────────
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<AuthPage />} />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Student routes */}
          <Route path="/dashboard" element={
            <RequireStudent><Layout><StudentDashboard /></Layout></RequireStudent>
          } />
          <Route path="/exams" element={
            <RequireStudent><Layout><ExamList /></Layout></RequireStudent>
          } />
          <Route path="/exam/:sessionId" element={
            <RequireStudent><Layout><ExamEngine /></Layout></RequireStudent>
          } />
          <Route path="/my-results" element={
            <RequireStudent><Layout><MyResults /></Layout></RequireStudent>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <RequireAdmin><Layout><AdminDashboard /></Layout></RequireAdmin>
          } />
          <Route path="/admin/exams" element={
            <RequireAdmin><Layout><AdminExams /></Layout></RequireAdmin>
          } />
          <Route path="/admin/results" element={
            <RequireAdmin><Layout><AdminResults /></Layout></RequireAdmin>
          } />
          <Route path="/admin/users" element={
            <RequireAdmin><Layout><AdminUsers /></Layout></RequireAdmin>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

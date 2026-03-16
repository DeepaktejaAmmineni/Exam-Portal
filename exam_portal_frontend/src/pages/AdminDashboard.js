import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import './Dashboard.css';

export default function AdminDashboard() {
  const [exams,   setExams]   = useState([]);
  const [results, setResults] = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      API.get('/api/exams/'),
      API.get('/api/results/admin/all'),
      API.get('/api/users/'),
    ]).then(([e, r, u]) => {
      setExams(e.data); setResults(r.data); setUsers(u.data);
    }).finally(() => setLoading(false));
  }, []);

  const students = users.filter(u => u.role === 'student');
  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
    : 0;
  const passRate = results.length
    ? Math.round((results.filter(r => r.passed).length / results.length) * 100)
    : 0;

  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;

  return (
    <div className="dashboard">
      <div className="dash-welcome">
        <div>
          <h1>Admin Overview</h1>
          <p>Portal analytics at a glance</p>
        </div>
        <button className="btn-sm-primary" onClick={() => navigate('/admin/exams')}>+ New Exam</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📋</div>
          <div className="stat-val">{exams.length}</div>
          <div className="stat-label">Total Exams</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">🎓</div>
          <div className="stat-val">{students.length}</div>
          <div className="stat-label">Students</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">📊</div>
          <div className="stat-val">{results.length}</div>
          <div className="stat-label">Submissions</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">✅</div>
          <div className="stat-val">{passRate}%</div>
          <div className="stat-label">Pass Rate</div>
        </div>
      </div>

      <div className="dash-columns">
        <div className="dash-section">
          <div className="section-header">
            <h3>Recent Exams</h3>
            <button className="link-btn" onClick={() => navigate('/admin/exams')}>Manage →</button>
          </div>
          {exams.length === 0
            ? <div className="empty-state">No exams yet. <button className="link-btn" onClick={() => navigate('/admin/exams')}>Create one!</button></div>
            : exams.slice(0,5).map(exam => (
              <div className="exam-row" key={exam.id}>
                <div className="exam-row-info">
                  <div className="exam-row-title">{exam.title}</div>
                  <div className="exam-row-meta">
                    <span>⏱ {exam.duration_min} min</span>
                    <span>🎯 {exam.total_marks} marks</span>
                    <span className={exam.is_active ? 'text-green' : 'text-muted'}>{exam.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <button className="btn-sm-primary" onClick={() => navigate('/admin/exams')}>Edit</button>
              </div>
          ))}
        </div>

        <div className="dash-section">
          <div className="section-header">
            <h3>Recent Submissions</h3>
            <button className="link-btn" onClick={() => navigate('/admin/results')}>View all →</button>
          </div>
          {results.length === 0
            ? <div className="empty-state">No submissions yet.</div>
            : results.slice(0,5).map(r => (
              <div className="result-row" key={r.id}>
                <div className="result-row-info">
                  <div className="result-row-title">Student #{r.student_id} — Exam #{r.exam_id}</div>
                  <div className="result-row-meta">{r.scored_marks}/{r.total_marks} marks</div>
                </div>
                <span className={`score-badge ${r.passed?'pass':'fail'}`}>{Math.round(r.percentage)}%</span>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}

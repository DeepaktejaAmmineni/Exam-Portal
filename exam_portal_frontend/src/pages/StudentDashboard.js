import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import './Dashboard.css';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams,   setExams]   = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/api/exams/'),
      API.get('/api/results/my'),
    ]).then(([e, r]) => {
      setExams(e.data);
      setResults(r.data);
    }).finally(() => setLoading(false));
  }, []);

  const attempted = results.map(r => r.exam_id);
  const available = exams.filter(e => !attempted.includes(e.id));
  const avgScore  = results.length
    ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
    : 0;

  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;

  return (
    <div className="dashboard">
      <div className="dash-welcome">
        <div>
          <h1>Hello, {user?.full_name?.split(' ')[0]} 👋</h1>
          <p>Ready to take on a challenge today?</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card blue">
          <div className="stat-icon">📋</div>
          <div className="stat-val">{exams.length}</div>
          <div className="stat-label">Total Exams</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-val">{results.length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">⏳</div>
          <div className="stat-val">{available.length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">🏆</div>
          <div className="stat-val">{avgScore}%</div>
          <div className="stat-label">Avg Score</div>
        </div>
      </div>

      <div className="dash-columns">
        {/* Available exams */}
        <div className="dash-section">
          <div className="section-header">
            <h3>Available Exams</h3>
            <button className="link-btn" onClick={() => navigate('/exams')}>View all →</button>
          </div>
          {available.length === 0
            ? <div className="empty-state">🎉 You've completed all available exams!</div>
            : available.slice(0,4).map(exam => (
              <div className="exam-row" key={exam.id}>
                <div className="exam-row-info">
                  <div className="exam-row-title">{exam.title}</div>
                  <div className="exam-row-meta">
                    <span>⏱ {exam.duration_min} min</span>
                    <span>🎯 {exam.total_marks} marks</span>
                  </div>
                </div>
                <button className="btn-sm-primary" onClick={() => navigate('/exams')}>Start</button>
              </div>
          ))}
        </div>

        {/* Recent results */}
        <div className="dash-section">
          <div className="section-header">
            <h3>Recent Results</h3>
            <button className="link-btn" onClick={() => navigate('/my-results')}>View all →</button>
          </div>
          {results.length === 0
            ? <div className="empty-state">No results yet. Take an exam!</div>
            : results.slice(0,4).map(r => (
              <div className="result-row" key={r.id}>
                <div className="result-row-info">
                  <div className="result-row-title">Exam #{r.exam_id}</div>
                  <div className="result-row-meta">{r.scored_marks}/{r.total_marks} marks</div>
                </div>
                <div className={`score-badge ${r.passed ? 'pass' : 'fail'}`}>
                  {Math.round(r.percentage)}%
                </div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}

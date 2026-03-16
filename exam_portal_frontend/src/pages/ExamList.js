import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import './ExamList.css';

export default function ExamList() {
  const [exams,   setExams]   = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([API.get('/api/exams/'), API.get('/api/results/my')])
      .then(([e, r]) => { setExams(e.data); setResults(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const attempted = results.map(r => r.exam_id);

  const startExam = async (examId) => {
    try {
      const res = await API.post(`/api/sessions/start/${examId}`);
      navigate(`/exam/${res.data.id}`, { state: { session: res.data } });
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not start exam');
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;

  return (
    <div className="exam-list-page">
      <div className="page-header">
        <h1>Available Exams</h1>
        <p>{exams.length} exam{exams.length !== 1 ? 's' : ''} available</p>
      </div>

      <div className="exam-grid">
        {exams.map(exam => {
          const done = attempted.includes(exam.id);
          const result = results.find(r => r.exam_id === exam.id);
          return (
            <div className={`exam-card ${done ? 'done' : ''}`} key={exam.id}>
              <div className="exam-card-top">
                <div className="exam-card-icon">📋</div>
                {done && <span className="done-badge">Completed</span>}
              </div>
              <h3 className="exam-card-title">{exam.title}</h3>
              {exam.description && <p className="exam-card-desc">{exam.description}</p>}
              <div className="exam-card-meta">
                <div className="meta-pill">⏱ {exam.duration_min} min</div>
                <div className="meta-pill">🎯 {exam.total_marks} marks</div>
              </div>
              {done && result ? (
                <div className="exam-card-result">
                  <span className={`score-badge ${result.passed ? 'pass' : 'fail'}`}>
                    {Math.round(result.percentage)}% — {result.passed ? 'Passed' : 'Failed'}
                  </span>
                  <button className="btn-secondary" onClick={() => navigate('/my-results')}>
                    View Result
                  </button>
                </div>
              ) : (
                <button className="btn-primary exam-start-btn" onClick={() => startExam(exam.id)}>
                  Start Exam →
                </button>
              )}
            </div>
          );
        })}
        {exams.length === 0 && (
          <div className="empty-state" style={{gridColumn:'1/-1'}}>
            No exams available right now. Check back later!
          </div>
        )}
      </div>
    </div>
  );
}

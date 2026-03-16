import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';

export default function MyResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/api/results/my').then(r => setResults(r.data)).finally(() => setLoading(false));
  }, []);

  const viewDetail = async (id) => {
    const res = await API.get(`/api/results/${id}`);
    setDetail(res.data);
  };

  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;

  if (detail) return (
    <div style={{maxWidth:800}}>
      <button className="btn-secondary" style={{marginBottom:20}} onClick={() => setDetail(null)}>← Back to Results</button>
      <div className="card" style={{marginBottom:16}}>
        <h2 style={{marginBottom:8}}>Result Detail</h2>
        <div style={{display:'flex',gap:24,flexWrap:'wrap',marginTop:12}}>
          {[
            ['Score', `${detail.scored_marks}/${detail.total_marks}`],
            ['Percentage', `${Math.round(detail.percentage)}%`],
            ['Status', detail.passed ? '✅ Passed' : '❌ Failed'],
          ].map(([l,v]) => (
            <div key={l} style={{textAlign:'center',background:'var(--bg-page)',padding:'14px 24px',borderRadius:'var(--radius-md)'}}>
              <div style={{fontSize:'1.4rem',fontWeight:800,fontFamily:'var(--font-display)',color:'var(--blue-500)'}}>{v}</div>
              <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 style={{marginBottom:16}}>Answer Breakdown</h3>
        {detail.answers.map((a, i) => (
          <div key={i} style={{padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Q{i+1} • {a.marks} mark{a.marks!==1?'s':''}</span>
              <span style={{fontSize:'0.8rem',fontWeight:700,color:a.is_correct?'var(--success)':'var(--danger)'}}>
                {a.is_correct ? '✓ Correct' : '✗ Wrong'}
              </span>
            </div>
            <div style={{fontSize:'0.9rem',fontWeight:500,marginBottom:8}}>{a.question_text}</div>
            <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>
              Your answer: <strong style={{color:a.is_correct?'var(--success)':'var(--danger)'}}>{a.selected_option || 'Not answered'}</strong>
              {!a.is_correct && <> &nbsp;|&nbsp; Correct: <strong style={{color:'var(--success)'}}>{a.correct_option}</strong></>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:900}}>
      <div className="page-header">
        <h1>My Results</h1>
        <p>{results.length} exam{results.length!==1?'s':''} completed</p>
      </div>
      {results.length === 0
        ? <div className="empty-state">No results yet. <button className="link-btn" onClick={() => navigate('/exams')}>Take an exam!</button></div>
        : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {results.map(r => (
            <div key={r.id} className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
              <div>
                <div style={{fontWeight:700,marginBottom:4}}>Exam #{r.exam_id}</div>
                <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>
                  {new Date(r.calculated_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'1.25rem',fontWeight:800,color:'var(--blue-500)'}}>
                    {r.scored_marks}/{r.total_marks}
                  </div>
                  <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>Marks</div>
                </div>
                <span className={`score-badge ${r.passed?'pass':'fail'}`}>{Math.round(r.percentage)}%</span>
                <button className="btn-sm-primary" onClick={() => viewDetail(r.id)}>Details</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

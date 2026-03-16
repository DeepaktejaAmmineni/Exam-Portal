import React, { useEffect, useState } from 'react';
import API from '../utils/api';

export default function AdminResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail,  setDetail]  = useState(null);
  const [filter,  setFilter]  = useState('all'); // all | pass | fail

  useEffect(() => {
    API.get('/api/results/admin/all').then(r => setResults(r.data)).finally(() => setLoading(false));
  }, []);

  const viewDetail = async (id) => {
    const res = await API.get(`/api/results/${id}`);
    setDetail(res.data);
  };

  const filtered = filter === 'all' ? results
    : filter === 'pass' ? results.filter(r => r.passed)
    : results.filter(r => !r.passed);

  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
    : 0;
  const passCount = results.filter(r => r.passed).length;

  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;

  if (detail) return (
    <div style={{maxWidth:800}}>
      <button className="btn-secondary" style={{marginBottom:20}} onClick={() => setDetail(null)}>← Back to Results</button>
      <div className="card" style={{marginBottom:16}}>
        <h2 style={{marginBottom:16}}>Result Detail — Student #{detail.student_id}</h2>
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          {[
            ['Exam', `#${detail.exam_id}`],
            ['Score', `${detail.scored_marks}/${detail.total_marks}`],
            ['Percentage', `${Math.round(detail.percentage)}%`],
            ['Status', detail.passed ? '✅ Passed' : '❌ Failed'],
          ].map(([l,v]) => (
            <div key={l} style={{textAlign:'center',background:'var(--bg-page)',padding:'14px 20px',borderRadius:'var(--radius-md)',minWidth:100}}>
              <div style={{fontSize:'1.25rem',fontWeight:800,fontFamily:'var(--font-display)',color:'var(--blue-500)'}}>{v}</div>
              <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 style={{marginBottom:16}}>Per-Question Breakdown</h3>
        {detail.answers.map((a, i) => (
          <div key={i} style={{padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>Q{i+1} · {a.marks} mark{a.marks!==1?'s':''}</span>
              <span style={{fontSize:'0.8rem',fontWeight:700,color:a.is_correct?'var(--success)':'var(--danger)'}}>
                {a.is_correct ? '✓ Correct' : '✗ Wrong'}
              </span>
            </div>
            <div style={{fontSize:'0.9rem',fontWeight:500,marginBottom:6,color:'var(--text-primary)'}}>{a.question_text}</div>
            <div style={{fontSize:'0.8rem',color:'var(--text-secondary)'}}>
              Answer: <strong style={{color:a.is_correct?'var(--success)':'var(--danger)'}}>{a.selected_option || 'Not answered'}</strong>
              {!a.is_correct && <> &nbsp;·&nbsp; Correct: <strong style={{color:'var(--success)'}}>{a.correct_option}</strong></>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:1000}}>
      <div className="page-header">
        <h1>All Results</h1>
        <p>{results.length} total submissions</p>
      </div>

      {/* Summary cards */}
      <div className="stat-grid" style={{marginBottom:24}}>
        <div className="stat-card blue">
          <div className="stat-icon">📊</div>
          <div className="stat-val">{results.length}</div>
          <div className="stat-label">Total Submissions</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-val">{passCount}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">❌</div>
          <div className="stat-val">{results.length - passCount}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">🏆</div>
          <div className="stat-val">{avgScore}%</div>
          <div className="stat-label">Avg Score</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['all','pass','fail'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding:'7px 18px',
              borderRadius:'99px',
              border:'1.5px solid',
              borderColor: filter===f ? 'var(--blue-400)' : 'var(--border)',
              background: filter===f ? 'var(--blue-400)' : '#fff',
              color: filter===f ? '#fff' : 'var(--text-secondary)',
              fontSize:'0.8rem',
              fontWeight:600,
              cursor:'pointer',
              fontFamily:'var(--font-body)',
              textTransform:'capitalize',
            }}
          >{f === 'all' ? 'All' : f === 'pass' ? '✅ Passed' : '❌ Failed'}</button>
        ))}
      </div>

      {/* Results table */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bg-page)',borderBottom:'1px solid var(--border)'}}>
              {['#','Student','Exam','Score','Percentage','Status','Date',''].map(h => (
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{padding:32,textAlign:'center',color:'var(--text-muted)'}}>No results found</td></tr>
            )}
            {filtered.map((r, i) => (
              <tr key={r.id} style={{borderBottom:'1px solid var(--border)',transition:'background 0.15s'}}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-page)'}
                onMouseLeave={e => e.currentTarget.style.background=''}
              >
                <td style={{padding:'12px 16px',fontSize:'0.8rem',color:'var(--text-muted)'}}>{i+1}</td>
                <td style={{padding:'12px 16px',fontSize:'0.875rem',fontWeight:600}}>Student #{r.student_id}</td>
                <td style={{padding:'12px 16px',fontSize:'0.875rem',color:'var(--text-secondary)'}}>Exam #{r.exam_id}</td>
                <td style={{padding:'12px 16px',fontSize:'0.875rem',fontWeight:600}}>{r.scored_marks}/{r.total_marks}</td>
                <td style={{padding:'12px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{flex:1,height:6,background:'var(--bg-page)',borderRadius:99,overflow:'hidden',maxWidth:80}}>
                      <div style={{height:'100%',width:`${r.percentage}%`,background:r.passed?'var(--success)':'var(--danger)',borderRadius:99}} />
                    </div>
                    <span style={{fontSize:'0.8rem',fontWeight:700}}>{Math.round(r.percentage)}%</span>
                  </div>
                </td>
                <td style={{padding:'12px 16px'}}>
                  <span className={`score-badge ${r.passed?'pass':'fail'}`}>{r.passed?'Pass':'Fail'}</span>
                </td>
                <td style={{padding:'12px 16px',fontSize:'0.8rem',color:'var(--text-muted)'}}>
                  {new Date(r.calculated_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </td>
                <td style={{padding:'12px 16px'}}>
                  <button className="btn-sm-primary" onClick={() => viewDetail(r.id)}>Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

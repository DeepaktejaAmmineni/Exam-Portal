import React, { useEffect, useState } from 'react';
import API from '../utils/api';
import './AdminExams.css';

const emptyExam = { title: '', description: '', duration_min: 60 };
const emptyQ    = { question_text: '', marks: 1, difficulty: 'medium', options: [
  {option_label:'A', option_text:''},
  {option_label:'B', option_text:''},
  {option_label:'C', option_text:''},
  {option_label:'D', option_text:''},
], correct_option_label: 'A' };

export default function AdminExams() {
  const [exams,      setExams]      = useState([]);
  const [selected,   setSelected]   = useState(null); // exam being viewed
  const [questions,  setQuestions]  = useState([]);
  const [showExamForm, setShowExamForm] = useState(false);
  const [showQForm,    setShowQForm]    = useState(false);
  const [examForm,   setExamForm]   = useState(emptyExam);
  const [qForm,      setQForm]      = useState(emptyQ);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { loadExams(); }, []);

  const loadExams = () => {
    API.get('/api/exams/').then(r => setExams(r.data)).finally(() => setLoading(false));
  };

  const loadQuestions = (exam) => {
    setSelected(exam);
    API.get(`/api/exams/${exam.id}/questions/`).then(r => setQuestions(r.data));
  };

  const createExam = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await API.post('/api/exams/', examForm);
      loadExams(); setShowExamForm(false); setExamForm(emptyExam);
    } catch(err) { alert(err.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const deleteExam = async (id) => {
    if (!window.confirm('Delete this exam and all its questions?')) return;
    await API.delete(`/api/exams/${id}`);
    loadExams();
    if (selected?.id === id) setSelected(null);
  };

  const toggleActive = async (exam) => {
    await API.put(`/api/exams/${exam.id}`, { is_active: !exam.is_active });
    loadExams();
    if (selected?.id === exam.id) setSelected({ ...exam, is_active: !exam.is_active });
  };

  const addQuestion = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await API.post(`/api/exams/${selected.id}/questions/`, {
        ...qForm,
        question_type: 'mcq',
        options: qForm.options.filter(o => o.option_text.trim()),
      });
      const updated = await API.get(`/api/exams/${selected.id}`);
      setSelected(updated.data);
      API.get(`/api/exams/${selected.id}/questions/`).then(r => setQuestions(r.data));
      setShowQForm(false);
      setQForm(emptyQ);
    } catch(err) { alert(err.response?.data?.detail || 'Error adding question'); }
    finally { setSaving(false); }
  };

  const deleteQuestion = async (qId) => {
    if (!window.confirm('Delete this question?')) return;
    await API.delete(`/api/exams/${selected.id}/questions/${qId}`);
    setQuestions(qs => qs.filter(q => q.id !== qId));
    const updated = await API.get(`/api/exams/${selected.id}`);
    setSelected(updated.data);
  };

  const updateOpt = (idx, val) => {
    setQForm(f => { const opts = [...f.options]; opts[idx] = { ...opts[idx], option_text: val }; return { ...f, options: opts }; });
  };

  if (loading) return <div className="page-loading"><div className="spinner-lg" /></div>;

  return (
    <div className="admin-exams">
      {/* Exam list */}
      <div className="admin-panel">
        <div className="panel-header">
          <h2>Exams</h2>
          <button className="btn-sm-primary" onClick={() => setShowExamForm(true)}>+ New Exam</button>
        </div>

        {showExamForm && (
          <form onSubmit={createExam} className="inline-form">
            <h4>Create New Exam</h4>
            <div className="field">
              <label>Title</label>
              <input value={examForm.title} onChange={e => setExamForm({...examForm, title: e.target.value})} placeholder="Python Technical Test" required />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={examForm.description} onChange={e => setExamForm({...examForm, description: e.target.value})} rows={2} placeholder="Optional description..." />
            </div>
            <div className="field">
              <label>Duration (minutes)</label>
              <input type="number" value={examForm.duration_min} onChange={e => setExamForm({...examForm, duration_min: parseInt(e.target.value)})} min={5} required />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-sm-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Exam'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowExamForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="exam-list-admin">
          {exams.length === 0 && <div className="empty-state">No exams yet. Create one!</div>}
          {exams.map(exam => (
            <div key={exam.id} className={`exam-item ${selected?.id === exam.id ? 'active' : ''}`} onClick={() => loadQuestions(exam)}>
              <div className="exam-item-info">
                <div className="exam-item-title">{exam.title}</div>
                <div className="exam-item-meta">
                  <span>⏱ {exam.duration_min}m</span>
                  <span>🎯 {exam.total_marks} marks</span>
                  <span className={exam.is_active ? 'tag-active' : 'tag-inactive'}>{exam.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="exam-item-actions" onClick={e => e.stopPropagation()}>
                <button className="icon-btn" title="Toggle active" onClick={() => toggleActive(exam)}>{exam.is_active ? '⏸' : '▶'}</button>
                <button className="icon-btn danger" title="Delete" onClick={() => deleteExam(exam.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question panel */}
      {selected && (
        <div className="admin-panel questions-panel">
          <div className="panel-header">
            <div>
              <h2>{selected.title}</h2>
              <p style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{questions.length} questions · {selected.total_marks} total marks</p>
            </div>
            <button className="btn-sm-primary" onClick={() => setShowQForm(true)}>+ Add Question</button>
          </div>

          {showQForm && (
            <form onSubmit={addQuestion} className="inline-form">
              <h4>Add MCQ Question</h4>
              <div className="field">
                <label>Question Text</label>
                <textarea value={qForm.question_text} onChange={e => setQForm({...qForm, question_text: e.target.value})} rows={3} placeholder="Which data structure uses LIFO?" required />
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Marks</label>
                  <input type="number" value={qForm.marks} onChange={e => setQForm({...qForm, marks: parseFloat(e.target.value)})} min={0.5} step={0.5} required />
                </div>
                <div className="field">
                  <label>Difficulty</label>
                  <select value={qForm.difficulty} onChange={e => setQForm({...qForm, difficulty: e.target.value})}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="field">
                  <label>Correct Answer</label>
                  <select value={qForm.correct_option_label} onChange={e => setQForm({...qForm, correct_option_label: e.target.value})}>
                    {['A','B','C','D'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="options-grid">
                {qForm.options.map((opt, i) => (
                  <div key={i} className="field">
                    <label>Option {opt.option_label}</label>
                    <input value={opt.option_text} onChange={e => updateOpt(i, e.target.value)} placeholder={`Option ${opt.option_label}`} required />
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-sm-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Question'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowQForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="question-list-admin">
            {questions.length === 0 && <div className="empty-state">No questions yet. Add some!</div>}
            {questions.map((q, idx) => (
              <div key={q.id} className="question-item">
                <div className="qi-header">
                  <span className="qi-num">Q{idx + 1}</span>
                  <span className={`q-diff ${q.difficulty}`}>{q.difficulty}</span>
                  <span className="q-marks">{q.marks}m</span>
                  <button className="icon-btn danger" style={{marginLeft:'auto'}} onClick={() => deleteQuestion(q.id)}>🗑</button>
                </div>
                <div className="qi-text">{q.question_text}</div>
                <div className="qi-options">
                  {q.options.map(opt => (
                    <span key={opt.id} className={`qi-opt ${opt.id === q.correct_option_id ? 'correct' : ''}`}>
                      <strong>{opt.option_label}.</strong> {opt.option_text}
                      {opt.id === q.correct_option_id && ' ✓'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

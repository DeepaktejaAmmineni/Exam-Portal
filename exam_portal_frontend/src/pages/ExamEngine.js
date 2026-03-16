import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import './ExamEngine.css';

const MAX_TAB_SWITCHES = 3;
const MAX_REFRESHES    = 5;

export default function ExamEngine() {
  const { sessionId }  = useParams();
  const { state }      = useLocation();
  const navigate       = useNavigate();

  const [session,      setSession]      = useState(state?.session || null);
  const [questions,    setQuestions]    = useState(state?.session?.questions || []);
  const [current,      setCurrent]      = useState(0);
  const [answers,      setAnswers]      = useState({});
  const [timeLeft,     setTimeLeft]     = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [result,       setResult]       = useState(null);

  // ── Security state ──────────────────────────────────────────
  const [tabSwitches,  setTabSwitches]  = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);
  const [warnings,     setWarnings]     = useState([]);
  const [showWarning,  setShowWarning]  = useState(false);
  const [warningMsg,   setWarningMsg]   = useState('');
  const [securityLog,  setSecurityLog]  = useState([]);

  const timerRef       = useRef(null);
  const tabSwitchRef   = useRef(0);
  const submittedRef   = useRef(false);

  // ── Load session ─────────────────────────────────────────────
  useEffect(() => {
    if (!session) {
      API.get(`/api/sessions/${sessionId}`).then(r => {
        setSession(r.data);
        setQuestions(r.data.questions || []);
      });
    }
  }, [sessionId, session]);

  // ── Restore refresh count from sessionStorage ─────────────────
  useEffect(() => {
    const key = `refresh_${sessionId}`;
    const stored = parseInt(sessionStorage.getItem(key) || '0');
    // increment on every mount (which happens on every refresh)
    const newCount = stored + 1;
    sessionStorage.setItem(key, newCount);
    setRefreshCount(newCount);

    if (newCount > 1) {
      const msg = `Page refresh detected (#${newCount - 1}). ${MAX_REFRESHES - (newCount - 1)} refreshes remaining before auto-submit.`;
      addSecurityEvent('🔄 Page Refreshed', msg);
      if (newCount - 1 >= MAX_REFRESHES) {
        triggerAutoSubmit('Too many page refreshes');
      } else {
        triggerWarning(`⚠️ Page Refresh Detected (${newCount - 1}/${MAX_REFRESHES})\n\nRefreshing the page is not allowed during the exam. Your exam will be auto-submitted after ${MAX_REFRESHES} refreshes.`);
      }
    }
  }, [sessionId]);

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const startedAt  = new Date(session.started_at).getTime();
    const durationMs = (session.exam?.duration_min || 60) * 60 * 1000;
    const endTime    = startedAt + durationMs;

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current);
        triggerAutoSubmit('Time is up');
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [session]);

  // ── Tab visibility detection ──────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !submittedRef.current) {
        tabSwitchRef.current += 1;
        const count = tabSwitchRef.current;
        setTabSwitches(count);

        const remaining = MAX_TAB_SWITCHES - count;
        const msg = remaining > 0
          ? `Tab switch #${count} detected. ${remaining} more will auto-submit your exam.`
          : 'Maximum tab switches reached. Exam auto-submitted.';

        addSecurityEvent('👁 Tab Switch', msg);

        if (count >= MAX_TAB_SWITCHES) {
          triggerAutoSubmit('Too many tab switches');
        } else {
          triggerWarning(`⚠️ Tab Switch Detected (${count}/${MAX_TAB_SWITCHES})\n\nSwitching tabs during the exam is not allowed.\n\n${remaining} more violation${remaining !== 1 ? 's' : ''} will auto-submit your exam.`);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ── Disable right click ───────────────────────────────────────
  useEffect(() => {
    const prevent = (e) => { e.preventDefault(); return false; };
    document.addEventListener('contextmenu', prevent);
    return () => document.removeEventListener('contextmenu', prevent);
  }, []);

  // ── Disable copy/paste/cut ────────────────────────────────────
  useEffect(() => {
    const prevent = (e) => { e.preventDefault(); };
    document.addEventListener('copy',  prevent);
    document.addEventListener('paste', prevent);
    document.addEventListener('cut',   prevent);
    return () => {
      document.removeEventListener('copy',  prevent);
      document.removeEventListener('paste', prevent);
      document.removeEventListener('cut',   prevent);
    };
  }, []);

  // ── Detect keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      // Block: Ctrl+C, Ctrl+V, Ctrl+U (view source), F12 (devtools), Ctrl+Shift+I
      if (
        (e.ctrlKey && ['c','v','u','a'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i','j','c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        addSecurityEvent('⌨️ Blocked Shortcut', `Shortcut ${e.ctrlKey?'Ctrl+':''}${e.shiftKey?'Shift+':''}${e.key} was blocked`);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // ── Fullscreen enforcement ────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        addSecurityEvent('🖥 Exited Fullscreen', 'Student exited fullscreen mode');
        triggerWarning('⚠️ Fullscreen Required\n\nPlease stay in fullscreen mode during the exam.\n\nClick OK to re-enter fullscreen.');
        // re-enter fullscreen
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Request fullscreen on exam start
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────

  const addSecurityEvent = (type, message) => {
    const event = { type, message, time: new Date().toLocaleTimeString() };
    setSecurityLog(prev => [...prev, event]);
    setWarnings(prev => [...prev, event]);
  };

  const triggerWarning = (msg) => {
    setWarningMsg(msg);
    setShowWarning(true);
  };

  const triggerAutoSubmit = useCallback((reason) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    addSecurityEvent('🚨 Auto Submit', `Exam auto-submitted: ${reason}`);
    // exit fullscreen before submitting
    document.exitFullscreen?.().catch(() => {});
    API.post(`/api/sessions/${sessionId}/submit`)
      .then(res => { setResult(res.data); setSubmitted(true); })
      .catch(() => { setSubmitted(true); });
  }, [sessionId]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting || submitted || submittedRef.current) return;
    if (!auto && !window.confirm('Are you sure you want to submit the exam?')) return;
    submittedRef.current = true;
    setSubmitting(true);
    clearInterval(timerRef.current);
    document.exitFullscreen?.().catch(() => {});
    // Clear session storage on manual submit
    sessionStorage.removeItem(`refresh_${sessionId}`);
    try {
      const res = await API.post(`/api/sessions/${sessionId}/submit`);
      setResult(res.data);
      setSubmitted(true);
    } catch (e) {
      alert('Submission failed: ' + (e.response?.data?.detail || 'Try again'));
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, submitting, submitted]);

  const selectOption = async (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    try {
      await API.post(`/api/sessions/${sessionId}/answer`, {
        question_id: questionId,
        selected_option_id: optionId,
      });
    } catch (e) {}
  };

  const formatTime = (secs) => {
    if (secs === null) return '--:--';
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const answered    = Object.keys(answers).length;
  const total       = questions.length;
  const timerWarn   = timeLeft !== null && timeLeft < 300;
  const timerDanger = timeLeft !== null && timeLeft < 60;

  // ── Result screen ─────────────────────────────────────────────
  if (submitted && result) {
    sessionStorage.removeItem(`refresh_${sessionId}`);
    return (
      <div className="result-screen">
        <div className="result-card">
          <div className={`result-icon ${result.passed ? 'pass' : 'fail'}`}>
            {result.passed ? '🏆' : '📘'}
          </div>
          <h1>{result.passed ? 'Congratulations!' : 'Better Luck Next Time'}</h1>
          <p className="result-sub">Your exam has been submitted successfully</p>
          <div className="result-score-ring">
            <div className="ring-val">{Math.round(result.percentage)}%</div>
            <div className="ring-label">Score</div>
          </div>
          <div className="result-stats">
            <div className="rs"><div className="rs-val">{result.scored_marks}</div><div className="rs-label">Marks Scored</div></div>
            <div className="rs"><div className="rs-val">{result.total_marks}</div><div className="rs-label">Total Marks</div></div>
            <div className="rs">
              <div className={`rs-val ${result.passed ? 'green' : 'red'}`}>{result.passed ? 'PASS' : 'FAIL'}</div>
              <div className="rs-label">Status</div>
            </div>
          </div>
          {securityLog.length > 0 && (
            <div className="security-summary">
              <div className="sec-sum-title">⚠️ Security Violations ({securityLog.length})</div>
              {securityLog.map((e, i) => (
                <div key={i} className="sec-sum-item">{e.time} — {e.type}: {e.message}</div>
              ))}
            </div>
          )}
          <div className="result-actions">
            <button className="btn-primary" onClick={() => navigate('/my-results')}>View All Results</button>
            <button className="btn-secondary" onClick={() => navigate('/exams')}>Back to Exams</button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return <div className="page-loading"><div className="spinner-lg" /><p style={{marginTop:16,color:'var(--text-muted)'}}>Submitting exam…</p></div>;
  }

  if (!session || questions.length === 0) {
    return <div className="page-loading"><div className="spinner-lg" /></div>;
  }

  const q = questions[current];

  return (
    <div className="exam-engine" onContextMenu={e => e.preventDefault()}>

      {/* ── Warning Modal ── */}
      {showWarning && (
        <div className="warning-overlay">
          <div className="warning-modal">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">{warningMsg}</div>
            <button className="btn-primary" style={{marginTop:16}} onClick={() => setShowWarning(false)}>
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* ── Security bar ── */}
      {(tabSwitches > 0 || refreshCount > 1) && (
        <div className="security-bar">
          {tabSwitches > 0 && (
            <span className={tabSwitches >= MAX_TAB_SWITCHES - 1 ? 'sec-danger' : 'sec-warn'}>
              👁 Tab Switches: {tabSwitches}/{MAX_TAB_SWITCHES}
            </span>
          )}
          {refreshCount > 1 && (
            <span className={refreshCount - 1 >= MAX_REFRESHES - 1 ? 'sec-danger' : 'sec-warn'}>
              🔄 Refreshes: {refreshCount - 1}/{MAX_REFRESHES}
            </span>
          )}
          <span className="sec-info">Right-click & copy disabled</span>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="exam-topbar">
        <div className="exam-topbar-left">
          <div className="exam-title-badge">📋 Exam in Progress</div>
          <div className="exam-progress-text">{answered}/{total} answered</div>
        </div>
        <div className={`exam-timer ${timerWarn ? 'warn' : ''} ${timerDanger ? 'danger' : ''}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
        <button className="exam-submit-btn" onClick={() => handleSubmit(false)} disabled={submitting}>
          {submitting ? <span className="spinner" /> : 'Submit Exam'}
        </button>
      </div>

      <div className="exam-body">
        {/* ── Question panel ── */}
        <div className="exam-main">
          <div className="question-header">
            <span className="q-num">Question {current + 1} of {total}</span>
            <span className={`q-diff ${q.difficulty}`}>{q.difficulty}</span>
            <span className="q-marks">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
          </div>

          <div className="question-text">{q.question_text}</div>

          <div className="options-list">
            {q.options.map(opt => {
              const selected = answers[q.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  className={`option-btn ${selected ? 'selected' : ''}`}
                  onClick={() => selectOption(q.id, opt.id)}
                >
                  <span className="option-label">{opt.option_label}</span>
                  <span className="option-text">{opt.option_text}</span>
                  {selected && <span className="option-check">✓</span>}
                </button>
              );
            })}
          </div>

          <div className="exam-nav">
            <button className="btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Previous</button>
            <button className="btn-sm-primary" onClick={() => setCurrent(c => c + 1)} disabled={current === total - 1}>Next →</button>
          </div>
        </div>

        {/* ── Palette sidebar ── */}
        <div className="exam-sidebar">
          <div className="palette-title">Question Palette</div>
          <div className="palette-legend">
            <span className="pal-dot answered" /> Answered
            <span className="pal-dot unanswered" style={{marginLeft:12}} /> Not answered
          </div>
          <div className="palette-grid">
            {questions.map((qItem, idx) => (
              <button
                key={qItem.id}
                className={`pal-btn ${answers[qItem.id] ? 'answered' : ''} ${idx === current ? 'current' : ''}`}
                onClick={() => setCurrent(idx)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div className="palette-summary">
            <div><strong>{answered}</strong> answered</div>
            <div><strong>{total - answered}</strong> remaining</div>
          </div>

          {/* Security status in sidebar */}
          <div className="sec-status-box">
            <div className="sec-status-title">🔒 Proctoring Active</div>
            <div className="sec-status-item" style={{color: tabSwitches > 0 ? 'var(--danger)' : 'var(--success)'}}>
              👁 Tab switches: {tabSwitches}/{MAX_TAB_SWITCHES}
            </div>
            <div className="sec-status-item" style={{color: refreshCount > 2 ? 'var(--danger)' : refreshCount > 1 ? 'var(--warning)' : 'var(--success)'}}>
              🔄 Refreshes: {Math.max(0, refreshCount - 1)}/{MAX_REFRESHES}
            </div>
            <div className="sec-status-item" style={{color:'var(--success)'}}>
              🚫 Copy/Paste: Disabled
            </div>
          </div>

          <button
            className="btn-primary"
            style={{width:'100%', marginTop:'auto'}}
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            Submit Exam
          </button>
        </div>
      </div>
    </div>
  );
}

"""
routers/sessions.py
-------------------
This is the core "exam engine" router — used by students during an active exam.

POST /api/sessions/start/{exam_id}        → start exam, get questions + timer info
GET  /api/sessions/{session_id}           → get session status + remaining time
POST /api/sessions/{session_id}/answer    → save / update a single answer (auto-save)
POST /api/sessions/{session_id}/answers   → bulk save answers
POST /api/sessions/{session_id}/submit    → submit exam and trigger result calculation
GET  /api/sessions/my                     → list all sessions for the logged-in student
"""

from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.utils.jwt_handler import get_current_student, get_current_user

router = APIRouter(prefix="/api/sessions", tags=["Exam Sessions"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_session_or_404(session_id: int, db: Session) -> models.ExamSession:
    s = db.query(models.ExamSession).filter(models.ExamSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return s


def _remaining_seconds(session: models.ExamSession) -> int:
    elapsed = (datetime.utcnow() - session.started_at).total_seconds()
    total   = session.exam.duration_min * 60
    return max(0, int(total - elapsed))


def _calculate_and_store_result(session: models.ExamSession, db: Session) -> models.Result:
    """Score all MCQ answers and persist the result."""
    exam   = session.exam
    scored = 0.0

    answers = (
        db.query(models.StudentAnswer)
        .filter(models.StudentAnswer.session_id == session.id)
        .all()
    )

    for ans in answers:
        question = db.query(models.Question).filter(models.Question.id == ans.question_id).first()
        if question and ans.selected_option_id == question.correct_option_id:
            scored += question.marks

    total      = exam.total_marks or 1  # avoid division by zero
    percentage = round((scored / total) * 100, 2)
    passed     = percentage >= 40  # configurable pass mark

    result = models.Result(
        student_id   = session.student_id,
        exam_id      = exam.id,
        session_id   = session.id,
        total_marks  = total,
        scored_marks = scored,
        percentage   = percentage,
        passed       = passed,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


# ── Start Exam ─────────────────────────────────────────────────────────────

@router.post("/start/{exam_id}", response_model=schemas.ExamSessionResponse, status_code=201)
def start_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_student),
):
    """
    Start an exam session.
    - Prevents starting an exam already in-progress.
    - Returns shuffled questions (without correct answers).
    """
    exam = db.query(models.Exam).filter(
        models.Exam.id == exam_id,
        models.Exam.is_active == True,
    ).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found or not active")

    # Prevent duplicate sessions
    existing = db.query(models.ExamSession).filter(
        models.ExamSession.student_id == student.id,
        models.ExamSession.exam_id    == exam_id,
        models.ExamSession.status     == models.SessionStatus.in_progress,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have an active session for this exam")

    session = models.ExamSession(
        student_id = student.id,
        exam_id    = exam_id,
        status     = models.SessionStatus.in_progress,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Build response manually so we include questions (without correct_option_id)
    questions_for_student = [
        schemas.QuestionForStudent.model_validate(q) for q in exam.questions
    ]

    response = schemas.ExamSessionResponse.model_validate(session)
    response.questions = questions_for_student
    return response


# ── Get Session Status ─────────────────────────────────────────────────────

@router.get("/my", response_model=List[schemas.ExamSessionResponse])
def my_sessions(
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_student),
):
    """List all exam sessions for the current student."""
    sessions = (
        db.query(models.ExamSession)
        .filter(models.ExamSession.student_id == student.id)
        .all()
    )
    return sessions


@router.get("/{session_id}", response_model=schemas.ExamSessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = _get_session_or_404(session_id, db)

    # Students can only view their own sessions
    if current_user.role == models.UserRole.student and session.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Auto-timeout check
    if session.status == models.SessionStatus.in_progress:
        if _remaining_seconds(session) == 0:
            session.status       = models.SessionStatus.timed_out
            session.submitted_at = datetime.utcnow()
            db.commit()
            _calculate_and_store_result(session, db)

    return session


# ── Save a Single Answer (auto-save) ──────────────────────────────────────

@router.post("/{session_id}/answer", status_code=200)
def save_answer(
    session_id: int,
    answer: schemas.SubmitAnswer,
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_student),
):
    """
    Save or update the student's answer for one question.
    Called automatically every time the student selects an option.
    """
    session = _get_session_or_404(session_id, db)

    if session.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != models.SessionStatus.in_progress:
        raise HTTPException(status_code=400, detail="Exam is not in progress")
    if _remaining_seconds(session) == 0:
        raise HTTPException(status_code=400, detail="Time is up")

    # Validate option belongs to question
    option = db.query(models.Option).filter(
        models.Option.id          == answer.selected_option_id,
        models.Option.question_id == answer.question_id,
    ).first()
    if not option:
        raise HTTPException(status_code=422, detail="Invalid option for this question")

    # Upsert: update if already answered, else create
    existing = db.query(models.StudentAnswer).filter(
        models.StudentAnswer.session_id  == session_id,
        models.StudentAnswer.question_id == answer.question_id,
    ).first()

    if existing:
        existing.selected_option_id = answer.selected_option_id
        existing.answered_at        = datetime.utcnow()
    else:
        db.add(models.StudentAnswer(
            session_id         = session_id,
            question_id        = answer.question_id,
            selected_option_id = answer.selected_option_id,
        ))

    db.commit()
    return {"detail": "Answer saved"}


# ── Bulk Save Answers ──────────────────────────────────────────────────────

@router.post("/{session_id}/answers", status_code=200)
def bulk_save_answers(
    session_id: int,
    payload: schemas.BulkAnswerSubmit,
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_student),
):
    """Save multiple answers at once (useful on page navigation)."""
    session = _get_session_or_404(session_id, db)
    if session.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != models.SessionStatus.in_progress:
        raise HTTPException(status_code=400, detail="Exam is not in progress")

    for answer in payload.answers:
        existing = db.query(models.StudentAnswer).filter(
            models.StudentAnswer.session_id  == session_id,
            models.StudentAnswer.question_id == answer.question_id,
        ).first()
        if existing:
            existing.selected_option_id = answer.selected_option_id
            existing.answered_at        = datetime.utcnow()
        else:
            db.add(models.StudentAnswer(
                session_id         = session_id,
                question_id        = answer.question_id,
                selected_option_id = answer.selected_option_id,
            ))

    db.commit()
    return {"detail": f"{len(payload.answers)} answers saved"}


# ── Submit Exam ────────────────────────────────────────────────────────────

@router.post("/{session_id}/submit", response_model=schemas.ResultResponse)
def submit_exam(
    session_id: int,
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_student),
):
    """
    Manually submit the exam.
    Calculates the score immediately and returns the result.
    """
    session = _get_session_or_404(session_id, db)

    if session.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != models.SessionStatus.in_progress:
        raise HTTPException(status_code=400, detail="Exam already submitted or timed out")

    session.status       = models.SessionStatus.submitted
    session.submitted_at = datetime.utcnow()
    db.commit()

    result = _calculate_and_store_result(session, db)
    return result

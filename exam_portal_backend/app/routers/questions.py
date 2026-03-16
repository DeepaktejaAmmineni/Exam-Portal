"""
routers/questions.py
--------------------
All routes are admin-only (students receive questions via the session router).

POST   /api/exams/{exam_id}/questions/         → add question (+ options for MCQ)
GET    /api/exams/{exam_id}/questions/         → list all questions in exam
GET    /api/exams/{exam_id}/questions/{q_id}   → get one question
PUT    /api/exams/{exam_id}/questions/{q_id}   → update question
DELETE /api/exams/{exam_id}/questions/{q_id}   → delete question
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.utils.jwt_handler import get_current_admin

router = APIRouter(prefix="/api/exams/{exam_id}/questions", tags=["Questions (Admin)"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_exam_or_404(exam_id: int, db: Session) -> models.Exam:
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


def _get_question_or_404(question_id: int, exam_id: int, db: Session) -> models.Question:
    q = db.query(models.Question).filter(
        models.Question.id == question_id,
        models.Question.exam_id == exam_id,
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


def _recalculate_total_marks(exam: models.Exam, db: Session):
    exam.total_marks = sum(q.marks for q in exam.questions)
    db.commit()


# ── Create question ────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.QuestionResponse, status_code=201)
def add_question(
    exam_id: int,
    q_in: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    """
    Add a question to an exam.
    For MCQ questions supply `options` (list of {option_label, option_text})
    and `correct_option_label` (e.g. "B").
    """
    exam = _get_exam_or_404(exam_id, db)

    # Validate MCQ has options and a correct answer
    if q_in.question_type == models.QuestionType.mcq:
        if not q_in.options:
            raise HTTPException(status_code=422, detail="MCQ questions must include options")
        if not q_in.correct_option_label:
            raise HTTPException(status_code=422, detail="MCQ questions must specify correct_option_label")

    question = models.Question(
        exam_id       = exam_id,
        question_text = q_in.question_text,
        question_type = q_in.question_type,
        marks         = q_in.marks,
        difficulty    = q_in.difficulty,
    )
    db.add(question)
    db.flush()   # get question.id before adding options

    # Create options and find the correct one
    correct_option_id = None
    for opt in (q_in.options or []):
        option = models.Option(
            question_id  = question.id,
            option_label = opt.option_label,
            option_text  = opt.option_text,
        )
        db.add(option)
        db.flush()
        if opt.option_label.upper() == (q_in.correct_option_label or "").upper():
            correct_option_id = option.id

    question.correct_option_id = correct_option_id
    db.commit()
    db.refresh(question)

    _recalculate_total_marks(exam, db)
    return question


# ── List all questions ─────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.QuestionResponse])
def list_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    _get_exam_or_404(exam_id, db)
    return db.query(models.Question).filter(models.Question.exam_id == exam_id).all()


# ── Get one question ───────────────────────────────────────────────────────

@router.get("/{question_id}", response_model=schemas.QuestionResponse)
def get_question(
    exam_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    return _get_question_or_404(question_id, exam_id, db)


# ── Update question ────────────────────────────────────────────────────────

@router.put("/{question_id}", response_model=schemas.QuestionResponse)
def update_question(
    exam_id: int,
    question_id: int,
    q_in: schemas.QuestionUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    exam     = _get_exam_or_404(exam_id, db)
    question = _get_question_or_404(question_id, exam_id, db)

    if q_in.question_text is not None:
        question.question_text = q_in.question_text
    if q_in.marks is not None:
        question.marks = q_in.marks
    if q_in.difficulty is not None:
        question.difficulty = q_in.difficulty

    # Update correct option if label changed
    if q_in.correct_option_label is not None:
        matching = next(
            (o for o in question.options if o.option_label.upper() == q_in.correct_option_label.upper()),
            None,
        )
        if not matching:
            raise HTTPException(status_code=422, detail="No option with that label exists")
        question.correct_option_id = matching.id

    db.commit()
    db.refresh(question)
    _recalculate_total_marks(exam, db)
    return question


# ── Delete question ────────────────────────────────────────────────────────

@router.delete("/{question_id}", status_code=204)
def delete_question(
    exam_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    exam     = _get_exam_or_404(exam_id, db)
    question = _get_question_or_404(question_id, exam_id, db)
    db.delete(question)
    db.commit()
    _recalculate_total_marks(exam, db)

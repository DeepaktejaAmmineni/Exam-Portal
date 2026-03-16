"""
routers/results.py
------------------
GET /api/results/my                   → student sees all their own results
GET /api/results/{result_id}          → get one result (detailed breakdown)
GET /api/results/admin/all            → admin sees all results across all exams
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.utils.jwt_handler import get_current_student, get_current_admin, get_current_user

router = APIRouter(prefix="/api/results", tags=["Results"])


@router.get("/my", response_model=List[schemas.ResultResponse])
def my_results(
    db: Session = Depends(get_db),
    student: models.User = Depends(get_current_student),
):
    """Return all exam results for the currently logged-in student."""
    return (
        db.query(models.Result)
        .filter(models.Result.student_id == student.id)
        .order_by(models.Result.calculated_at.desc())
        .all()
    )


@router.get("/admin/all", response_model=List[schemas.ResultResponse])
def all_results(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    """Admin: list every result across all exams."""
    return (
        db.query(models.Result)
        .order_by(models.Result.calculated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{result_id}", response_model=schemas.DetailedResult)
def get_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return one result with a per-question breakdown.
    Students can only view their own results; admins can view any.
    """
    result = db.query(models.Result).filter(models.Result.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    if current_user.role == models.UserRole.student and result.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Build per-question breakdown
    answers = (
        db.query(models.StudentAnswer)
        .filter(models.StudentAnswer.session_id == result.session_id)
        .all()
    )

    breakdown = []
    for ans in answers:
        question = db.query(models.Question).filter(models.Question.id == ans.question_id).first()
        if not question:
            continue
        selected_option = db.query(models.Option).filter(
            models.Option.id == ans.selected_option_id
        ).first()
        correct_option = db.query(models.Option).filter(
            models.Option.id == question.correct_option_id
        ).first()

        breakdown.append({
            "question_id":    question.id,
            "question_text":  question.question_text,
            "marks":          question.marks,
            "is_correct":     ans.selected_option_id == question.correct_option_id,
            "selected_option": selected_option.option_text if selected_option else None,
            "correct_option":  correct_option.option_text  if correct_option  else None,
        })

    detailed = schemas.DetailedResult.model_validate(result)
    detailed.answers = breakdown
    return detailed

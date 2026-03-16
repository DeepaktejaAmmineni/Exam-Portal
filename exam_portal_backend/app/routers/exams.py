"""
routers/exams.py
----------------
Admin:
  POST   /api/exams/               → create exam
  PUT    /api/exams/{id}           → update exam
  DELETE /api/exams/{id}           → delete exam
  GET    /api/exams/{id}/results   → view all student results for an exam

Student + Admin:
  GET    /api/exams/               → list active exams
  GET    /api/exams/{id}           → get exam details (questions hidden for students)
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.utils.jwt_handler import get_current_user, get_current_admin

router = APIRouter(prefix="/api/exams", tags=["Exams"])


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_exam_or_404(exam_id: int, db: Session) -> models.Exam:
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam


def _recalculate_total_marks(exam: models.Exam, db: Session):
    total = sum(q.marks for q in exam.questions)
    exam.total_marks = total
    db.commit()


# ── Admin: Create ──────────────────────────────────────────────────────────

@router.post("/", response_model=schemas.ExamResponse, status_code=201)
def create_exam(
    exam_in: schemas.ExamCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Create a new exam (admin only)."""
    exam = models.Exam(
        title        = exam_in.title,
        description  = exam_in.description,
        duration_min = exam_in.duration_min,
        created_by   = admin.id,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


# ── Admin: Update ──────────────────────────────────────────────────────────

@router.put("/{exam_id}", response_model=schemas.ExamResponse)
def update_exam(
    exam_id: int,
    exam_in: schemas.ExamUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    exam = _get_exam_or_404(exam_id, db)
    for field, value in exam_in.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)
    db.commit()
    db.refresh(exam)
    return exam


# ── Admin: Delete ──────────────────────────────────────────────────────────

@router.delete("/{exam_id}", status_code=204)
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    exam = _get_exam_or_404(exam_id, db)
    db.delete(exam)
    db.commit()


# ── Shared: List exams ─────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.ExamListItem])
def list_exams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns all exams.
    Students only see active exams; admins see everything.
    """
    query = db.query(models.Exam)
    if current_user.role == models.UserRole.student:
        query = query.filter(models.Exam.is_active == True)
    return query.all()


# ── Shared: Get one exam ───────────────────────────────────────────────────

@router.get("/{exam_id}", response_model=schemas.ExamResponse)
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    exam = _get_exam_or_404(exam_id, db)
    if current_user.role == models.UserRole.student and not exam.is_active:
        raise HTTPException(status_code=403, detail="This exam is not currently active")
    return exam


# ── Admin: View all results for an exam ───────────────────────────────────

@router.get("/{exam_id}/results", response_model=List[schemas.ResultResponse])
def get_exam_results(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    _get_exam_or_404(exam_id, db)
    return db.query(models.Result).filter(models.Result.exam_id == exam_id).all()

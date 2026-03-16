"""
schemas.py
----------
Pydantic models used for request validation and response serialization.
Each domain (User, Exam, Question, etc.) has:
  - a Base schema   (shared fields)
  - a Create schema (fields required on creation)
  - a Response schema (what the API sends back, includes id / timestamps)
"""

from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator
from app.models import UserRole, QuestionType, DifficultyLevel, SessionStatus


# ════════════════════════════════════════════════════════════════
# AUTH / TOKEN
# ════════════════════════════════════════════════════════════════

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None


# ════════════════════════════════════════════════════════════════
# USER
# ════════════════════════════════════════════════════════════════

class UserBase(BaseModel):
    full_name: str
    email: EmailStr


class UserCreate(UserBase):
    """Public registration — always creates a student. No role field exposed."""
    password: str
    role: UserRole = UserRole.student

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════════════════════════
# OPTION  (MCQ choice)
# ════════════════════════════════════════════════════════════════

class OptionCreate(BaseModel):
    option_label: str   # "A", "B", "C", "D"
    option_text: str


class OptionResponse(OptionCreate):
    id: int
    question_id: int

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════════════════════════
# QUESTION
# ════════════════════════════════════════════════════════════════

class QuestionBase(BaseModel):
    question_text: str
    question_type: QuestionType = QuestionType.mcq
    marks: float = 1.0
    difficulty: DifficultyLevel = DifficultyLevel.medium


class QuestionCreate(QuestionBase):
    options: Optional[List[OptionCreate]] = []   # required for MCQ
    correct_option_label: Optional[str] = None   # "A" / "B" / "C" / "D"


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    marks: Optional[float] = None
    difficulty: Optional[DifficultyLevel] = None
    correct_option_label: Optional[str] = None


class QuestionResponse(QuestionBase):
    id: int
    exam_id: int
    correct_option_id: Optional[int]
    options: List[OptionResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Stripped version shown to students (hides correct answer) ──

class QuestionForStudent(BaseModel):
    id: int
    question_text: str
    question_type: QuestionType
    marks: float
    difficulty: DifficultyLevel
    options: List[OptionResponse] = []

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════════════════════════
# EXAM
# ════════════════════════════════════════════════════════════════

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration_min: int


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_min: Optional[int] = None
    is_active: Optional[bool] = None


class ExamResponse(ExamBase):
    id: int
    total_marks: float
    is_active: bool
    created_by: int
    created_at: datetime
    questions: List[QuestionResponse] = []

    model_config = {"from_attributes": True}


class ExamListItem(BaseModel):
    """Lightweight exam card shown on the student dashboard."""
    id: int
    title: str
    description: Optional[str]
    duration_min: int
    total_marks: float
    is_active: bool

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════════════════════════
# EXAM SESSION
# ════════════════════════════════════════════════════════════════

class ExamSessionResponse(BaseModel):
    id: int
    student_id: int
    exam_id: int
    started_at: datetime
    submitted_at: Optional[datetime]
    status: SessionStatus
    # questions shown when session starts
    questions: Optional[List[QuestionForStudent]] = None

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════════════════════════
# ANSWERS
# ════════════════════════════════════════════════════════════════

class SubmitAnswer(BaseModel):
    question_id: int
    selected_option_id: int   # the id of the Option row


class BulkAnswerSubmit(BaseModel):
    """Used for auto-save / partial saves during the exam."""
    answers: List[SubmitAnswer]


class CodingSubmissionCreate(BaseModel):
    question_id: int
    language: str
    code: str


class CodingSubmissionResponse(BaseModel):
    id: int
    question_id: int
    language: str
    test_cases_passed: int
    total_test_cases: int
    score: float
    submitted_at: datetime

    model_config = {"from_attributes": True}


# ════════════════════════════════════════════════════════════════
# RESULT
# ════════════════════════════════════════════════════════════════

class ResultResponse(BaseModel):
    id: int
    student_id: int
    exam_id: int
    session_id: int
    total_marks: float
    scored_marks: float
    percentage: float
    passed: bool
    calculated_at: datetime

    model_config = {"from_attributes": True}


class DetailedResult(ResultResponse):
    """Result plus a per-question breakdown."""
    answers: List[dict] = []


# Added for admin-only user creation
class AdminCreateUser(UserBase):
    """Only admins can use this schema — can create any role including admin."""
    password: str
    role: UserRole = UserRole.student

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

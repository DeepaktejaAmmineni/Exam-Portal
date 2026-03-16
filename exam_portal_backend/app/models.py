"""
models.py
---------
All 8 database tables defined as SQLAlchemy ORM classes.
Running `Base.metadata.create_all(bind=engine)` will create every table.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float,
    DateTime, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base


# ── Enumerations ───────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin   = "admin"
    student = "student"


class QuestionType(str, enum.Enum):
    mcq    = "mcq"
    coding = "coding"


class DifficultyLevel(str, enum.Enum):
    easy   = "easy"
    medium = "medium"
    hard   = "hard"


class SessionStatus(str, enum.Enum):
    in_progress = "in_progress"
    submitted   = "submitted"
    timed_out   = "timed_out"


# ── Table 1 : Users ────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    full_name     = Column(String(150), nullable=False)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role          = Column(SAEnum(UserRole), default=UserRole.student, nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    # relationships
    exam_sessions = relationship("ExamSession", back_populates="student")
    results       = relationship("Result", back_populates="student")


# ── Table 2 : Exams ────────────────────────────────────────────────────────

class Exam(Base):
    __tablename__ = "exams"

    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String(255), nullable=False)
    description  = Column(Text, nullable=True)
    duration_min = Column(Integer, nullable=False, comment="Exam duration in minutes")
    total_marks  = Column(Float, default=0)
    is_active    = Column(Boolean, default=True)
    created_by   = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    # relationships
    questions     = relationship("Question", back_populates="exam", cascade="all, delete-orphan")
    exam_sessions = relationship("ExamSession", back_populates="exam")
    results       = relationship("Result", back_populates="exam")


# ── Table 3 : Questions ────────────────────────────────────────────────────

class Question(Base):
    __tablename__ = "questions"

    id            = Column(Integer, primary_key=True, index=True)
    exam_id       = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(SAEnum(QuestionType), default=QuestionType.mcq, nullable=False)
    marks         = Column(Float, default=1.0)
    difficulty    = Column(SAEnum(DifficultyLevel), default=DifficultyLevel.medium)
    correct_option_id = Column(Integer, nullable=True)   # set after options are created (MCQ)
    created_at    = Column(DateTime, default=datetime.utcnow)

    # relationships
    exam               = relationship("Exam", back_populates="questions")
    options            = relationship("Option", back_populates="question", cascade="all, delete-orphan")
    student_answers    = relationship("StudentAnswer", back_populates="question")
    coding_submissions = relationship("CodingSubmission", back_populates="question")


# ── Table 4 : Options (MCQ choices) ───────────────────────────────────────

class Option(Base):
    __tablename__ = "options"

    id          = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    option_text = Column(Text, nullable=False)
    option_label = Column(String(1), nullable=False, comment="A / B / C / D")

    # relationships
    question = relationship("Question", back_populates="options")


# ── Table 5 : Exam Sessions ────────────────────────────────────────────────

class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id         = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_id    = Column(Integer, ForeignKey("exams.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    status     = Column(SAEnum(SessionStatus), default=SessionStatus.in_progress)

    # relationships
    student         = relationship("User", back_populates="exam_sessions")
    exam            = relationship("Exam", back_populates="exam_sessions")
    student_answers = relationship("StudentAnswer", back_populates="session")
    result          = relationship("Result", back_populates="session", uselist=False)


# ── Table 6 : Student Answers (MCQ) ───────────────────────────────────────

class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id                = Column(Integer, primary_key=True, index=True)
    session_id        = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    question_id       = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("options.id"), nullable=True)
    answered_at       = Column(DateTime, default=datetime.utcnow)

    # relationships
    session  = relationship("ExamSession", back_populates="student_answers")
    question = relationship("Question", back_populates="student_answers")


# ── Table 7 : Coding Submissions ───────────────────────────────────────────

class CodingSubmission(Base):
    __tablename__ = "coding_submissions"

    id          = Column(Integer, primary_key=True, index=True)
    session_id  = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    language    = Column(String(50), nullable=False)
    code        = Column(Text, nullable=False)
    test_cases_passed = Column(Integer, default=0)
    total_test_cases  = Column(Integer, default=0)
    score       = Column(Float, default=0)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    # relationships
    question = relationship("Question", back_populates="coding_submissions")


# ── Table 8 : Results ─────────────────────────────────────────────────────

class Result(Base):
    __tablename__ = "results"

    id             = Column(Integer, primary_key=True, index=True)
    student_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    exam_id        = Column(Integer, ForeignKey("exams.id"), nullable=False)
    session_id     = Column(Integer, ForeignKey("exam_sessions.id"), nullable=False)
    total_marks    = Column(Float, nullable=False)
    scored_marks   = Column(Float, nullable=False)
    percentage     = Column(Float, nullable=False)
    passed         = Column(Boolean, default=False)
    calculated_at  = Column(DateTime, default=datetime.utcnow)

    # relationships
    student = relationship("User", back_populates="results")
    exam    = relationship("Exam", back_populates="results")
    session = relationship("ExamSession", back_populates="result")

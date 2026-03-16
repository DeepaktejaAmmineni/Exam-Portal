-- ============================================================
-- Technical Exam Portal — PostgreSQL Schema
-- Run this file in psql or any PostgreSQL client to create
-- all 8 tables from scratch.
--
-- Usage:
--   psql -U postgres -d exam_portal -f create_tables.sql
-- ============================================================


-- ── 1. USERS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                SERIAL PRIMARY KEY,
    full_name         VARCHAR(150)        NOT NULL,
    email             VARCHAR(255)        UNIQUE NOT NULL,
    hashed_password   VARCHAR(255)        NOT NULL,
    role              VARCHAR(10)         NOT NULL DEFAULT 'student'
                          CHECK (role IN ('admin', 'student')),
    is_active         BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP           NOT NULL DEFAULT NOW()
);


-- ── 2. EXAMS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(255)    NOT NULL,
    description   TEXT,
    duration_min  INTEGER         NOT NULL,   -- exam duration in minutes
    total_marks   FLOAT           NOT NULL DEFAULT 0,
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_by    INTEGER         NOT NULL REFERENCES users(id),
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ── 3. QUESTIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
    id                  SERIAL PRIMARY KEY,
    exam_id             INTEGER         NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_text       TEXT            NOT NULL,
    question_type       VARCHAR(10)     NOT NULL DEFAULT 'mcq'
                            CHECK (question_type IN ('mcq', 'coding')),
    marks               FLOAT           NOT NULL DEFAULT 1.0,
    difficulty          VARCHAR(10)     NOT NULL DEFAULT 'medium'
                            CHECK (difficulty IN ('easy', 'medium', 'hard')),
    correct_option_id   INTEGER,        -- FK set after options are inserted (MCQ only)
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);


-- ── 4. OPTIONS (MCQ answer choices) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS options (
    id           SERIAL PRIMARY KEY,
    question_id  INTEGER     NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_label VARCHAR(1)  NOT NULL,   -- 'A', 'B', 'C', 'D'
    option_text  TEXT        NOT NULL
);

-- Add the FK from questions → options AFTER both tables exist
ALTER TABLE questions
    ADD CONSTRAINT fk_correct_option
    FOREIGN KEY (correct_option_id) REFERENCES options(id)
    ON DELETE SET NULL;


-- ── 5. EXAM SESSIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_sessions (
    id            SERIAL PRIMARY KEY,
    student_id    INTEGER         NOT NULL REFERENCES users(id),
    exam_id       INTEGER         NOT NULL REFERENCES exams(id),
    started_at    TIMESTAMP       NOT NULL DEFAULT NOW(),
    submitted_at  TIMESTAMP,
    status        VARCHAR(15)     NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'submitted', 'timed_out'))
);


-- ── 6. STUDENT ANSWERS (MCQ) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_answers (
    id                  SERIAL PRIMARY KEY,
    session_id          INTEGER     NOT NULL REFERENCES exam_sessions(id),
    question_id         INTEGER     NOT NULL REFERENCES questions(id),
    selected_option_id  INTEGER     REFERENCES options(id),
    answered_at         TIMESTAMP   NOT NULL DEFAULT NOW(),

    -- one answer per question per session
    UNIQUE (session_id, question_id)
);


-- ── 7. CODING SUBMISSIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coding_submissions (
    id                  SERIAL PRIMARY KEY,
    session_id          INTEGER     NOT NULL REFERENCES exam_sessions(id),
    question_id         INTEGER     NOT NULL REFERENCES questions(id),
    language            VARCHAR(50) NOT NULL,
    code                TEXT        NOT NULL,
    test_cases_passed   INTEGER     NOT NULL DEFAULT 0,
    total_test_cases    INTEGER     NOT NULL DEFAULT 0,
    score               FLOAT       NOT NULL DEFAULT 0,
    submitted_at        TIMESTAMP   NOT NULL DEFAULT NOW()
);


-- ── 8. RESULTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
    id              SERIAL PRIMARY KEY,
    student_id      INTEGER     NOT NULL REFERENCES users(id),
    exam_id         INTEGER     NOT NULL REFERENCES exams(id),
    session_id      INTEGER     NOT NULL REFERENCES exam_sessions(id),
    total_marks     FLOAT       NOT NULL,
    scored_marks    FLOAT       NOT NULL,
    percentage      FLOAT       NOT NULL,
    passed          BOOLEAN     NOT NULL DEFAULT FALSE,
    calculated_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);


-- ── Indexes for commonly queried columns ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_questions_exam       ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_options_question     ON options(question_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student     ON exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exam        ON exam_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_answers_session      ON student_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_results_student      ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_exam         ON results(exam_id);


-- ── Done ──────────────────────────────────────────────────────────────────
-- All 8 tables created successfully.
-- Next step: fill in your .env file and run: uvicorn app.main:app --reload

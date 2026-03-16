# Technical Exam Portal — Backend

FastAPI backend for an online technical exam portal.  
Supports MCQ exams with a full exam engine (timer, auto-save, auto-submit).

---

## Project Structure

```
exam_portal_backend/
├── app/
│   ├── main.py          ← FastAPI app + router registration
│   ├── database.py      ← SQLAlchemy engine & session (reads .env)
│   ├── models.py        ← 8 ORM table definitions
│   ├── schemas.py       ← Pydantic request/response models
│   ├── routers/
│   │   ├── auth.py      ← Register / Login / Me
│   │   ├── users.py     ← Admin user management
│   │   ├── exams.py     ← Exam CRUD + results view
│   │   ├── questions.py ← Question & option management
│   │   ├── sessions.py  ← Exam engine (start / answer / submit)
│   │   └── results.py   ← View results
│   └── utils/
│       ├── hashing.py   ← bcrypt password hashing
│       └── jwt_handler.py ← JWT create / decode / dependency
├── requirements.txt
├── .env.example         ← Copy to .env and fill in your credentials
└── README.md
```

---

## Quick Start

### 1. Clone / copy the project

```bash
cd exam_portal_backend
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your PostgreSQL credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=exam_portal
DB_USER=postgres
DB_PASSWORD=your_actual_password

SECRET_KEY=some_long_random_secret
```

### 5. Create the PostgreSQL database

```sql
CREATE DATABASE exam_portal;
```

### 6. Run the server

```bash
uvicorn app.main:app --reload
```

All tables are created automatically on first run.

### 7. Open API docs

- Swagger UI → http://localhost:8000/docs  
- ReDoc      → http://localhost:8000/redoc

---

## API Overview

### Authentication

| Method | Endpoint              | Description              | Auth |
|--------|-----------------------|--------------------------|------|
| POST   | `/api/auth/register`  | Register student / admin | None |
| POST   | `/api/auth/login`     | Login → JWT token        | None |
| GET    | `/api/auth/me`        | Current user profile     | Any  |

### Exams

| Method | Endpoint                    | Description              | Auth    |
|--------|-----------------------------|--------------------------|---------|
| POST   | `/api/exams/`               | Create exam              | Admin   |
| GET    | `/api/exams/`               | List exams               | Any     |
| GET    | `/api/exams/{id}`           | Get exam detail          | Any     |
| PUT    | `/api/exams/{id}`           | Update exam              | Admin   |
| DELETE | `/api/exams/{id}`           | Delete exam              | Admin   |
| GET    | `/api/exams/{id}/results`   | All results for exam     | Admin   |

### Questions

| Method | Endpoint                                     | Description         | Auth  |
|--------|----------------------------------------------|---------------------|-------|
| POST   | `/api/exams/{exam_id}/questions/`            | Add question        | Admin |
| GET    | `/api/exams/{exam_id}/questions/`            | List questions      | Admin |
| GET    | `/api/exams/{exam_id}/questions/{q_id}`      | Get one question    | Admin |
| PUT    | `/api/exams/{exam_id}/questions/{q_id}`      | Update question     | Admin |
| DELETE | `/api/exams/{exam_id}/questions/{q_id}`      | Delete question     | Admin |

### Exam Sessions (Exam Engine)

| Method | Endpoint                             | Description                  | Auth    |
|--------|--------------------------------------|------------------------------|---------|
| POST   | `/api/sessions/start/{exam_id}`      | Start exam, get questions    | Student |
| GET    | `/api/sessions/my`                   | My sessions                  | Student |
| GET    | `/api/sessions/{id}`                 | Session status + timer check | Any     |
| POST   | `/api/sessions/{id}/answer`          | Auto-save single answer      | Student |
| POST   | `/api/sessions/{id}/answers`         | Bulk save answers            | Student |
| POST   | `/api/sessions/{id}/submit`          | Submit exam → get result     | Student |

### Results

| Method | Endpoint                   | Description                  | Auth    |
|--------|----------------------------|------------------------------|---------|
| GET    | `/api/results/my`          | My results                   | Student |
| GET    | `/api/results/admin/all`   | All results                  | Admin   |
| GET    | `/api/results/{id}`        | Detailed result breakdown    | Any     |

---

## Typical Workflows

### Admin creates an exam

```
POST /api/auth/login              → get token
POST /api/exams/                  → create exam { title, duration_min }
POST /api/exams/{id}/questions/   → add MCQ questions with options
```

### Student takes an exam

```
POST /api/auth/login              → get token
GET  /api/exams/                  → see available exams
POST /api/sessions/start/{id}     → start exam (returns questions + session id)
POST /api/sessions/{sid}/answer   → save each answer as student selects
POST /api/sessions/{sid}/submit   → submit when done
GET  /api/results/{result_id}     → view score and breakdown
```

---

## Database Tables

| Table               | Purpose                             |
|---------------------|-------------------------------------|
| `users`             | Students and admins                 |
| `exams`             | Exam definitions                    |
| `questions`         | Questions belonging to exams        |
| `options`           | MCQ answer choices                  |
| `exam_sessions`     | Tracks each student's exam attempt  |
| `student_answers`   | Saved MCQ answers                   |
| `coding_submissions`| (Stage 4) Coding question answers   |
| `results`           | Final scores                        |

---

## Roadmap

- [x] Stage 1 — MCQ exams (complete)
- [x] Stage 2 — Timer + exam engine (complete)
- [x] Stage 3 — Results system (complete)
- [ ] Stage 4 — Coding questions via Judge0 API

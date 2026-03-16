"""
main.py
-------
Application entry point.
Run with:  uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app import models
from app.routers import auth, users, exams, questions, sessions, results

# ── Create all tables on startup (safe to call multiple times) ─────────────
models.Base.metadata.create_all(bind=engine)

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "Technical Exam Portal API",
    description = "Backend API for creating and taking technical exams online.",
    version     = "1.0.0",
    docs_url    = "/docs",       # Swagger UI
    redoc_url   = "/redoc",      # ReDoc UI
)

# ── CORS (adjust origins for production) ──────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://exam-portal-nine-puce.vercel.app",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(exams.router)
app.include_router(questions.router)
app.include_router(sessions.router)
app.include_router(results.router)


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Exam Portal API is running"}

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine
from app import models
from app.routers import auth, users, exams, questions, sessions, results

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Technical Exam Portal API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [
    "https://exam-portal-nine-puce.vercel.app",
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(exams.router)
app.include_router(questions.router)
app.include_router(sessions.router)
app.include_router(results.router)

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Exam Portal API is running"}
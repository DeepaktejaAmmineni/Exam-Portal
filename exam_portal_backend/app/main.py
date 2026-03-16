from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app import models
from app.routers import auth, users, exams, questions, sessions, results

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title       = "Technical Exam Portal API",
    description = "Backend API for creating and taking technical exams online.",
    version     = "1.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.options("/{rest_of_path:path}")
async def preflight_handler():
    return {"message": "OK"}
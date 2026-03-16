"""
routers/users.py
----------------
Admin-only endpoints for managing user accounts.

GET  /api/users/                → list all users
GET  /api/users/{id}            → get one user
POST /api/users/create-admin    → create a new admin account (admin only)
PUT  /api/users/{id}/deactivate → disable a user account
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.utils.hashing import hash_password
from app.utils.jwt_handler import get_current_admin

router = APIRouter(prefix="/api/users", tags=["Users (Admin)"])


@router.get("/", response_model=List[schemas.UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    """List all registered users (admin only)."""
    return db.query(models.User).offset(skip).limit(limit).all()


@router.get("/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/create-admin", response_model=schemas.UserResponse, status_code=201)
def create_admin(
    user_in: schemas.AdminCreateUser,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin),
):
    """
    Create a new user with any role (admin only).
    This is the ONLY way to create admin accounts —
    the public /register endpoint always creates students.
    """
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        full_name       = user_in.full_name,
        email           = user_in.email,
        hashed_password = hash_password(user_in.password),
        role            = user_in.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/{user_id}/deactivate", response_model=schemas.UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Disable a user account. Admins cannot deactivate themselves."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = "Citizen"
    preferred_language: Optional[str] = "en"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    full_name: str
    preferred_language: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    preferred_language: str
    created_at: datetime

    class Config:
        from_attributes = True

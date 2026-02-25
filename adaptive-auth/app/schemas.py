from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# --- Auth Schemas ---

class LoginRequest(BaseModel):
    username: str
    password: str
    device_fingerprint: Optional[str] = None


class OTPVerifyRequest(BaseModel):
    pending_auth_id: int
    otp_code: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


# --- Response Schemas ---

class LoginResponse(BaseModel):
    success: bool
    message: str
    risk_level: Optional[str] = None
    risk_score: Optional[int] = None
    require_otp: bool = False
    pending_auth_id: Optional[int] = None
    otp_code: Optional[str] = None


class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None

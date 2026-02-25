from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import bcrypt
import secrets
import hashlib

from app.database import get_db
from app.models import User, LoginAttempt, TrustedDevice, PendingAuth
from app.schemas import LoginRequest, LoginResponse, OTPVerifyRequest, AuthResponse, RegisterRequest
from app.risk_engine import assess_risk

router = APIRouter(prefix="/auth", tags=["Authentication"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def generate_otp() -> str:
    return "".join([str(secrets.randbelow(10)) for _ in range(6)])


def hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


# --- Register ---

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(
        (User.username == data.username) | (User.email == data.email)
    ).first()
    if existing:
        return {"success": False, "message": "Username or email already exists"}

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    return {"success": True, "message": "User registered successfully"}


# --- Login ---

@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    # Get IP from request
    ip_address = request.client.host if request.client else "unknown"

    # Assess risk BEFORE verifying credentials
    risk_result = assess_risk(
        db=db,
        username=data.username,
        ip_address=ip_address,
        device_fingerprint=data.device_fingerprint,
        location_lat=None,  # We'll add GeoIP later
        location_lon=None,
    )

    risk_level = risk_result["risk_level"]
    risk_score = risk_result["risk_score"]

    # Verify user exists and password is correct
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        # Log failed attempt
        attempt = LoginAttempt(
            user_id=user.id if user else None,
            ip_address=ip_address,
            device_fingerprint=data.device_fingerprint,
            risk_score=risk_score,
            risk_level=risk_level,
            success=False,
            failure_reason="invalid_credentials",
        )
        db.add(attempt)
        db.commit()
        return LoginResponse(
            success=False, message="Invalid credentials", risk_level=risk_level
        )

    # --- LOW RISK PATH ---
    if risk_level == "low":
        # Log successful attempt
        attempt = LoginAttempt(
            user_id=user.id,
            ip_address=ip_address,
            device_fingerprint=data.device_fingerprint,
            risk_score=risk_score,
            risk_level="low",
            success=True,
        )
        db.add(attempt)
        user.last_login = datetime.now(timezone.utc)
        db.commit()

        return LoginResponse(
            success=True, message="Login successful", risk_level="low", risk_score=risk_score
        )

    # --- HIGH RISK PATH ---
    otp_code = generate_otp()
    pending = PendingAuth(
        user_id=user.id,
        otp_hash=hash_otp(otp_code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        ip_address=ip_address,
        device_fingerprint=data.device_fingerprint,
    )
    db.add(pending)
    db.commit()

    # In production: send OTP via email/SMS
    # For demo: we'll return it in the response (remove in production!)
    print(f"[DEMO] OTP for {data.username}: {otp_code}")

    return LoginResponse(
        success=True,
        message="Additional verification required. OTP has been sent.",
        risk_level="high",
        risk_score=risk_score,
        require_otp=True,
        pending_auth_id=pending.id,
        otp_code=otp_code,
    )


# --- Verify OTP ---

@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(data: OTPVerifyRequest, db: Session = Depends(get_db)):
    pending = db.query(PendingAuth).filter(
        PendingAuth.id == data.pending_auth_id,
        PendingAuth.is_used == False,
    ).first()

    if not pending:
        return AuthResponse(success=False, message="Invalid or expired session")

     # Check expiration
    expires = pending.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        return AuthResponse(success=False, message="OTP expired")

    # Check attempts
    if pending.attempts >= 3:
        return AuthResponse(success=False, message="Too many attempts")

    # Verify OTP
    if hash_otp(data.otp_code) != pending.otp_hash:
        pending.attempts += 1
        db.commit()
        return AuthResponse(
            success=False,
            message=f"Invalid OTP. {3 - pending.attempts} attempts remaining",
        )

    # OTP valid — complete login
    pending.is_used = True
    user = db.query(User).filter(User.id == pending.user_id).first()
    user.last_login = datetime.now(timezone.utc)

    # Trust this device for future logins
    if pending.device_fingerprint:
        existing_device = db.query(TrustedDevice).filter(
            TrustedDevice.user_id == user.id,
            TrustedDevice.device_fingerprint == pending.device_fingerprint,
        ).first()

        if not existing_device:
            trusted = TrustedDevice(
                user_id=user.id,
                device_fingerprint=pending.device_fingerprint,
            )
            db.add(trusted)

    # Log successful attempt
    attempt = LoginAttempt(
        user_id=user.id,
        ip_address=pending.ip_address,
        device_fingerprint=pending.device_fingerprint,
        risk_score=0,
        risk_level="high",
        success=True,
    )
    db.add(attempt)
    db.commit()

    return AuthResponse(success=True, message="Login successful")



# --- Risk Assessment Debug (Demo Only) ---

@router.post("/debug/risk-assessment")
def debug_risk(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else "unknown"

    risk_result = assess_risk(
        db=db,
        username=data.username,
        ip_address=ip_address,
        device_fingerprint=data.device_fingerprint,
        location_lat=None,
        location_lon=None,
    )

    return {
        "username": data.username,
        "ip_address": ip_address,
        "device_fingerprint": data.device_fingerprint,
        "risk_score": risk_result["risk_score"],
        "risk_level": risk_result["risk_level"],
        "threshold": 100,
        "signals": risk_result["signals"],
    }

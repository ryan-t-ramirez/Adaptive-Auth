from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    totp_secret = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)

    login_attempts = relationship("LoginAttempt", back_populates="user")
    trusted_devices = relationship("TrustedDevice", back_populates="user")


class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address = Column(String, nullable=False)
    device_fingerprint = Column(String, nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lon = Column(Float, nullable=True)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String, default="low")
    success = Column(Boolean, default=False)
    failure_reason = Column(String, nullable=True)

    user = relationship("User", back_populates="login_attempts")


class TrustedDevice(Base):
    __tablename__ = "trusted_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_fingerprint = Column(String, nullable=False)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    trust_level = Column(String, default="verified")
    device_name = Column(String, nullable=True)

    user = relationship("User", back_populates="trusted_devices")


class PendingAuth(Base):
    __tablename__ = "pending_auth"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    otp_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, default=0)
    ip_address = Column(String, nullable=True)
    device_fingerprint = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_used = Column(Boolean, default=False)

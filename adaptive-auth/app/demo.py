from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import User, LoginAttempt, TrustedDevice
from app.risk_engine import assess_risk, RISK_THRESHOLD

router = APIRouter(prefix="/demo", tags=["Demo & Simulation"])


@router.post("/simulate-login")
def simulate_login(
    username: str,
    ip_address: str = "127.0.0.1",
    device_fingerprint: str = "demo-device",
    location_lat: float = None,
    location_lon: float = None,
    db: Session = Depends(get_db),
):
    """
    Simulate a login with custom parameters to demonstrate risk scoring.
    Allows overriding IP, device, and location to trigger different risk signals.
    """
    risk_result = assess_risk(
        db=db,
        username=username,
        ip_address=ip_address,
        device_fingerprint=device_fingerprint,
        location_lat=location_lat,
        location_lon=location_lon,
    )

    return {
        "username": username,
        "ip_address": ip_address,
        "device_fingerprint": device_fingerprint,
        "location": {"lat": location_lat, "lon": location_lon},
        "risk_score": risk_result["risk_score"],
        "risk_level": risk_result["risk_level"],
        "threshold": RISK_THRESHOLD,
        "signals": risk_result["signals"],
        "action": "Require MFA" if risk_result["risk_level"] == "high" else "Allow password-only",
    }


@router.post("/seed-login-history")
def seed_login_history(username: str, db: Session = Depends(get_db)):
    """
    Seed a user with realistic login history so impossible travel
    and atypical time detection have data to work with.
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return {"success": False, "message": "User not found"}

    # Add 10 successful logins from Milwaukee over the past 30 days
    # All between 8am-6pm CT (typical work hours)
    milwaukee_lat, milwaukee_lon = 43.0389, -87.9065

    for i in range(10):
        days_ago = i * 3  # Every 3 days
        login_hour = 9 + (i % 8)  # Between 9am and 4pm
        attempt = LoginAttempt(
            user_id=user.id,
            timestamp=datetime.now(timezone.utc) - timedelta(days=days_ago, hours=login_hour),
            ip_address="192.168.1.100",
            device_fingerprint="home-macbook-pro",
            location_lat=milwaukee_lat,
            location_lon=milwaukee_lon,
            risk_score=0,
            risk_level="low",
            success=True,
        )
        db.add(attempt)

    # Add a very recent login from Milwaukee (20 min ago)
    # This ensures the impossible travel simulation can trigger
    recent_attempt = LoginAttempt(
        user_id=user.id,
        timestamp=datetime.now(timezone.utc) - timedelta(minutes=20),
        ip_address="192.168.1.100",
        device_fingerprint="home-macbook-pro",
        location_lat=milwaukee_lat,
        location_lon=milwaukee_lon,
        risk_score=0,
        risk_level="low",
        success=True,
    )
    db.add(recent_attempt)

    # Also trust the home device
    existing = db.query(TrustedDevice).filter(
        TrustedDevice.user_id == user.id,
        TrustedDevice.device_fingerprint == "home-macbook-pro",
    ).first()

    if not existing:
        db.add(TrustedDevice(
            user_id=user.id,
            device_fingerprint="home-macbook-pro",
        ))

    db.commit()
    return {
        "success": True,
        "message": f"Seeded 11 login attempts (including 1 recent) and trusted device for {username}",
        "trusted_device": "home-macbook-pro",
        "location": "Milwaukee, WI",
    }

from datetime import datetime, timedelta, timezone
from math import radians, cos, sin, asin, sqrt
from sqlalchemy.orm import Session
from app.models import User, LoginAttempt, TrustedDevice

RISK_THRESHOLD = 100
MAX_TRAVEL_SPEED_KMH = 1000  # Faster than commercial flight = suspicious


def assess_risk(db: Session, username: str, ip_address: str,
                device_fingerprint: str | None,
                location_lat: float | None, location_lon: float | None) -> dict:
    """
    Evaluates login risk based on multiple signals.
    Returns dict with risk_score, risk_level, and individual signal results.
    """
    risk_score = 0
    signals = {}

    user = db.query(User).filter(User.username == username).first()

    # 1. IP Reputation (High Impact: +90)
    ip_flagged = is_ip_blacklisted(ip_address)
    if ip_flagged:
        risk_score += 90
    signals["ip_reputation"] = {"flagged": ip_flagged, "points": 90 if ip_flagged else 0}

    # 2. New Device (High Impact: +105)
    new_device = is_new_device(db, user, device_fingerprint)
    if new_device:
        risk_score += 105
    signals["new_device"] = {"flagged": new_device, "points": 105 if new_device else 0}

    # 3. Impossible Travel (Critical Impact: +150)
    impossible = is_impossible_travel(db, user, location_lat, location_lon)
    if impossible:
        risk_score += 150
    signals["impossible_travel"] = {"flagged": impossible, "points": 150 if impossible else 0}

    # 4. Atypical Login Time (Medium Impact: +30)
    atypical = is_atypical_time(db, user)
    if atypical:
        risk_score += 30
    signals["atypical_time"] = {"flagged": atypical, "points": 30 if atypical else 0}

    risk_level = "high" if risk_score >= RISK_THRESHOLD else "low"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "signals": signals,
    }


def is_ip_blacklisted(ip_address: str) -> bool:
    """Check if IP is in a known blacklist."""
    # For demo: flag common suspicious patterns
    # In production, you'd call an API like AbuseIPDB or maintain a local list
    blacklisted_prefixes = ["192.168.99.", "10.0.99."]
    return any(ip_address.startswith(prefix) for prefix in blacklisted_prefixes)


def is_new_device(db: Session, user: User | None, device_fingerprint: str | None) -> bool:
    """Check if this device has been seen before for this user."""
    if not user or not device_fingerprint:
        return True

    trusted = db.query(TrustedDevice).filter(
        TrustedDevice.user_id == user.id,
        TrustedDevice.device_fingerprint == device_fingerprint,
    ).first()

    return trusted is None


def is_impossible_travel(db: Session, user: User | None,
                         current_lat: float | None, current_lon: float | None) -> bool:
    """Detect if travel between last login and current login is physically impossible."""
    if not user or current_lat is None or current_lon is None:
        return False

    last_login = db.query(LoginAttempt).filter(
        LoginAttempt.user_id == user.id,
        LoginAttempt.success == True,
        LoginAttempt.location_lat.isnot(None),
        LoginAttempt.location_lon.isnot(None),
    ).order_by(LoginAttempt.timestamp.desc()).first()

    if not last_login:
        return False

    distance_km = haversine(last_login.location_lat, last_login.location_lon,
                            current_lat, current_lon)

    # Handle both timezone-aware and naive timestamps
    last_time = last_login.timestamp
    if last_time.tzinfo is None:
        last_time = last_time.replace(tzinfo=timezone.utc)
    time_diff = datetime.now(timezone.utc) - last_time
    hours = time_diff.total_seconds() / 3600

    if hours <= 0:
        return distance_km > 50  # Same moment, different location

    required_speed = distance_km / hours
    return required_speed > MAX_TRAVEL_SPEED_KMH


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two lat/lon points."""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6371 * 2 * asin(sqrt(a))


def is_atypical_time(db: Session, user: User | None) -> bool:
    """Check if current login time is unusual for this user."""
    if not user:
        return False

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_logins = db.query(LoginAttempt).filter(
        LoginAttempt.user_id == user.id,
        LoginAttempt.success == True,
        LoginAttempt.timestamp >= thirty_days_ago,
    ).all()

    if len(recent_logins) < 5:
        return False  # Not enough data to establish a pattern

    login_hours = [attempt.timestamp.hour for attempt in recent_logins]
    login_hours.sort()
    median_hour = login_hours[len(login_hours) // 2]

    current_hour = datetime.now(timezone.utc).hour
    hour_diff = min(abs(current_hour - median_hour), 24 - abs(current_hour - median_hour))

    return hour_diff > 3

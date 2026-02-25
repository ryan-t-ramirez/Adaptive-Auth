# Adaptive Authentication Framework

A full-stack risk-based authentication system that dynamically adjusts security requirements based on real-time contextual signals. Low-risk logins proceed with password-only authentication; high-risk logins trigger conditional MFA.

**Live Demo:** [adaptive-auth-production.up.railway.app](https://adaptive-auth-production.up.railway.app)

![Sign In](screenshots/sign-in.png)

---

## How It Works

Every login attempt is evaluated by a risk scoring engine that analyzes four signals:

| Signal | Points | What It Detects |
|---|---|---|
| **IP Reputation** | +90 | Login from a known malicious or blacklisted IP prefix |
| **New Device** | +105 | Device fingerprint not found in the user's trusted devices |
| **Impossible Travel** | +150 | Login location requires travel speed >1,000 km/h from last known location |
| **Atypical Time** | +30 | Login hour deviates >3 hours from the user's median login time (last 30 days) |

If the cumulative score meets or exceeds the **threshold of 100**, the system requires OTP verification before granting access. If the OTP is verified successfully, the device is added to the user's trusted devices — reducing friction on future logins from that device.

![High Risk Simulation](screenshots/impossible-travel.png)

---

## Demo

The live deployment includes a simulation panel with four preset scenarios. The seed button auto-creates a demo account — no registration required.

- **Trusted Login** — Known device, clean IP → low risk, password only
- **New Device** — Unrecognized device fingerprint → triggers MFA
- **Blacklisted IP** — Known malicious IP prefix → triggers MFA
- **Impossible Travel** — Moscow coordinates + blacklisted IP → all signals fire

![Simulation Panel](screenshots/demo-panel.png)

When MFA is triggered, the user is challenged with a one-time password. In demo mode, the OTP is displayed in the UI banner for easy testing.

![OTP Challenge](screenshots/otp-challenge.png)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                  │
│           (Vite + Tailwind CSS)                  │
│  Login ─► OTP Challenge ─► Dashboard             │
│  Registration    Simulation Panel                │
└──────────────────────┬──────────────────────────┘
                       │ HTTP (Axios)
┌──────────────────────▼──────────────────────────┐
│                 FastAPI Backend                   │
│                                                  │
│  /auth/register     POST  Create user account    │
│  /auth/login        POST  Authenticate + assess  │
│  /auth/verify-otp   POST  Verify OTP + trust dev │
│  /demo/simulate     POST  Simulate risk scenario │
│  /demo/seed         POST  Populate test data     │
│  /docs              GET   Swagger UI (auto-gen)  │
│                                                  │
│  ┌────────────────────────────────────┐          │
│  │        Risk Engine                 │          │
│  │  IP check ─► Device check         │          │
│  │  Travel check ─► Time check       │          │
│  │  ─► Cumulative score ─► Route     │          │
│  └────────────────────────────────────┘          │
└──────────────────────┬──────────────────────────┘
                       │ SQLAlchemy ORM
┌──────────────────────▼──────────────────────────┐
│              SQLite Database                      │
│                                                  │
│  users ─── login_attempts ─── trusted_devices    │
│                pending_auth                       │
└─────────────────────────────────────────────────┘
```

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, bcrypt, python-jose
- **Frontend:** React, Vite, Tailwind CSS, Axios
- **Database:** SQLite (dev) — swappable to PostgreSQL via one config change
- **Deployment:** Railway (Nixpacks builder)

## Project Structure

```
adaptive-auth/
├── app/
│   ├── auth.py           # Register, login, OTP verification endpoints
│   ├── config.py         # Environment variables (SECRET_KEY, DATABASE_URL)
│   ├── database.py       # SQLAlchemy engine and session setup
│   ├── demo.py           # Simulation and seed endpoints for live demos
│   ├── main.py           # FastAPI app, serves compiled React frontend
│   ├── models.py         # User, LoginAttempt, TrustedDevice, PendingAuth
│   ├── risk_engine.py    # Risk scoring logic (4 signals, threshold routing)
│   └── schemas.py        # Pydantic request/response models
├── frontend/
│   ├── src/App.jsx       # Main React component (all views)
│   └── dist/             # Compiled frontend (served by FastAPI)
├── Procfile              # Railway start command
├── railway.toml          # Deployment config
├── requirements.txt      # Python dependencies
└── .gitignore
```

## Risk Engine Detail

The engine in `risk_engine.py` evaluates each signal independently and sums the results:

**IP Reputation** — Checks the source IP against a configurable blacklist of known malicious prefixes. In production, this would call an external API like AbuseIPDB.

**New Device** — Queries the `trusted_devices` table for the user's device fingerprint. If the fingerprint has never been verified through MFA for this user, it's flagged. Device trust is earned, not assumed — a device only becomes trusted after a successful OTP verification.

**Impossible Travel** — Uses the haversine formula to calculate the great-circle distance between the current login coordinates and the most recent login with location data. Divides by elapsed time to get required travel speed. If the speed exceeds 1,000 km/h (faster than commercial aviation), the login is flagged.

**Atypical Time** — Calculates the median login hour from the user's last 30 days of successful logins. If the current login hour deviates by more than 3 hours (accounting for midnight wraparound), it's flagged. Requires at least 5 prior logins to establish a baseline.

## Running Locally

```bash
# Clone
git clone https://github.com/ryan-t-ramirez/Adaptive-Auth.git
cd Adaptive-Auth/adaptive-auth

# Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend (optional — dist/ is already committed)
cd frontend
npm install
npm run build
cd ..

# Run
uvicorn app.main:app --reload
# Open http://127.0.0.1:8000
```

## Design Decisions

- **FastAPI over Flask** — Auto-generated OpenAPI docs, Pydantic type validation, async support out of the box
- **Single-service deployment** — FastAPI serves the compiled React frontend from `dist/`, eliminating the need for separate frontend hosting or CORS configuration
- **SQLite for dev, PostgreSQL for prod** — SQLAlchemy abstracts the database layer; switching is a one-line config change
- **OTP hashed before storage** — SHA-256 hashed, same principle as password handling. 6-digit code, 5-minute expiry, 3 attempt limit
- **Device trust is earned** — Trust is only granted after successful MFA verification, not assumed from a cookie or session
- **Risk threshold at 100** — Balanced to require MFA on any new device (+105 alone exceeds threshold) while allowing trusted devices through with password only

## Author

**Ryan Ramirez** — IAM Engineer | [GitHub](https://github.com/ryan-t-ramirez)

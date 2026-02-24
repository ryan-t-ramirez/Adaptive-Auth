from fastapi import FastAPI
from app.database import Base, engine
from app.auth import router as auth_router
from app.demo import router as demo_router

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Adaptive Authentication Framework",
    description="Risk-based authentication with conditional MFA",
    version="1.0.0",
)

app.include_router(auth_router)
app.include_router(demo_router)


@app.get("/")
def root():
    return {"status": "running", "project": "Adaptive Authentication Framework"}

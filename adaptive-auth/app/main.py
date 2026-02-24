from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
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

# Serve React frontend
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"

if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {"status": "running", "project": "Adaptive Authentication Framework"}

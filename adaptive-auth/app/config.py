from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./adaptive_auth.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os

# ===============================
# Load Environment Variables
# ===============================
load_dotenv()

# ===============================
# Database Configuration
# ===============================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost/triage_db"  # Local fallback
)

# Fix for Render / Heroku postgres URL format
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create SQLAlchemy Engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # Prevent stale connection errors
)

# Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# ===============================
# Incident Table Model
# ===============================

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    source_service = Column(String, default="system")
    confidence_score = Column(Float)
    resolved = Column(Integer, default=0)
    timestamp = Column(String)

# ===============================
# Initialize Database
# ===============================

def init_db():
    Base.metadata.create_all(bind=engine)

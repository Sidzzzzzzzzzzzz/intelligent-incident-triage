from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import redis
import joblib
import json
import datetime
import os
import logging
import random

from database import SessionLocal, Incident, init_db

# ===============================
# Load Environment Variables
# ===============================
load_dotenv()

# ===============================
# Logging Setup
# ===============================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ===============================
# App Initialization
# ===============================
app = FastAPI(
    title="OpsGuard API",
    version="1.0.0",
    description="Real-time AI-powered Incident Triage System",
)

# ===============================
# CORS Configuration
# ===============================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",  # preview mode
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===============================
# Load ML Model
# ===============================
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "classifier.pkl")
vectorizer_path = os.path.join(current_dir, "vectorizer.pkl")

try:
    model = joblib.load(model_path)
    vectorizer = joblib.load(vectorizer_path)
    logger.info("✅ ML model loaded successfully.")
except Exception as e:
    logger.error(f"❌ Failed to load ML model: {e}")
    raise RuntimeError("ML model loading failed.")

# ===============================
# Redis Setup
# ===============================
REDIS_URL = os.getenv("REDIS_URL")

try:
    if REDIS_URL:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        logger.info("✅ Connected to Redis (env).")
    else:
        r = redis.Redis(host="localhost", port=6379, decode_responses=True)
        logger.info("⚠️ Connected to local Redis.")
except Exception as e:
    logger.warning(f"Redis unavailable: {e}")
    r = None  # Fail gracefully

# ===============================
# WebSocket Manager
# ===============================
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket connected.")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket disconnected.")

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# ===============================
# Startup Event
# ===============================
@app.on_event("startup")
def startup_event():
    init_db()
    logger.info("✅ Database initialized.")

# ===============================
# Pydantic Model
# ===============================
class LogRequest(BaseModel):
    message: str

# ===============================
# Health Check
# ===============================
@app.get("/health")
def health():
    return {"status": "ok"}

# ===============================
# Predict + Save Incident
# ===============================
@app.post("/api/v1/predict")
async def predict_log(log: LogRequest):

    try:
        # ML Prediction
        text_vector = vectorizer.transform([log.message])
        probs = model.predict_proba(text_vector)[0]
        prediction = model.predict(text_vector)[0]
        confidence = float(max(probs))

    except Exception as e:
        logger.error(f"ML prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")

    # Simulated Source Service
    services = [
        "Auth-Service",
        "Payment-Gateway",
        "Database-Cluster",
        "User-Profile-API",
    ]
    source = random.choice(services)

    db = SessionLocal()
    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    try:
        new_incident = Incident(
            message=log.message,
            priority=prediction,
            timestamp=timestamp,
            source_service=source,
            confidence_score=confidence,
        )

        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)

        response_data = {
            "id": new_incident.id,
            "message": new_incident.message,
            "priority": prediction,
            "confidence": round(confidence, 2),
            "source": source,
            "timestamp": timestamp,
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")

    finally:
        db.close()

    # Redis Cache (Optional)
    if r:
        try:
            r.set("latest_incident", json.dumps(response_data))
        except Exception as e:
            logger.warning(f"Redis caching failed: {e}")

    # Broadcast WebSocket
    await manager.broadcast(json.dumps(response_data))

    return {
        "status": "success",
        "data": response_data,
    }

# ===============================
# Get Recent Logs
# ===============================
@app.get("/api/v1/logs")
def get_logs():

    db = SessionLocal()

    try:
        logs = (
            db.query(Incident)
            .order_by(Incident.id.desc())
            .limit(50)
            .all()
        )

        return [
            {
                "id": log.id,
                "message": log.message,
                "priority": log.priority,
                "timestamp": log.timestamp,
                "source": log.source_service,
                "confidence": log.confidence_score,
            }
            for log in logs
        ]

    except Exception as e:
        logger.error(f"Log retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch logs")

    finally:
        db.close()

# ===============================
# WebSocket Endpoint
# ===============================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

"""API Gateway -- main entry point (port 8000).

Aggregates all microservice routes behind a single origin, applies CORS and
global error handling, and initialises the shared database on startup.
"""

import sys
import os

# Add the backend directory to sys.path so shared modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI

from shared.database import init_db
from shared.logger import get_logger

from gateway.middleware.cors import setup_cors
from gateway.middleware.error_handler import setup_error_handler
from gateway.routes.health import router as health_router
from gateway.routes.chat import router as chat_router
from gateway.routes.files import router as files_router
from gateway.routes.config import router as config_router

logger = get_logger(__name__)

app = FastAPI(
    title="AI Chat Gateway",
    description="Central API gateway for the AI chat application",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
setup_cors(app)
setup_error_handler(app)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health_router)
app.include_router(chat_router)
app.include_router(files_router)
app.include_router(config_router)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("API Gateway started, database initialized")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

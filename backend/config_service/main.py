"""Config Service -- FastAPI application for managing LLM and search provider configurations."""

import sys
import os

# Ensure the shared package (one level up) is importable.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.database import init_db

from .routes.llm_config import router as llm_router
from .routes.search_config import router as search_router

app = FastAPI(
    title="Config Service",
    description="Manages LLM and search provider configurations, including connection testing.",
    version="0.1.0",
)

# ---------------------------------------------------------------------------
# CORS (allow everything for development)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(llm_router, prefix="/api/config")
app.include_router(search_router, prefix="/api/config")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "config-service"}


# ---------------------------------------------------------------------------
# Startup event
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    init_db()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "config_service.main:app",
        host="0.0.0.0",
        port=8005,
        reload=True,
    )

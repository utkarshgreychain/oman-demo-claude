"""Visualization Service -- generates chart images from structured data."""

import sys
import os

# Add the backend directory to sys.path so shared modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from shared.config import get_settings
from shared.logger import get_logger

from viz_service.models.schemas import VizRequest, VizResponse
from viz_service.generators.chart_generator import generate_chart
from viz_service.services.png_exporter import get_chart_path, chart_exists

logger = get_logger(__name__)
settings = get_settings()

app = FastAPI(title="Visualization Service", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    os.makedirs(settings.VIZ_OUTPUT_DIR, exist_ok=True)
    logger.info("Visualization Service started")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "viz_service"}


@app.post("/generate", response_model=VizResponse)
async def generate(request: VizRequest):
    """Generate a chart from the given VizRequest and return metadata + download URL."""
    try:
        viz_id = generate_chart(request)
        download_url = f"{settings.GATEWAY_URL}/api/viz/{viz_id}/download"

        logger.info(f"Generated chart: type={request.chart_type}, viz_id={viz_id}")

        return VizResponse(
            viz_id=viz_id,
            chart_type=request.chart_type,
            title=request.title,
            download_url=download_url,
        )
    except Exception as e:
        logger.error(f"Chart generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chart generation failed: {str(e)}")


@app.get("/download/{viz_id}")
async def download(viz_id: str):
    """Serve a generated chart PNG by viz_id."""
    if not chart_exists(viz_id):
        raise HTTPException(status_code=404, detail="Chart not found")

    chart_path = get_chart_path(viz_id)
    return FileResponse(
        path=chart_path,
        media_type="image/png",
        filename=f"{viz_id}.png",
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)

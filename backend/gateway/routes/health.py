"""Health check endpoint for the API Gateway.

Reports the gateway's own status as well as the reachability of downstream
microservices.
"""

import httpx
from fastapi import APIRouter

from shared.config import get_settings
from shared.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter(tags=["Health"])

# Services to probe (name -> base URL)
SERVICES = {
    "llm_service": settings.LLM_SERVICE_URL,
    "search_service": settings.SEARCH_SERVICE_URL,
    "file_service": settings.FILE_SERVICE_URL,
    "viz_service": settings.VIZ_SERVICE_URL,
    "config_service": settings.CONFIG_SERVICE_URL,
}


async def _check_service(name: str, url: str) -> dict:
    """Probe a single service's /health endpoint."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{url}/health")
            if resp.status_code == 200:
                return {"name": name, "status": "healthy", "url": url}
            return {"name": name, "status": "unhealthy", "url": url, "status_code": resp.status_code}
    except Exception as e:
        return {"name": name, "status": "unreachable", "url": url, "error": str(e)}


@router.get("/health")
async def health():
    """Return gateway health and reachability of all downstream services."""
    service_statuses = []
    for name, url in SERVICES.items():
        status = await _check_service(name, url)
        service_statuses.append(status)

    all_healthy = all(s["status"] == "healthy" for s in service_statuses)

    return {
        "status": "healthy" if all_healthy else "degraded",
        "service": "gateway",
        "services": service_statuses,
    }

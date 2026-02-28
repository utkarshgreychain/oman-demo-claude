"""Global exception handler middleware for the API Gateway."""

import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from shared.logger import get_logger

logger = get_logger(__name__)


def setup_error_handler(app: FastAPI) -> None:
    """Register a global exception handler on the FastAPI application.

    Catches all unhandled exceptions, logs them, and returns a consistent
    JSON error response to the client.

    Args:
        app: The FastAPI application instance.
    """

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled exception on {request.method} {request.url.path}: {str(exc)}\n"
            f"{traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": str(exc),
                "path": str(request.url.path),
            },
        )

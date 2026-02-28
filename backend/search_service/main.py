import sys
import os

# Add the backend directory to sys.path so shared modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from search_service.models.schemas import SearchRequest, SearchResponse
from search_service.providers.tavily_provider import TavilyProvider
from search_service.providers.serper_provider import SerperProvider
from search_service.providers.brave_provider import BraveProvider
from shared.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Search Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Provider registry
PROVIDERS = {
    "tavily": TavilyProvider(),
    "serper": SerperProvider(),
    "brave": BraveProvider(),
}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "search_service"}


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Execute a web search using the specified provider."""
    provider = PROVIDERS.get(request.provider)
    if not provider:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported search provider: {request.provider}. "
            f"Supported providers: {list(PROVIDERS.keys())}",
        )

    try:
        results = await provider.search(
            query=request.query,
            api_key=request.api_key,
            max_results=request.max_results,
        )
        logger.info(
            f"Search completed: provider={request.provider}, "
            f"query='{request.query}', results={len(results)}"
        )
        return SearchResponse(results=results, provider=request.provider)
    except Exception as e:
        logger.error(f"Search failed: provider={request.provider}, error={str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)

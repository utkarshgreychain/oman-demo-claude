import httpx

from search_service.models.schemas import SearchResult
from search_service.providers.base import BaseSearchProvider


class TavilyProvider(BaseSearchProvider):
    """Search provider using Tavily API."""

    BASE_URL = "https://api.tavily.com/search"

    async def search(
        self, query: str, api_key: str, max_results: int = 5
    ) -> list[SearchResult]:
        """Execute a search using Tavily API.

        Args:
            query: The search query string.
            api_key: The Tavily API key.
            max_results: Maximum number of results to return.

        Returns:
            A list of SearchResult objects.
        """
        payload = {
            "api_key": api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.BASE_URL, json=payload)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("results", []):
            results.append(
                SearchResult(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    snippet=item.get("content", ""),
                )
            )

        return results

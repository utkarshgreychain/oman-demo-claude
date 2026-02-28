import httpx

from search_service.models.schemas import SearchResult
from search_service.providers.base import BaseSearchProvider


class SerperProvider(BaseSearchProvider):
    """Search provider using Serper (Google Search) API."""

    BASE_URL = "https://google.serper.dev/search"

    async def search(
        self, query: str, api_key: str, max_results: int = 5
    ) -> list[SearchResult]:
        """Execute a search using Serper API.

        Args:
            query: The search query string.
            api_key: The Serper API key.
            max_results: Maximum number of results to return.

        Returns:
            A list of SearchResult objects.
        """
        headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "q": query,
            "num": max_results,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.BASE_URL, json=payload, headers=headers
            )
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("organic", []):
            results.append(
                SearchResult(
                    title=item.get("title", ""),
                    url=item.get("link", ""),
                    snippet=item.get("snippet", ""),
                )
            )

        return results

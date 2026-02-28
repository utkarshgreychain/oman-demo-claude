import httpx

from search_service.models.schemas import SearchResult
from search_service.providers.base import BaseSearchProvider


class BraveProvider(BaseSearchProvider):
    """Search provider using Brave Search API."""

    BASE_URL = "https://api.search.brave.com/res/v1/web/search"

    async def search(
        self, query: str, api_key: str, max_results: int = 5
    ) -> list[SearchResult]:
        """Execute a search using Brave Search API.

        Args:
            query: The search query string.
            api_key: The Brave Search subscription token.
            max_results: Maximum number of results to return.

        Returns:
            A list of SearchResult objects.
        """
        headers = {
            "X-Subscription-Token": api_key,
            "Accept": "application/json",
        }
        params = {
            "q": query,
            "count": max_results,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                self.BASE_URL, headers=headers, params=params
            )
            response.raise_for_status()
            data = response.json()

        results = []
        web_results = data.get("web", {}).get("results", [])
        for item in web_results:
            results.append(
                SearchResult(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    snippet=item.get("description", ""),
                )
            )

        return results

from abc import ABC, abstractmethod
from search_service.models.schemas import SearchResult


class BaseSearchProvider(ABC):
    """Abstract base class for search providers."""

    @abstractmethod
    async def search(
        self, query: str, api_key: str, max_results: int = 5
    ) -> list[SearchResult]:
        """Execute a search query and return results.

        Args:
            query: The search query string.
            api_key: The API key for the provider.
            max_results: Maximum number of results to return.

        Returns:
            A list of SearchResult objects.
        """
        pass

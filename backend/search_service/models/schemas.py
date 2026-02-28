from pydantic import BaseModel
from typing import Optional


class SearchRequest(BaseModel):
    query: str
    provider: str  # "tavily", "serper", "brave"
    api_key: str
    max_results: int = 5


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str


class SearchResponse(BaseModel):
    results: list[SearchResult]
    provider: str

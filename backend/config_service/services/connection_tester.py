"""Connection testing logic for LLM and search providers."""

import httpx

from ..models.schemas import TestConnectionRequest, TestConnectionResponse

TIMEOUT = 10.0  # seconds


# ---------------------------------------------------------------------------
# Individual provider testers
# ---------------------------------------------------------------------------

async def _test_openai(api_key: str, base_url: str | None = None, **_kwargs) -> TestConnectionResponse:
    """Test OpenAI connection by listing available models."""
    url = f"{base_url}/v1/models" if base_url else "https://api.openai.com/v1/models"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"})
        resp.raise_for_status()
        data = resp.json()
        model_ids = [m["id"] for m in data.get("data", [])]
        return TestConnectionResponse(success=True, models=sorted(model_ids))


async def _test_anthropic(api_key: str, **_kwargs) -> TestConnectionResponse:
    """Test Anthropic connection by sending a tiny messages request."""
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1,
        "messages": [{"role": "user", "content": "Hi"}],
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        return TestConnectionResponse(
            success=True,
            models=[
                "claude-sonnet-4-20250514",
                "claude-opus-4-20250514",
                "claude-haiku-35-20241022",
            ],
        )


async def _test_google(api_key: str, model: str | None = None, **_kwargs) -> TestConnectionResponse:
    """Test Google Gemini connection by sending a tiny generateContent request."""
    model_name = model or "gemini-2.0-flash"
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}"
        f":generateContent?key={api_key}"
    )
    body = {"contents": [{"parts": [{"text": "Hi"}]}]}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, json=body)
        resp.raise_for_status()
        return TestConnectionResponse(
            success=True,
            models=[
                "gemini-2.5-pro",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-2.0-flash-lite",
            ],
        )


async def _test_groq(api_key: str, **_kwargs) -> TestConnectionResponse:
    """Test Groq connection by listing available models."""
    url = "https://api.groq.com/openai/v1/models"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"})
        resp.raise_for_status()
        data = resp.json()
        model_ids = [m["id"] for m in data.get("data", [])]
        return TestConnectionResponse(success=True, models=sorted(model_ids))


async def _test_ollama(base_url: str | None = None, **_kwargs) -> TestConnectionResponse:
    """Test Ollama connection by listing local models."""
    url = f"{base_url or 'http://localhost:11434'}/api/tags"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        model_names = [m["name"] for m in data.get("models", [])]
        return TestConnectionResponse(success=True, models=sorted(model_names))


async def _test_tavily(api_key: str, **_kwargs) -> TestConnectionResponse:
    """Test Tavily search connection."""
    url = "https://api.tavily.com/search"
    body = {"api_key": api_key, "query": "test", "max_results": 1}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, json=body)
        resp.raise_for_status()
        return TestConnectionResponse(success=True)


async def _test_serper(api_key: str, **_kwargs) -> TestConnectionResponse:
    """Test Serper search connection."""
    url = "https://google.serper.dev/search"
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    body = {"q": "test"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(url, json=body, headers=headers)
        resp.raise_for_status()
        return TestConnectionResponse(success=True)


async def _test_brave(api_key: str, **_kwargs) -> TestConnectionResponse:
    """Test Brave Search connection."""
    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {"X-Subscription-Token": api_key, "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, params={"q": "test"}, headers=headers)
        resp.raise_for_status()
        return TestConnectionResponse(success=True)


# ---------------------------------------------------------------------------
# Registry & main entry point
# ---------------------------------------------------------------------------

_TESTERS = {
    "openai": _test_openai,
    "anthropic": _test_anthropic,
    "google": _test_google,
    "gemini": _test_google,
    "groq": _test_groq,
    "ollama": _test_ollama,
    "tavily": _test_tavily,
    "serper": _test_serper,
    "brave": _test_brave,
}


async def test_connection(request: TestConnectionRequest) -> TestConnectionResponse:
    """Test a provider connection without persisting anything.

    Routes to the appropriate provider-specific tester based on ``request.name``.
    """
    provider_name = request.name.lower()
    tester = _TESTERS.get(provider_name)
    if tester is None:
        return TestConnectionResponse(
            success=False,
            error=f"Unknown provider: {request.name}. Supported: {', '.join(_TESTERS.keys())}",
        )

    try:
        return await tester(
            api_key=request.api_key,
            base_url=request.base_url,
            model=request.model,
        )
    except httpx.HTTPStatusError as exc:
        return TestConnectionResponse(
            success=False,
            error=f"HTTP {exc.response.status_code}: {exc.response.text[:300]}",
        )
    except httpx.ConnectError:
        return TestConnectionResponse(
            success=False,
            error=f"Connection refused – is {request.name} reachable?",
        )
    except httpx.TimeoutException:
        return TestConnectionResponse(
            success=False,
            error=f"Connection to {request.name} timed out after {TIMEOUT}s",
        )
    except Exception as exc:  # noqa: BLE001
        return TestConnectionResponse(success=False, error=str(exc))

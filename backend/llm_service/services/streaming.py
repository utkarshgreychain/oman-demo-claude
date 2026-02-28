from typing import AsyncGenerator

from ..models.schemas import LLMRequest
from ..providers.base import BaseLLMProvider
from ..providers.openai_provider import OpenAIProvider
from ..providers.anthropic_provider import AnthropicProvider
from ..providers.google_provider import GoogleProvider
from ..providers.groq_provider import GroqProvider
from ..providers.ollama_provider import OllamaProvider


PROVIDER_MAP: dict[str, type[BaseLLMProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "google": GoogleProvider,
    "groq": GroqProvider,
    "ollama": OllamaProvider,
}


def get_provider(request: LLMRequest) -> BaseLLMProvider:
    """Instantiate the correct LLM provider based on the request."""
    provider_cls = PROVIDER_MAP.get(request.provider)
    if provider_cls is None:
        raise ValueError(
            f"Unsupported provider: {request.provider}. "
            f"Supported: {', '.join(PROVIDER_MAP.keys())}"
        )
    return provider_cls(api_key=request.api_key, base_url=request.base_url)


async def stream_llm_response(request: LLMRequest) -> AsyncGenerator[str, None]:
    """Stream LLM response chunks for the given request."""
    provider = get_provider(request)
    async for chunk in provider.stream(
        messages=request.messages,
        model=request.model,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    ):
        yield chunk

from pydantic import BaseModel
from typing import Optional


class LLMRequest(BaseModel):
    provider: str  # "openai", "anthropic", "google", "groq", "ollama"
    model: str
    messages: list[dict]  # [{"role": "user"|"assistant"|"system", "content": "..."}]
    temperature: float = 0.7
    max_tokens: int = 4096
    api_key: str
    base_url: Optional[str] = None


class LLMStreamChunk(BaseModel):
    content: str
    done: bool = False

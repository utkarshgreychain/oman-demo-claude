import asyncio
from functools import partial
from typing import AsyncGenerator

import google.generativeai as genai

from .base import BaseLLMProvider


class GoogleProvider(BaseLLMProvider):
    def __init__(self, api_key: str, base_url: str | None = None):
        genai.configure(api_key=api_key)
        self.api_key = api_key

    def _build_contents(self, messages: list[dict]) -> list[dict]:
        """Convert OpenAI-style messages to Gemini content format."""
        contents: list[dict] = []
        for msg in messages:
            role = msg.get("role", "user")
            # Gemini uses "user" and "model" roles; map accordingly
            if role == "system":
                # Prepend system text as a user message so the model sees it
                contents.append({"role": "user", "parts": [msg["content"]]})
            elif role == "assistant":
                contents.append({"role": "model", "parts": [msg["content"]]})
            else:
                contents.append({"role": "user", "parts": [msg["content"]]})
        return contents

    def _sync_stream(
        self,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> list[str]:
        """Run synchronous streaming in a thread and collect chunks."""
        gen_model = genai.GenerativeModel(model)
        contents = self._build_contents(messages)
        generation_config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        response = gen_model.generate_content(
            contents,
            generation_config=generation_config,
            stream=True,
        )
        chunks: list[str] = []
        for chunk in response:
            if chunk.text:
                chunks.append(chunk.text)
        return chunks

    async def stream(
        self,
        messages: list[dict],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        loop = asyncio.get_event_loop()
        chunks = await loop.run_in_executor(
            None,
            partial(self._sync_stream, messages, model, temperature, max_tokens),
        )
        for chunk in chunks:
            yield chunk

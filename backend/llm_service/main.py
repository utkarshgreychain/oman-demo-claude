import json
import sys
import os
import traceback

# Add the backend directory to sys.path so shared modules can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from llm_service.models.schemas import LLMRequest, LLMStreamChunk
from llm_service.services.streaming import stream_llm_response

app = FastAPI(title="LLM Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "llm_service"}


@app.post("/stream")
async def stream(request: LLMRequest):
    """Stream LLM responses as Server-Sent Events."""

    async def event_generator():
        try:
            async for chunk in stream_llm_response(request):
                sse_chunk = LLMStreamChunk(content=chunk, done=False)
                yield f"data: {sse_chunk.model_dump_json()}\n\n"
            # Send final done signal
            done_chunk = LLMStreamChunk(content="", done=True)
            yield f"data: {done_chunk.model_dump_json()}\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)

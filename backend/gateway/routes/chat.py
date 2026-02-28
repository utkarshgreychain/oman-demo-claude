"""Chat streaming endpoint and conversation management routes.

This is the main SSE chat route for the API Gateway.  It orchestrates calls to
config_service, file_service, search_service, llm_service, and viz_service to
produce a streaming response with inline visualization support.
"""

import json
import re
import uuid

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from shared.config import get_settings
from shared.database import SessionLocal
from shared.encryption import decrypt_api_key
from shared.models import LLMProvider, SearchProvider, Conversation, Message, UploadedFile
from shared.logger import get_logger

from llm_service.services.context_builder import build_messages
from viz_service.models.schemas import VizRequest
from viz_service.generators.chart_generator import generate_chart

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter(tags=["Chat"])


# ---------------------------------------------------------------------------
# Request / helper schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    provider: str
    model: str
    file_ids: list[str] = []
    web_search_enabled: bool = False
    search_provider: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 4096


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_provider_api_key(db: Session, provider_name: str) -> tuple[str, Optional[str]]:
    """Look up an LLM provider by name, decrypt and return (api_key, base_url)."""
    provider = db.query(LLMProvider).filter(LLMProvider.name == provider_name).first()
    if not provider:
        raise HTTPException(status_code=404, detail=f"LLM provider '{provider_name}' not configured")
    api_key = decrypt_api_key(provider.api_key_encrypted)
    return api_key, provider.base_url


def _get_search_api_key(db: Session, provider_name: str) -> str:
    """Look up a search provider by name, decrypt and return api_key."""
    provider = db.query(SearchProvider).filter(SearchProvider.name == provider_name).first()
    if not provider:
        raise HTTPException(status_code=404, detail=f"Search provider '{provider_name}' not configured")
    return decrypt_api_key(provider.api_key_encrypted)


# Max characters of file content to include in LLM context per file.
# ~50K chars ≈ 12-15K tokens, leaving room for system prompt + conversation.
MAX_FILE_CONTENT_CHARS = 50_000


def _fetch_file_contents(db: Session, file_ids: list[str]) -> list[dict]:
    """Look up uploaded files by ID and return their parsed content.

    Large files are truncated to MAX_FILE_CONTENT_CHARS to stay within LLM
    context limits.
    """
    results = []
    for file_id in file_ids:
        f = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if f and f.parsed_content:
            content = f.parsed_content
            if len(content) > MAX_FILE_CONTENT_CHARS:
                content = content[:MAX_FILE_CONTENT_CHARS] + (
                    f"\n\n... [Content truncated — showing first {MAX_FILE_CONTENT_CHARS:,} "
                    f"of {len(f.parsed_content):,} characters. Ask about specific sections "
                    f"for more detail.]"
                )
            results.append({"filename": f.filename, "content": content})
        elif f:
            logger.warning(f"File '{f.filename}' ({file_id}) has no parsed content")
        else:
            logger.warning(f"File not found: {file_id}")
    return results


async def _do_web_search(query: str, provider_name: str, api_key: str) -> tuple[list[dict], Optional[str]]:
    """Call search_service POST /search and return (results, error_msg)."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.SEARCH_SERVICE_URL}/search",
                json={
                    "query": query,
                    "provider": provider_name,
                    "api_key": api_key,
                    "max_results": 5,
                },
            )
        if resp.status_code == 200:
            data = resp.json()
            return data.get("results", []), None
        else:
            detail = ""
            try:
                detail = resp.json().get("detail", resp.text[:200])
            except Exception:
                detail = resp.text[:200]
            logger.error(f"Web search failed ({resp.status_code}): {detail}")
            return [], f"Search failed: {detail}"
    except Exception as e:
        logger.error(f"Web search failed: {str(e)}")
        return [], f"Search unavailable: {str(e)}"


def _generate_visualization_local(viz_json: dict) -> Optional[dict]:
    """Generate a visualization chart locally using matplotlib.

    Returns a dict matching VizResponse schema, or None on failure.
    """
    try:
        viz_request = VizRequest(**viz_json)
        viz_id = generate_chart(viz_request)
        return {
            "viz_id": viz_id,
            "chart_type": viz_request.chart_type,
            "title": viz_request.title,
            "download_url": f"/api/viz/{viz_id}/download",
        }
    except Exception as e:
        logger.error(f"Visualization generation failed: {str(e)}")
    return None


def _get_conversation_history(db: Session, conversation_id: str, limit: int = 20) -> list[dict]:
    """Fetch recent messages from a conversation for context."""
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]


VIZ_BLOCK_RE = re.compile(r"```visualization\s*\n(.*?)\n```", re.DOTALL)


# ---------------------------------------------------------------------------
# SSE Chat Stream
# ---------------------------------------------------------------------------

def _emit_progress(step: str, label: str, status: str, detail: str = "") -> str:
    """Format a progress SSE event."""
    payload: dict = {"type": "progress", "step": step, "label": label, "status": status}
    if detail:
        payload["detail"] = detail
    return f"event: progress\ndata: {json.dumps(payload)}\n\n"


@router.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream an LLM response as Server-Sent Events.

    Orchestration flow — all steps happen inside the generator so we can
    emit real-time progress events as each step completes.
    """

    # Pre-resolve credentials (fast, synchronous) so errors surface before streaming.
    db: Session = SessionLocal()
    try:
        api_key, base_url = _get_provider_api_key(db, request.provider)

        search_api_key: Optional[str] = None
        if request.web_search_enabled and request.search_provider:
            search_api_key = _get_search_api_key(db, request.search_provider)

        # Conversation history & conversation creation (keep outside generator
        # so conversation_id is available for the user message save).
        conversation_history: list[dict] = []
        if request.conversation_id:
            conversation_history = _get_conversation_history(db, request.conversation_id)

        if request.conversation_id:
            conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            title = request.message[:80] + ("..." if len(request.message) > 80 else "")
            conversation = Conversation(title=title)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        conversation_id = conversation.id
    finally:
        db.close()

    # -----------------------------------------------------------------------
    # SSE Generator — orchestration + streaming
    # -----------------------------------------------------------------------
    async def event_generator():
        full_response = ""
        visualizations: list[dict] = []
        file_contents: list[dict] = []
        search_results: list[dict] = []

        try:
            # --- Step 1: Read uploaded files ---
            if request.file_ids:
                yield _emit_progress("reading_files", "Reading uploaded files...", "in_progress")

                db_files: Session = SessionLocal()
                try:
                    file_contents = _fetch_file_contents(db_files, request.file_ids)
                finally:
                    db_files.close()

                yield _emit_progress(
                    "reading_files", "Reading uploaded files...", "completed",
                    detail=f"{len(file_contents)} file(s) loaded",
                )

                if file_contents:
                    filenames = ", ".join(fc["filename"] for fc in file_contents)
                    yield _emit_progress(
                        "analyzing_files", "Analyzing file data...", "completed",
                        detail=filenames,
                    )

            # --- Step 2: Web search ---
            if request.web_search_enabled and request.search_provider and search_api_key:
                yield _emit_progress("searching_web", "Searching the web...", "in_progress")

                search_results, search_error = await _do_web_search(
                    request.message, request.search_provider, search_api_key,
                )

                if search_error:
                    yield _emit_progress(
                        "searching_web", "Web search failed", "completed",
                        detail=search_error,
                    )
                elif search_results:
                    yield _emit_progress(
                        "searching_web",
                        f"Found {len(search_results)} result{'s' if len(search_results) != 1 else ''}",
                        "completed",
                    )
                    sr_event = json.dumps({"type": "search_results", "results": search_results})
                    yield f"event: search_results\ndata: {sr_event}\n\n"
                else:
                    yield _emit_progress(
                        "searching_web", "No results found", "completed",
                    )

            # --- Step 3: Build context & save user message ---
            messages = build_messages(
                user_message=request.message,
                file_contents=file_contents or None,
                search_results=search_results or None,
                conversation_history=conversation_history or None,
            )

            db_msg: Session = SessionLocal()
            try:
                user_msg = Message(
                    conversation_id=conversation_id,
                    role="user",
                    content=request.message,
                    provider=request.provider,
                    model=request.model,
                    file_ids=request.file_ids,
                    search_results=search_results,
                )
                db_msg.add(user_msg)
                db_msg.commit()
            finally:
                db_msg.close()

            # --- Step 4: Stream from LLM ---
            yield _emit_progress("generating", "Generating response...", "in_progress")

            async with httpx.AsyncClient(timeout=120.0) as client:
                llm_request_body = {
                    "provider": request.provider,
                    "model": request.model,
                    "messages": messages,
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens,
                    "api_key": api_key,
                    "base_url": base_url,
                }

                async with client.stream(
                    "POST",
                    f"{settings.LLM_SERVICE_URL}/stream",
                    json=llm_request_body,
                    headers={"Accept": "text/event-stream"},
                ) as resp:
                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[len("data: "):]
                        try:
                            chunk_data = json.loads(raw)
                        except json.JSONDecodeError:
                            continue

                        if chunk_data.get("error"):
                            error_event = json.dumps({"type": "error", "message": chunk_data["error"]})
                            yield f"event: error\ndata: {error_event}\n\n"
                            return

                        content = chunk_data.get("content", "")
                        done = chunk_data.get("done", False)

                        if done:
                            break

                        if content:
                            full_response += content
                            token_event = json.dumps({"type": "token", "content": content})
                            yield f"event: token\ndata: {token_event}\n\n"

            yield _emit_progress("generating", "Generating response...", "completed")

            # --- Step 5: Visualization blocks ---
            viz_matches = VIZ_BLOCK_RE.findall(full_response)
            if viz_matches:
                yield _emit_progress("creating_visualization", "Creating visualization...", "in_progress")

            for viz_raw in viz_matches:
                try:
                    viz_json = json.loads(viz_raw)
                    viz_result = _generate_visualization_local(viz_json)
                    if viz_result:
                        visualizations.append(viz_result)
                        viz_event = json.dumps({"type": "visualization", **viz_result})
                        yield f"event: visualization\ndata: {viz_event}\n\n"
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse visualization JSON: {viz_raw[:200]}")

            if viz_matches:
                yield _emit_progress("creating_visualization", "Creating visualization...", "completed")

            # --- Step 6: Save assistant message ---
            db2: Session = SessionLocal()
            try:
                assistant_msg = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_response,
                    provider=request.provider,
                    model=request.model,
                    visualizations=[v for v in visualizations],
                )
                db2.add(assistant_msg)
                db2.commit()
                db2.refresh(assistant_msg)
                message_id = assistant_msg.id
            finally:
                db2.close()

            # --- Done ---
            done_event = json.dumps({
                "type": "done",
                "conversation_id": conversation_id,
                "message_id": message_id,
                "file_sources": [{"filename": fc["filename"]} for fc in file_contents],
            })
            yield f"event: done\ndata: {done_event}\n\n"

        except Exception as e:
            logger.error(f"Chat stream error: {str(e)}")
            error_event = json.dumps({"type": "error", "message": str(e)})
            yield f"event: error\ndata: {error_event}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Conversation CRUD
# ---------------------------------------------------------------------------

@router.get("/api/conversations")
async def list_conversations():
    """List all conversations, most recent first."""
    db: Session = SessionLocal()
    try:
        conversations = (
            db.query(Conversation)
            .order_by(Conversation.updated_at.desc())
            .all()
        )
        return [
            {
                "id": c.id,
                "title": c.title,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in conversations
        ]
    finally:
        db.close()


@router.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a conversation with all its messages."""
    db: Session = SessionLocal()
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        messages = (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .all()
        )

        return {
            "id": conversation.id,
            "title": conversation.title,
            "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
            "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "provider": m.provider,
                    "model": m.model,
                    "file_ids": m.file_ids,
                    "search_results": m.search_results,
                    "visualizations": m.visualizations,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
        }
    finally:
        db.close()


@router.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation and all its messages."""
    db: Session = SessionLocal()
    try:
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Delete messages first
        db.query(Message).filter(Message.conversation_id == conversation_id).delete()
        db.delete(conversation)
        db.commit()

        return {"message": "Conversation deleted successfully", "conversation_id": conversation_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Viz download (local file serving)
# ---------------------------------------------------------------------------

@router.get("/api/viz/{viz_id}/download")
async def download_viz(viz_id: str):
    """Serve a generated visualization chart PNG from local storage."""
    import os
    from fastapi.responses import FileResponse

    file_path = os.path.join(settings.VIZ_OUTPUT_DIR, f"{viz_id}.png")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Chart not found")

    return FileResponse(
        path=file_path,
        media_type="image/png",
        filename=f"{viz_id}.png",
    )

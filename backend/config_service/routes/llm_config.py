"""Routes for managing LLM provider configurations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.encryption import encrypt_api_key, decrypt_api_key
from shared.models import LLMProvider

from ..models.schemas import (
    LLMProviderCreate,
    LLMProviderUpdate,
    LLMProviderResponse,
    TestConnectionRequest,
    TestConnectionResponse,
)
from ..services.connection_tester import test_connection

router = APIRouter(prefix="/llm-providers", tags=["LLM Providers"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _provider_to_response(provider: LLMProvider) -> LLMProviderResponse:
    """Convert an ORM LLMProvider to a response schema (api_key excluded)."""
    return LLMProviderResponse(
        id=provider.id,
        name=provider.name,
        display_name=provider.display_name,
        base_url=provider.base_url,
        models=provider.models or [],
        is_active=provider.is_active,
        is_default=provider.is_default,
        created_at=provider.created_at,
        updated_at=provider.updated_at,
        connection_status=provider.connection_status,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[LLMProviderResponse])
def list_llm_providers(db: Session = Depends(get_db)):
    """Return all LLM providers."""
    providers = db.query(LLMProvider).all()
    return [_provider_to_response(p) for p in providers]


@router.post("/", response_model=LLMProviderResponse, status_code=201)
def create_llm_provider(payload: LLMProviderCreate, db: Session = Depends(get_db)):
    """Create a new LLM provider configuration."""
    existing = db.query(LLMProvider).filter(LLMProvider.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Provider '{payload.name}' already exists")

    # If this is set as default, clear other defaults first
    if payload.is_default:
        db.query(LLMProvider).filter(LLMProvider.is_default == True).update(  # noqa: E712
            {"is_default": False}
        )

    provider = LLMProvider(
        name=payload.name,
        display_name=payload.display_name,
        api_key_encrypted=encrypt_api_key(payload.api_key),
        base_url=payload.base_url,
        models=payload.models or [],
        is_default=payload.is_default,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return _provider_to_response(provider)


@router.put("/{provider_id}", response_model=LLMProviderResponse)
def update_llm_provider(
    provider_id: str,
    payload: LLMProviderUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing LLM provider."""
    provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="LLM provider not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Encrypt api_key when provided
    if "api_key" in update_data:
        update_data["api_key_encrypted"] = encrypt_api_key(update_data.pop("api_key"))

    # If setting as default, clear other defaults first
    if update_data.get("is_default"):
        db.query(LLMProvider).filter(
            LLMProvider.is_default == True,  # noqa: E712
            LLMProvider.id != provider_id,
        ).update({"is_default": False})

    for field, value in update_data.items():
        setattr(provider, field, value)

    db.commit()
    db.refresh(provider)
    return _provider_to_response(provider)


@router.delete("/{provider_id}", status_code=204)
def delete_llm_provider(provider_id: str, db: Session = Depends(get_db)):
    """Delete an LLM provider."""
    provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="LLM provider not found")
    db.delete(provider)
    db.commit()


@router.post("/test", response_model=TestConnectionResponse)
async def test_llm_connection(payload: TestConnectionRequest):
    """Test a connection to an LLM provider without saving anything."""
    return await test_connection(payload)


@router.get("/{provider_id}/models", response_model=list[str])
async def fetch_provider_models(provider_id: str, db: Session = Depends(get_db)):
    """Fetch available models for a saved LLM provider by testing its connection."""
    provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="LLM provider not found")

    decrypted_key = decrypt_api_key(provider.api_key_encrypted)
    request = TestConnectionRequest(
        name=provider.name,
        api_key=decrypted_key,
        base_url=provider.base_url,
    )
    result = await test_connection(request)

    if not result.success:
        raise HTTPException(status_code=502, detail=result.error or "Connection failed")

    # Persist discovered models and update connection status
    if result.models:
        provider.models = result.models
    provider.connection_status = "connected"
    db.commit()

    return result.models or []

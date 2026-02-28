"""Routes for managing search provider configurations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.encryption import encrypt_api_key, decrypt_api_key
from shared.models import SearchProvider

from ..models.schemas import (
    SearchProviderCreate,
    SearchProviderUpdate,
    SearchProviderResponse,
    TestConnectionRequest,
    TestConnectionResponse,
)
from ..services.connection_tester import test_connection

router = APIRouter(prefix="/search-providers", tags=["Search Providers"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _provider_to_response(provider: SearchProvider) -> SearchProviderResponse:
    """Convert an ORM SearchProvider to a response schema (api_key excluded)."""
    return SearchProviderResponse(
        id=provider.id,
        name=provider.name,
        display_name=provider.display_name,
        is_active=provider.is_active,
        is_default=provider.is_default,
        created_at=provider.created_at,
        connection_status=provider.connection_status,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[SearchProviderResponse])
def list_search_providers(db: Session = Depends(get_db)):
    """Return all search providers."""
    providers = db.query(SearchProvider).all()
    return [_provider_to_response(p) for p in providers]


@router.post("/", response_model=SearchProviderResponse, status_code=201)
def create_search_provider(payload: SearchProviderCreate, db: Session = Depends(get_db)):
    """Create a new search provider configuration."""
    existing = db.query(SearchProvider).filter(SearchProvider.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Provider '{payload.name}' already exists")

    # If this is set as default, clear other defaults first
    if payload.is_default:
        db.query(SearchProvider).filter(SearchProvider.is_default == True).update(  # noqa: E712
            {"is_default": False}
        )

    provider = SearchProvider(
        name=payload.name,
        display_name=payload.display_name,
        api_key_encrypted=encrypt_api_key(payload.api_key),
        is_default=payload.is_default,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return _provider_to_response(provider)


@router.put("/{provider_id}", response_model=SearchProviderResponse)
def update_search_provider(
    provider_id: str,
    payload: SearchProviderUpdate,
    db: Session = Depends(get_db),
):
    """Update an existing search provider."""
    provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Search provider not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Encrypt api_key when provided
    if "api_key" in update_data:
        update_data["api_key_encrypted"] = encrypt_api_key(update_data.pop("api_key"))

    # If setting as default, clear other defaults first
    if update_data.get("is_default"):
        db.query(SearchProvider).filter(
            SearchProvider.is_default == True,  # noqa: E712
            SearchProvider.id != provider_id,
        ).update({"is_default": False})

    for field, value in update_data.items():
        setattr(provider, field, value)

    db.commit()
    db.refresh(provider)
    return _provider_to_response(provider)


@router.delete("/{provider_id}", status_code=204)
def delete_search_provider(provider_id: str, db: Session = Depends(get_db)):
    """Delete a search provider."""
    provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Search provider not found")
    db.delete(provider)
    db.commit()


@router.post("/test", response_model=TestConnectionResponse)
async def test_search_connection(payload: TestConnectionRequest):
    """Test a connection to a search provider without saving anything."""
    return await test_connection(payload)

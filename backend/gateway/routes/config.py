"""Config routes -- handles LLM and search provider CRUD directly via the shared database.

For local development, the gateway handles config operations directly instead
of proxying to a separate config_service.  This removes the requirement to run
config_service as a standalone process during development.
"""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from shared.config import get_settings
from shared.database import SessionLocal
from shared.encryption import encrypt_api_key, decrypt_api_key
from shared.models import LLMProvider, SearchProvider
from shared.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/config", tags=["Config"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class LLMProviderCreate(BaseModel):
    name: str
    display_name: str
    api_key: str
    base_url: Optional[str] = None
    models: Optional[list[str]] = None
    is_default: bool = False

class LLMProviderUpdate(BaseModel):
    display_name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    models: Optional[list[str]] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

class SearchProviderCreate(BaseModel):
    name: str
    display_name: str
    api_key: str
    is_default: bool = False

class SearchProviderUpdate(BaseModel):
    display_name: Optional[str] = None
    api_key: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

class TestConnectionRequest(BaseModel):
    name: str
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None


def _provider_to_dict(p: LLMProvider) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "display_name": p.display_name,
        "base_url": p.base_url,
        "models": p.models or [],
        "is_active": p.is_active,
        "is_default": p.is_default,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        "connection_status": p.connection_status,
    }


def _search_provider_to_dict(p: SearchProvider) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "display_name": p.display_name,
        "is_active": p.is_active,
        "is_default": p.is_default,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "connection_status": p.connection_status,
    }


# ---------------------------------------------------------------------------
# LLM providers
# ---------------------------------------------------------------------------

@router.get("/llm-providers")
async def list_llm_providers():
    db: Session = SessionLocal()
    try:
        providers = db.query(LLMProvider).all()
        return [_provider_to_dict(p) for p in providers]
    finally:
        db.close()


@router.post("/llm-providers")
async def create_llm_provider(data: LLMProviderCreate):
    db: Session = SessionLocal()
    try:
        # Check for duplicate name
        existing = db.query(LLMProvider).filter(LLMProvider.name == data.name).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"LLM provider '{data.name}' already exists")

        # Clear other defaults if this is set as default
        if data.is_default:
            db.query(LLMProvider).filter(LLMProvider.is_default == True).update({"is_default": False})

        now = datetime.now(timezone.utc)
        provider = LLMProvider(
            name=data.name,
            display_name=data.display_name,
            api_key_encrypted=encrypt_api_key(data.api_key),
            base_url=data.base_url,
            models=data.models or [],
            is_default=data.is_default,
            is_active=True,
            connection_status="connected",
            created_at=now,
            updated_at=now,
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)
        return _provider_to_dict(provider)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to create LLM provider: {exc}")
        raise HTTPException(status_code=500, detail="Failed to create LLM provider")
    finally:
        db.close()


@router.put("/llm-providers/{provider_id}")
async def update_llm_provider(provider_id: str, data: LLMProviderUpdate):
    db: Session = SessionLocal()
    try:
        provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")

        if data.is_default:
            db.query(LLMProvider).filter(LLMProvider.is_default == True, LLMProvider.id != provider_id).update({"is_default": False})

        update_data = data.model_dump(exclude_unset=True)
        if "api_key" in update_data and update_data["api_key"]:
            update_data["api_key_encrypted"] = encrypt_api_key(update_data.pop("api_key"))
        else:
            update_data.pop("api_key", None)

        for key, value in update_data.items():
            setattr(provider, key, value)
        provider.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(provider)
        return _provider_to_dict(provider)
    finally:
        db.close()


@router.delete("/llm-providers/{provider_id}")
async def delete_llm_provider(provider_id: str):
    db: Session = SessionLocal()
    try:
        provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        db.delete(provider)
        db.commit()
        return {"message": "Provider deleted"}
    finally:
        db.close()


@router.post("/llm-providers/test")
async def test_llm_connection(data: TestConnectionRequest):
    from config_service.services.connection_tester import test_connection
    result = await test_connection(data)
    return {"success": result.success, "error": result.error, "models": result.models}


@router.get("/llm-providers/{provider_id}/models")
async def fetch_provider_models(provider_id: str):
    db: Session = SessionLocal()
    try:
        provider = db.query(LLMProvider).filter(LLMProvider.id == provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        api_key = decrypt_api_key(provider.api_key_encrypted)

        from config_service.services.connection_tester import test_connection
        from config_service.models.schemas import TestConnectionRequest as TCR
        result = await test_connection(TCR(name=provider.name, api_key=api_key, base_url=provider.base_url))
        if result.success and result.models:
            provider.models = result.models
            provider.connection_status = "connected"
            db.commit()
        return {"models": result.models or provider.models or []}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Search providers
# ---------------------------------------------------------------------------

@router.get("/search-providers")
async def list_search_providers():
    db: Session = SessionLocal()
    try:
        providers = db.query(SearchProvider).all()
        return [_search_provider_to_dict(p) for p in providers]
    finally:
        db.close()


@router.post("/search-providers")
async def create_search_provider(data: SearchProviderCreate):
    db: Session = SessionLocal()
    try:
        # Check for duplicate name
        existing = db.query(SearchProvider).filter(SearchProvider.name == data.name).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Search provider '{data.name}' already exists")

        if data.is_default:
            db.query(SearchProvider).filter(SearchProvider.is_default == True).update({"is_default": False})

        now = datetime.now(timezone.utc)
        provider = SearchProvider(
            name=data.name,
            display_name=data.display_name,
            api_key_encrypted=encrypt_api_key(data.api_key),
            is_default=data.is_default,
            is_active=True,
            connection_status="connected",
            created_at=now,
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)
        return _search_provider_to_dict(provider)
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to create search provider: {exc}")
        raise HTTPException(status_code=500, detail="Failed to create search provider")
    finally:
        db.close()


@router.put("/search-providers/{provider_id}")
async def update_search_provider(provider_id: str, data: SearchProviderUpdate):
    db: Session = SessionLocal()
    try:
        provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")

        if data.is_default:
            db.query(SearchProvider).filter(SearchProvider.is_default == True, SearchProvider.id != provider_id).update({"is_default": False})

        update_data = data.model_dump(exclude_unset=True)
        if "api_key" in update_data and update_data["api_key"]:
            update_data["api_key_encrypted"] = encrypt_api_key(update_data.pop("api_key"))
        else:
            update_data.pop("api_key", None)

        for key, value in update_data.items():
            setattr(provider, key, value)

        db.commit()
        db.refresh(provider)
        return _search_provider_to_dict(provider)
    finally:
        db.close()


@router.delete("/search-providers/{provider_id}")
async def delete_search_provider(provider_id: str):
    db: Session = SessionLocal()
    try:
        provider = db.query(SearchProvider).filter(SearchProvider.id == provider_id).first()
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")
        db.delete(provider)
        db.commit()
        return {"message": "Provider deleted"}
    finally:
        db.close()


@router.post("/search-providers/test")
async def test_search_connection(data: TestConnectionRequest):
    from config_service.services.connection_tester import test_connection
    result = await test_connection(data)
    return {"success": result.success, "error": result.error, "models": result.models}

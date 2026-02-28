from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# LLM Provider schemas
# ---------------------------------------------------------------------------

class LLMProviderCreate(BaseModel):
    name: str
    display_name: str
    api_key: str
    base_url: Optional[str] = None
    models: Optional[List[str]] = None
    is_default: bool = False


class LLMProviderUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    models: Optional[List[str]] = None
    is_default: Optional[bool] = None


class LLMProviderResponse(BaseModel):
    id: str
    name: str
    display_name: str
    base_url: Optional[str] = None
    models: Optional[List[str]] = None
    is_active: bool
    is_default: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    connection_status: Optional[str] = "unknown"

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Search Provider schemas
# ---------------------------------------------------------------------------

class SearchProviderCreate(BaseModel):
    name: str
    display_name: str
    api_key: str
    is_default: bool = False


class SearchProviderUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    api_key: Optional[str] = None
    is_default: Optional[bool] = None


class SearchProviderResponse(BaseModel):
    id: str
    name: str
    display_name: str
    is_active: bool
    is_default: bool
    created_at: Optional[datetime] = None
    connection_status: Optional[str] = "unknown"

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Connection testing schemas
# ---------------------------------------------------------------------------

class TestConnectionRequest(BaseModel):
    name: str = Field(..., description="Provider name, e.g. 'openai', 'anthropic', 'tavily'")
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None


class TestConnectionResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    models: Optional[List[str]] = None

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    ENCRYPTION_KEY: str = "generate-a-fernet-key"

    GATEWAY_URL: str = "http://localhost:8000"
    LLM_SERVICE_URL: str = "http://localhost:8001"
    SEARCH_SERVICE_URL: str = "http://localhost:8002"
    FILE_SERVICE_URL: str = "http://localhost:8003"
    VIZ_SERVICE_URL: str = "http://localhost:8004"
    CONFIG_SERVICE_URL: str = "http://localhost:8005"

    UPLOAD_DIR: str = "./uploads"
    VIZ_OUTPUT_DIR: str = "./viz_outputs"
    MAX_FILE_SIZE_MB: int = 50

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()

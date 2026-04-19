import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_endpoint_url: str = ""
    frontend_url: str = "https://luup.life"
    secret_key: str = "dev-secret"
    session_ttl_seconds: int = 48 * 60 * 60

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

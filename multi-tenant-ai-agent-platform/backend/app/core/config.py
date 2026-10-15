from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    app_name: str = 'Multi-Tenant AI Agent Platform'
    database_url: str = 'postgresql+psycopg://platform:platform@db:5432/platform'
    jwt_secret: str = 'change-me-access-secret'
    jwt_refresh_secret: str = 'change-me-refresh-secret'
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    cors_origins: str = 'http://localhost:3000,http://localhost:5173'
    groq_api_key: str = ''
    llm_provider: str = 'groq'
    embedding_provider: str = 'sentence-transformers'
    vector_store: str = 'pgvector'
    embedding_model: str = 'all-MiniLM-L6-v2'
    top_k: int = 5
    similarity_threshold: float = 0.42
    max_context_tokens: int = 3500
    max_history_messages: int = 10
    max_upload_size: int = 10 * 1024 * 1024
    upload_dir: str = './uploads'
    max_pages: int = 25
    max_depth: int = 2
    crawl_delay: float = 0.25
    model_config = SettingsConfigDict(env_file='.env', case_sensitive=False, extra='ignore')

    @property
    def origins(self) -> List[str]:
        return [x.strip() for x in self.cors_origins.split(',') if x.strip()]

settings = Settings()

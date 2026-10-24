import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nyaya AI"
    VERSION: str = "1.2.0"
    API_PREFIX: str = "/api"
    
    # Ollama Local LLM Configuration (No External Commercial APIs)
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
    OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "90.0"))
    
    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "nyaya-ai-super-secret-key-mca-project-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nyaya_ai.db")
    
    # Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./data/uploads")
    VECTOR_STORE_DIR: str = os.getenv("VECTOR_STORE_DIR", "./data/vector_store")
    LEGAL_DOCS_DIR: str = os.getenv("LEGAL_DOCS_DIR", "./data/legal_documents")
    MAX_FILE_SIZE_MB: int = 25
    
    # Embeddings
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

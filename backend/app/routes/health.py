from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.database import get_db
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def get_health_status(db: Session = Depends(get_db)):
    # 1. Database check
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # 2. Ollama & Model check
    ollama_info = await llm_service.check_health()
    ollama_status = "healthy" if ollama_info.get("connected") else "offline"
    
    # 3. RAG status
    corpus_count = len(getattr(rag_service, "legal_corpus", [])) or len(getattr(rag_service, "documents", []))
    rag_status = "healthy" if (rag_service._initialized and corpus_count > 0) else "ready"

    return {
        "api": "healthy",
        "database": db_status,
        "ollama": ollama_status,
        "model": settings.OLLAMA_MODEL,
        "active_model_ready": ollama_info.get("model_ready", False),
        "available_models": ollama_info.get("available_models", []),
        "rag": rag_status,
        "version": settings.VERSION
    }

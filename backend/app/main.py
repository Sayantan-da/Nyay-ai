import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.database import engine, Base
import asyncio
from app.services.rag_service import rag_service
from app.services.llm_service import llm_service
from app.routes import auth, chat, documents, scanner, scenarios, health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nyaya.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and initialize vector index
    logger.info("Initializing Nyaya AI database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Initializing Nyaya AI RAG Vector Knowledge Base...")
    rag_service.initialize_knowledge_base()
    # Warm up Ollama model into RAM/VRAM permanently in background
    asyncio.create_task(llm_service.warmup())
    yield
    # Shutdown
    logger.info("Nyaya AI backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Educational Legal AI Assistant & Document Understanding Platform (Qwen 2.5 7B via Ollama)",
    lifespan=lifespan
)

# Enable CORS for React Native & mobile development
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)
app.include_router(documents.router, prefix=settings.API_PREFIX)
app.include_router(scanner.router, prefix=settings.API_PREFIX)
app.include_router(scenarios.router, prefix=settings.API_PREFIX)
app.include_router(health.router, prefix=settings.API_PREFIX)

@app.get("/")
def read_root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "description": "Nyaya AI - Indian Legal Literacy & Document Understanding Assistant",
        "llm_engine": f"Ollama ({settings.OLLAMA_MODEL})",
        "docs_url": "/docs",
        "health_check": f"{settings.API_PREFIX}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

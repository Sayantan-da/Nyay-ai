from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    language: Optional[str] = "en"  # en, hi, bn
    use_rag: bool = True
    document_context: Optional[str] = None
    document_id: Optional[int] = None
    debug_mode: Optional[bool] = False

class ChatSource(BaseModel):
    title: str
    category: str
    relevance_score: Optional[float] = None
    excerpt: Optional[str] = None
    # Enhanced structured statutory citation fields
    chunk_id: Optional[str] = None
    act_name: Optional[str] = None
    section_number: Optional[str] = None
    topic: Optional[str] = None
    similarity_score: Optional[float] = None
    source: Optional[str] = None
    document_type: Optional[str] = None

class ChatResponse(BaseModel):
    conversation_id: int
    response: str
    message: Optional[str] = None  # Compatible alias for assistant response text
    intent: Optional[str] = None   # GREETING, CASUAL, LEGAL_QUERY, DOCUMENT_QUERY, FOLLOW_UP, CLARIFICATION, UNKNOWN
    language: str
    sources: List[ChatSource] = []
    confidence: float = 1.0
    disclaimer: str = "This educational explanation is for legal literacy and does not constitute formal legal counsel."
    abstained: bool = False
    status: str = "success"        # success, error, fallback
    document_id: Optional[int] = None
    debug_trace: Optional[Dict[str, Any]] = None

class MessageItem(BaseModel):
    id: int
    sender: str
    content: str
    created_at: datetime
    sources: List[ChatSource] = []

class ConversationSummary(BaseModel):
    id: int
    title: str
    language: str
    created_at: datetime
    updated_at: datetime
    message_count: int

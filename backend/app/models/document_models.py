from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.analysis_models import DocumentAnalysisOutput

class DocumentUploadResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    mime_type: str
    message: str

class DocumentHistoryItem(BaseModel):
    id: int
    filename: str
    file_size: int
    created_at: datetime
    is_analyzed: bool
    document_type: Optional[str] = None

class DocumentDetailResponse(BaseModel):
    id: int
    filename: str
    file_size: int
    created_at: datetime
    analysis: Optional[DocumentAnalysisOutput] = None

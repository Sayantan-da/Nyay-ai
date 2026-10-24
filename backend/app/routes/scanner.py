from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.database.database import get_db
from app.database.models import User
from app.utils.security import get_current_user_optional
from app.services.document_service import document_service
from app.models.analysis_models import DocumentAnalysisOutput

router = APIRouter(prefix="/scanner", tags=["Auto Smart Scanner"])

@router.post("/upload", response_model=DocumentAnalysisOutput)
async def scan_and_analyze_document(
    file: UploadFile = File(...),
    language: Optional[str] = Form("en"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Auto Smart Scanner Endpoint:
    Automatically reads the uploaded file (PDF / PNG / JPG / TXT), extracts text,
    classifies document type, evaluates critical clauses and potential risks,
    and returns a structured, Pydantic-validated educational analysis.
    """
    user_id = current_user.id if current_user else None
    
    try:
        content = await file.read()
        analysis = await document_service.process_and_analyze_document(
            file_bytes=content,
            filename=file.filename or "uploaded_document.pdf",
            user_id=user_id,
            db=db,
            language=language or "en"
        )
        return analysis
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document analysis processing error: {str(e)}")

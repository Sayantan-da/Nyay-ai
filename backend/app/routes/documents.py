import json
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User, DocumentRecord, DocumentAnalysisRecord
from app.models.document_models import DocumentUploadResponse, DocumentHistoryItem, DocumentDetailResponse
from app.models.analysis_models import DocumentAnalysisOutput, ImportantClause, PotentialRisk
from app.utils.security import get_current_user_optional
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document_only(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    content = await file.read()
    try:
        document_service.validate_file(file.filename or "", len(content))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    # Auto analyze
    user_id = current_user.id if current_user else None
    analysis = await document_service.process_and_analyze_document(
        file_bytes=content,
        filename=file.filename or "uploaded_doc.pdf",
        user_id=user_id,
        db=db
    )

    doc_rec = db.query(DocumentRecord).order_by(DocumentRecord.id.desc()).first()
    return DocumentUploadResponse(
        id=doc_rec.id if doc_rec else 1,
        filename=file.filename or "document.pdf",
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        message="Document uploaded and analyzed successfully."
    )

@router.get("/history", response_model=List[DocumentHistoryItem])
def get_document_history(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(DocumentRecord)
    if current_user:
        query = query.filter(DocumentRecord.user_id == current_user.id)
    
    records = query.order_by(DocumentRecord.created_at.desc()).limit(20).all()
    results = []
    for r in records:
        analysis = db.query(DocumentAnalysisRecord).filter(DocumentAnalysisRecord.document_id == r.id).first()
        results.append(DocumentHistoryItem(
            id=r.id,
            filename=r.filename,
            file_size=r.file_size,
            created_at=r.created_at,
            is_analyzed=analysis is not None,
            document_type=analysis.document_type if analysis else None
        ))
    return results

@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_detail(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document record not found")

    analysis_rec = db.query(DocumentAnalysisRecord).filter(DocumentAnalysisRecord.document_id == document_id).first()
    analysis_model = None

    if analysis_rec:
        try:
            clauses = [ImportantClause(**c) for c in json.loads(analysis_rec.important_clauses_json or "[]")]
            risks = [PotentialRisk(**r) for r in json.loads(analysis_rec.potential_risks_json or "[]")]
            recommendations = json.loads(analysis_rec.recommendations_json or "[]")

            analysis_model = DocumentAnalysisOutput(
                is_legal_document=analysis_rec.is_legal_document,
                document_type=analysis_rec.document_type,
                confidence=analysis_rec.confidence,
                summary=analysis_rec.summary,
                important_clauses=clauses,
                potential_risks=risks,
                recommendations=recommendations,
                disclaimer=analysis_rec.disclaimer
            )
        except Exception:
            pass

    return DocumentDetailResponse(
        id=doc.id,
        filename=doc.filename,
        file_size=doc.file_size,
        created_at=doc.created_at,
        analysis=analysis_model
    )

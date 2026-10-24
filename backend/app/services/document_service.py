import os
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.database.models import DocumentRecord, DocumentAnalysisRecord
from app.services.ocr_service import ocr_service
from app.services.classifier_service import classifier_service
from app.services.risk_analyzer import risk_analyzer
from app.services.llm_service import llm_service
from app.services.prompt_service import PromptService
from app.services.rag_service import rag_service
from app.utils.text_processing import clean_text
from app.models.analysis_models import DocumentAnalysisOutput, ImportantClause, PotentialRisk

logger = logging.getLogger("nyaya.document")

class DocumentService:
    @staticmethod
    def validate_file(filename: str, file_size: int):
        allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".txt"}
        ext = os.path.splitext(filename)[1].lower()
        if ext not in allowed_extensions:
            raise ValueError(f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPG, JPEG, TXT.")
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise ValueError(f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB.")

    @classmethod
    async def process_and_analyze_document(
        cls,
        file_bytes: bytes,
        filename: str,
        user_id: Optional[int],
        db: Session,
        language: str = "en"
    ) -> DocumentAnalysisOutput:
        cls.validate_file(filename, len(file_bytes))
        
        # Ensure uploads folder exists
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        saved_path = os.path.join(settings.UPLOAD_DIR, f"{user_id or 'guest'}_{filename}")
        with open(saved_path, "wb") as f:
            f.write(file_bytes)

        # 1. OCR / Text Extraction
        raw_text, doc_format = ocr_service.extract_document_text(file_bytes, filename)
        cleaned_text = clean_text(raw_text)

        if not cleaned_text or len(cleaned_text.strip()) < 10:
            return DocumentAnalysisOutput(
                is_legal_document=False,
                document_type="Unreadable Document",
                confidence=0.5,
                summary="The uploaded file contained no discernible textual content. Please upload a clear digital PDF or high-resolution document.",
                important_clauses=[],
                potential_risks=[],
                recommendations=["Re-upload a clear scanned document or original digital PDF."],
                disclaimer="Document processing note."
            )

        # 2. Classification
        classification = classifier_service.classify_heuristically(cleaned_text)

        # 3. If heuristic determines it is NOT a legal document, verify with quick classification
        is_legal = classification.is_legal_document
        doc_type = classification.document_type

        if not is_legal:
            try:
                classify_prompt = PromptService.build_classification_prompt(cleaned_text)
                llm_class = await llm_service.generate_structured_json(classify_prompt)
                if llm_class.get("is_legal_document") is True:
                    is_legal = True
                    doc_type = llm_class.get("document_type", "Legal Document")
            except Exception:
                # If LLM unavailable or classification confirms non-legal, trust heuristic
                pass

        if not is_legal:
            logger.info(f"Uploaded file '{filename}' classified as non-legal document. Halting legal extraction.")
            return DocumentAnalysisOutput(
                is_legal_document=False,
                document_type="Non-Legal Document",
                confidence=classification.confidence,
                summary=(
                    "This document does not appear to be a legal document (such as a contract, agreement, "
                    "affidavit, deed, or court notice). It contains general content with no binding contractual covenants "
                    "or statutory provisions."
                ),
                important_clauses=[],
                potential_risks=[],
                recommendations=[
                    "Please upload a legally binding document such as a Rental Agreement, Employment Contract, Service Contract, or Legal Notice.",
                    "Ensure the document contains party names, signatures, formal covenants, or statutory references."
                ],
                disclaimer="Nyaya AI Auto Smart Scanner is designed exclusively for legal documents."
            )

        # 4. LLM Generation & Pydantic Validation for Verified Legal Document
        analysis_output: Optional[DocumentAnalysisOutput] = None
        try:
            llm_prompt = PromptService.build_document_analysis_prompt(
                document_text=cleaned_text,
                document_type=doc_type,
                language=language
            )
            raw_json = await llm_service.generate_structured_json(llm_prompt)
            # Pydantic validation
            analysis_output = DocumentAnalysisOutput(**raw_json)

            # If LLM also determined during full analysis that it is not legal
            if not analysis_output.is_legal_document:
                analysis_output.important_clauses = []
                analysis_output.potential_risks = []
                analysis_output.document_type = "Non-Legal Document"
                if not analysis_output.recommendations:
                    analysis_output.recommendations = [
                        "Please upload a legally binding document to analyze legal rights and risks."
                    ]
        except Exception as e:
            logger.info(f"Ollama structured analysis fallback ({e}). Using deterministic legal analyzer.")
            heuristic_res = risk_analyzer.analyze_clauses_heuristically(cleaned_text, doc_type)
            summary = (
                f"This document is identified as a {doc_type}. "
                f"It outlines mutual rights and obligations between the parties. "
                f"Key stipulations including durations, financial payments, and termination covenants should be verified."
            )
            analysis_output = DocumentAnalysisOutput(
                is_legal_document=True,
                document_type=doc_type,
                confidence=classification.confidence,
                summary=summary,
                important_clauses=heuristic_res["clauses"],
                potential_risks=heuristic_res["risks"],
                recommendations=heuristic_res["recommendations"],
                disclaimer="This analysis is for educational and legal literacy purposes only and does not constitute formal legal counsel."
            )

        # 5. Persist to Database
        try:
            doc_rec = DocumentRecord(
                user_id=user_id,
                filename=filename,
                file_path=saved_path,
                file_size=len(file_bytes),
                mime_type=f"application/{doc_format}"
            )
            db.add(doc_rec)
            db.commit()
            db.refresh(doc_rec)

            analysis_rec = DocumentAnalysisRecord(
                document_id=doc_rec.id,
                is_legal_document=analysis_output.is_legal_document,
                document_type=analysis_output.document_type,
                confidence=analysis_output.confidence,
                summary=analysis_output.summary,
                important_clauses_json=json.dumps([c.model_dump() for c in analysis_output.important_clauses]),
                potential_risks_json=json.dumps([r.model_dump() for r in analysis_output.potential_risks]),
                recommendations_json=json.dumps(analysis_output.recommendations),
                disclaimer=analysis_output.disclaimer
            )
            db.add(analysis_rec)
            db.commit()
        except Exception as db_err:
            logger.error(f"Error saving document record to DB: {db_err}")
            db.rollback()

        # 6. Index into User Document RAG source using structure-aware chunking
        if analysis_output.is_legal_document:
            rag_service.add_user_document_text(
                filename=filename,
                doc_type=classification.document_type,
                cleaned_text=cleaned_text
            )

        return analysis_output

document_service = DocumentService()

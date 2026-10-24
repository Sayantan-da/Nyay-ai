from pydantic import BaseModel, Field
from typing import List, Optional

class ImportantClause(BaseModel):
    title: str = Field(description="Name or category of the clause")
    text: str = Field(description="Exact or summarized text from the document")
    importance: str = Field(default="medium", description="high, medium, or low")
    explanation: str = Field(description="Plain-language educational explanation")

class PotentialRisk(BaseModel):
    title: str = Field(description="Concern or risky clause title")
    severity: str = Field(default="medium", description="high, medium, or low")
    explanation: str = Field(description="Why this clause requires careful attention")
    source_context: Optional[str] = Field(default="", description="Relevant excerpt or reference")

class ClassificationOutput(BaseModel):
    is_legal_document: bool = True
    document_type: str = "General Legal Document"
    confidence: float = 0.90
    reason: Optional[str] = ""

class DocumentAnalysisOutput(BaseModel):
    is_legal_document: bool = True
    document_type: str = "Legal Document"
    confidence: float = 0.90
    summary: str = Field(description="Concise plain-language overview of the document")
    important_clauses: List[ImportantClause] = Field(default_factory=list)
    potential_risks: List[PotentialRisk] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    disclaimer: str = Field(
        default="This analysis is for educational and literacy purposes only and does not constitute formal legal advice. Please consult a qualified legal advocate for specific advice."
    )

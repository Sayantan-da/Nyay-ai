import re
from typing import Dict, Any, List
from app.models.analysis_models import ClassificationOutput

LEGAL_KEYWORDS = {
    "Rental Agreement": [
        "rental agreement", "lease deed", "tenancy agreement", "landlord", "tenant",
        "lessor", "lessee", "monthly rent", "security deposit", "premises", "letting", "demised premises"
    ],
    "Employment Contract": [
        "employment agreement", "appointment letter", "employer", "employee", "probation period",
        "ctc", "salary", "non-disclosure", "duties", "termination notice", "relieving", "severance"
    ],
    "Non-Disclosure Agreement (NDA)": [
        "non-disclosure agreement", "confidentiality agreement", "confidential information",
        "disclosing party", "receiving party", "proprietary information", "trade secrets", "nda"
    ],
    "Legal Notice / Court Order": [
        "legal notice", "court notice", "advocate", "under section", "hereby call upon you",
        "suit no", "petitioner", "respondent", "injunction", "summons", "writ petition", "affidavit"
    ],
    "Loan & Mortgage Agreement": [
        "loan agreement", "borrower", "lender", "principal amount", "rate of interest",
        "emi", "collateral", "hypothecation", "default in payment", "promissory note"
    ],
    "Sale / Conveyance Deed": [
        "sale deed", "vendor", "vendee", "purchaser", "conveyance deed", "schedule property",
        "stamp duty", "registration", "absolute owner"
    ],
    "FIR / Police Complaint": [
        "first information report", "police station", "complainant", "accused", "ipc", "bns",
        "cognizable offence", "investigating officer", "zero fir"
    ],
    "Terms of Service / Privacy Policy": [
        "terms of service", "terms of use", "privacy policy", "user agreement", "governing law",
        "intellectual property", "limitation of liability", "indemnification"
    ],
    "General Legal Contract": [
        "whereas", "in witness whereof", "covenant", "parties hereto", "force majeure",
        "jurisdiction of courts", "arbitration clause", "indemnity", "power of attorney", "memorandum of understanding"
    ]
}

# Strong negative markers that indicate non-legal general material
NON_LEGAL_MARKERS = [
    # Academic & School
    "curriculum vitae", "resume", "syllabus", "homework assignment",
    "course outline", "class 10", "class 12", "question paper", "lecture notes",
    
    # Resume sections (prevents resumes with 'NDA' or 'CTC' from passing)
    "work experience", "key skills", "technical skills", "career objective", 
    "academic background", "hobbies", "extracurricular",
    
    # Medical & Diagnostic reports
    "patient name", "doctor prescription", "lab report", "hemoglobin", "diagnosis",
    
    # Utility & Everyday bills (not formal legal contracts)
    "electricity bill", "water bill", "supermarket receipt", "table no",
    
    # General non-legal content
    "recipe", "ingredients", "coding tutorial", "blog post", "fiction story"
]


class ClassifierService:
    @staticmethod
    def classify_heuristically(text: str) -> ClassificationOutput:
        """Rule-based classifier to strictly identify if text is a genuine legal document."""
        text_lower = text.lower()
        
        # Check non-legal indicators
        non_legal_hits = sum(1 for marker in NON_LEGAL_MARKERS if marker in text_lower)

        scores: Dict[str, int] = {}
        total_legal_hits = 0
        
        for doc_type, keywords in LEGAL_KEYWORDS.items():
            matches = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw) + r'\b', text_lower))
            if matches > 0:
                scores[doc_type] = matches
                total_legal_hits += matches
                
        # If hits are minimal or non-legal indicators outweigh legal terms
        if total_legal_hits < 2 or (non_legal_hits > 0 and total_legal_hits < 3):
            return ClassificationOutput(
                is_legal_document=False,
                document_type="Non-Legal Document",
                confidence=0.90,
                reason="Document does not contain enforceable contractual covenants, statutory terms, or formal legal terminology."
            )
            
        best_type = max(scores, key=scores.get)
        confidence = min(0.70 + (scores[best_type] * 0.05), 0.98)
        
        return ClassificationOutput(
            is_legal_document=True,
            document_type=best_type,
            confidence=round(confidence, 2),
            reason=f"Identified multiple contractual provisions matching {best_type} taxonomy."
        )

classifier_service = ClassifierService()

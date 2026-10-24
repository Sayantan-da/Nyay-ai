import re
from typing import List, Dict

def clean_text(text: str) -> str:
    """Normalize whitespace and remove non-printable characters."""
    if not text:
        return ""
    text = re.sub(r'[\r\t\f\v]', ' ', text)
    text = re.sub(r' +', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[str]:
    """Split text into overlapping character chunks preserving sentences where possible."""
    cleaned = clean_text(text)
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]
        
    paragraphs = cleaned.split("\n\n")
    chunks = []
    current_chunk = ""
    
    for p in paragraphs:
        p = p.strip()
        if not p:
            continue
        if len(current_chunk) + len(p) <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{p}" if current_chunk else p
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # If paragraph itself is larger than chunk_size, split by sentences
            if len(p) > chunk_size:
                sentences = re.split(r'(?<=[.!?]) +', p)
                sub_chunk = ""
                for s in sentences:
                    if len(sub_chunk) + len(s) <= chunk_size:
                        sub_chunk = f"{sub_chunk} {s}" if sub_chunk else s
                    else:
                        if sub_chunk:
                            chunks.append(sub_chunk)
                        sub_chunk = s
                if sub_chunk:
                    chunks.append(sub_chunk)
                current_chunk = ""
            else:
                current_chunk = p
                
    if current_chunk:
        chunks.append(current_chunk)
        
    return chunks

CLAUSE_PATTERNS: Dict[str, str] = {
    "Security Deposit": r"(?i)(security deposit|refundable deposit|caution deposit|advance rent)[\s\S]{0,150}",
    "Lock-in Period": r"(?i)(lock[\s-]?in period|minimum stay|cannot terminate within)[\s\S]{0,150}",
    "Termination & Notice": r"(?i)(termination|notice period|prior notice|vacating notice)[\s\S]{0,150}",
    "Penalty & Interest": r"(?i)(penalty|late fee|penal charge|default interest)[\s\S]{0,150}",
    "Indemnity & Liability": r"(?i)(indemnif|hold harmless|liability of tenant|limitation of liability)[\s\S]{0,150}",
    "Dispute Resolution & Jurisdiction": r"(?i)(arbitration|jurisdiction of court|governing law|dispute resolution)[\s\S]{0,150}",
    "Automatic Renewal": r"(?i)(auto[\s-]?renew|automatic extension|shall be renewed)[\s\S]{0,150}"
}

def extract_heuristic_clauses(text: str) -> List[Dict[str, str]]:
    """Scan text using rule-based regex to find common critical clauses."""
    found = []
    for clause_name, pattern in CLAUSE_PATTERNS.items():
        match = re.search(pattern, text)
        if match:
            matched_snippet = match.group(0).strip()
            # Clean snippet
            snippet = clean_text(matched_snippet)
            if len(snippet) > 200:
                snippet = snippet[:197] + "..."
            found.append({
                "clause_type": clause_name,
                "snippet": snippet
            })
    return found

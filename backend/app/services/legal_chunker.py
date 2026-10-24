import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("nyaya.chunker")

# Configurable Chunking Parameters
DEFAULT_CHUNK_SIZE = 450     # target character count per meaningful chunk
DEFAULT_CHUNK_OVERLAP = 80   # character overlap to preserve boundary context
MIN_CHUNK_SIZE = 100         # reject excessively small fragments

# Legal & Contract Boundary Regex Patterns
SECTION_PATTERN = re.compile(
    r'(?i)(?:^|\n)(?:section|sec\.?|article|art\.?|clause|rule)\s*(\d+[a-z]?(?:\([a-z0-9]+\))?)[:\.\s\-]+([^\n]+)?',
    re.MULTILINE
)
CHAPTER_PATTERN = re.compile(
    r'(?i)(?:^|\n)(?:chapter|part|title)\s*([ivxlcdm\d]+)[:\.\s\-]+([^\n]+)?',
    re.MULTILINE
)
NUMBERED_CLAUSE_PATTERN = re.compile(
    r'(?:^|\n)\s*(\d{1,2}\.|\([a-z0-9]\))\s+',
    re.MULTILINE
)

class LegalChunker:
    """
    Structure-Aware Legal & Contract Document Chunker.
    Preserves hierarchical structure:
      Document -> Chapter/Part -> Section/Clause -> Subsection -> Meaningful Chunks
    Ensures headings and legal context stay attached to their corresponding text.
    """
    def __init__(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
        min_chunk_size: int = MIN_CHUNK_SIZE
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size

    def split_legal_text(
        self,
        text: str,
        document_title: str = "Document",
        document_type: str = "statute",
        act_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Splits legal text or contracts into structured, metadata-enriched chunks.
        """
        if not text or not text.strip():
            return []

        cleaned = text.strip()
        paragraphs = re.split(r'\n{2,}', cleaned)
        
        chunks: List[Dict[str, Any]] = []
        current_heading = document_title
        current_section = ""
        buffer_text = ""
        chunk_idx = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # Check if this paragraph contains a section heading
            sec_match = SECTION_PATTERN.search(para[:120])
            if sec_match:
                current_section = sec_match.group(1).strip()
                if sec_match.group(2):
                    current_heading = sec_match.group(2).strip()

            # If adding this paragraph exceeds chunk_size, flush buffer
            if len(buffer_text) + len(para) > self.chunk_size and len(buffer_text) >= self.min_chunk_size:
                chunk_id = f"{re.sub(r'[^a-zA-Z0-9_]', '_', document_title)[:20]}_chk_{chunk_idx:03d}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "text": buffer_text.strip(),
                    "act_name": act_name or document_title,
                    "section_number": current_section or None,
                    "section_title": current_heading or None,
                    "document_type": document_type,
                    "jurisdiction": "India",
                    "chunk_index": chunk_idx,
                    "char_count": len(buffer_text.strip())
                })
                chunk_idx += 1

                # Keep overlap from the end of the buffer
                if self.chunk_overlap > 0 and len(buffer_text) > self.chunk_overlap:
                    overlap_seed = buffer_text[-self.chunk_overlap:].strip()
                    # Try to break cleanly at sentence or word
                    last_space = overlap_seed.rfind(' ')
                    if last_space != -1:
                        overlap_seed = overlap_seed[last_space:].strip()
                    buffer_text = overlap_seed + " " + para
                else:
                    buffer_text = para
            else:
                if buffer_text:
                    buffer_text += "\n" + para
                else:
                    buffer_text = para

        # Flush final remaining buffer
        if buffer_text and len(buffer_text.strip()) >= 30:
            chunk_id = f"{re.sub(r'[^a-zA-Z0-9_]', '_', document_title)[:20]}_chk_{chunk_idx:03d}"
            chunks.append({
                "chunk_id": chunk_id,
                "text": buffer_text.strip(),
                "act_name": act_name or document_title,
                "section_number": current_section or None,
                "section_title": current_heading or None,
                "document_type": document_type,
                "jurisdiction": "India",
                "chunk_index": chunk_idx,
                "char_count": len(buffer_text.strip())
            })

        return chunks

legal_chunker = LegalChunker()

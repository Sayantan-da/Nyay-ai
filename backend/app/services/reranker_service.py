import re
import math
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("nyaya.reranker")

class ReRankerService:
    """
    Configurable Local Re-ranking Engine for Legal Documents.
    Evaluates:
      Query + Candidate Passage
    Produces calibrated relevance scores [0.0 - 1.0] to elevate the most legally pertinent chunks.
    Supports exact statutory citation bonuses (Sections, Acts, Helpline numbers)
    and semantic token alignment.
    """
    def __init__(self, model_name: str = "local_legal_cross_ranker"):
        self.model_name = model_name

    def compute_passage_score(self, query: str, passage: Dict[str, Any]) -> float:
        """
        Computes a fine-grained cross-matching relevance score for a query and candidate passage.
        """
        q_clean = query.lower()
        p_text = passage.get("text", "").lower()
        p_title = passage.get("title", "").lower()
        p_act = (passage.get("act_name") or "").lower()
        p_section = str(passage.get("section_number") or "").lower()

        full_doc = f"{p_title} {p_act} section {p_section} {p_text}"

        # 1. Base semantic score from retriever (if present)
        base_score = float(passage.get("similarity_score") or passage.get("relevance_score") or 0.5)

        # 2. Extract statutory tokens from query: e.g. numbers, section references, helpline numbers
        statutory_tokens = re.findall(r'\b(?:section\s*\d+[a-z]?|\d{3,5}|bns|bnss|bsa|cpa|rera|posh|rti|it act)\b', q_clean)
        statutory_match_boost = 0.0
        for tok in statutory_tokens:
            if tok in full_doc:
                statutory_match_boost += 0.25

        # 3. Exact Section match boost
        if p_section and p_section in q_clean:
            statutory_match_boost += 0.30

        # 4. Token Overlap & Density
        q_words = [w for w in re.findall(r'\b\w{3,}\b', q_clean) if w not in {"what", "when", "where", "which", "does", "have", "with", "this", "that", "from"}]
        if not q_words:
            overlap_ratio = 0.5
        else:
            matched_words = [w for w in q_words if w in full_doc]
            overlap_ratio = len(matched_words) / len(q_words)

        # 5. Consecutive Phrase match bonus (n-gram)
        phrase_bonus = 0.0
        for i in range(len(q_words) - 1):
            bigram = f"{q_words[i]} {q_words[i+1]}"
            if bigram in full_doc:
                phrase_bonus += 0.15

        # Combined Calibrated Score: 40% Retriever Base + 35% Word Overlap + 15% Phrase + Statutory Boost
        re_score = (0.35 * base_score) + (0.35 * overlap_ratio) + phrase_bonus + statutory_match_boost
        re_score = min(1.0, max(0.05, round(re_score, 3)))
        return re_score

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Reranks a candidate list of passages and returns the top_k most relevant.
        """
        if not candidates:
            return []

        scored_candidates = []
        for cand in candidates:
            cand_copy = dict(cand)
            score = self.compute_passage_score(query, cand_copy)
            cand_copy["rerank_score"] = score
            cand_copy["similarity_score"] = score  # Calibrated final similarity
            cand_copy["relevance_score"] = score
            scored_candidates.append(cand_copy)

        # Sort descending by rerank score
        scored_candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
        return scored_candidates[:top_k]

reranker_service = ReRankerService()

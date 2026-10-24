import re
import logging
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger("nyaya.query")

# Statutory Term Preservation Regex
EXACT_LEGAL_PATTERNS = [
    re.compile(r'\b(?:section|sec\.?)\s*\d+[a-z]?\b', re.IGNORECASE),
    re.compile(r'\b(?:article|art\.?)\s*\d+[a-z]?\b', re.IGNORECASE),
    re.compile(r'\b(?:bnss|bns|bsa|crpc|ipc|posh|rera|rti|cpa|ni act)\b', re.IGNORECASE),
    re.compile(r'\b(?:zero fir|1930|1915|15100|181|112)\b', re.IGNORECASE),
]

# Common Citizen Query Expansion Lexicon (Indian Legal Domain)
QUERY_EXPANSION_RULES = {
    "deposit": "return of residential security deposit landlord deduction lock-in",
    "landlord": "landlord tenant rental tenancy agreement eviction rights",
    "cyber": "cybercrime online financial fraud upi 1930 helpline cybercrime.gov.in",
    "scam": "financial scam upi unauthorized transaction recovery bank reporting",
    "police": "police complaint fir zero fir arrest rights bail police station",
    "harassment": "workplace sexual harassment posh act 2013 internal committee 181",
    "salary": "unpaid salary employment non-payment notice period relieving letter",
    "cheque": "cheque bounce section 138 negotiable instruments act demand notice",
    "builder": "builder delay flat possession rera real estate compensation"
}

class QueryUnderstandingService:
    """
    Query Understanding and Conversational Reformulation Service.
    - Preserves exact legal statutes, section numbers, and act abbreviations.
    - Expands ambiguous colloquial citizen queries for high-recall retrieval.
    - Resolves conversational follow-ups (e.g. 'Can I file it in another state?' following 'What is Zero FIR?').
    """

    def is_exact_legal_query(self, query: str) -> bool:
        """Determines if the query already specifies exact legal citations."""
        for pattern in EXACT_LEGAL_PATTERNS:
            if pattern.search(query):
                return True
        return False

    def rewrite_for_retrieval(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[str, bool]:
        """
        Rewrites the query for retrieval while ensuring legal exactness.
        Returns: (rewritten_query, was_rewritten)
        """
        raw = query.strip()
        if not raw:
            return raw, False

        # 1. Conversational Coreference Resolution for Follow-up Questions
        resolved_query = raw
        if conversation_history:
            # Check for pronouns or elliptical questions like "Can I do that?", "What about in Delhi?"
            is_followup = bool(re.search(r'\b(it|this|that|he|she|they|there|same|another state|again)\b', raw, re.IGNORECASE))
            if is_followup:
                # Find previous user topic
                for prev in reversed(conversation_history):
                    if prev.get("role") == "user" or prev.get("sender") == "user":
                        prev_text = prev.get("text") or prev.get("content") or ""
                        # Extract prominent legal subjects from previous query
                        key_subjects = re.findall(r'\b(?:zero fir|fir|deposit|rent|cyber|fraud|arrest|bail|cheque|posh|rera|salary)\b', prev_text, re.IGNORECASE)
                        if key_subjects:
                            resolved_query = f"{key_subjects[0]} {raw}"
                            break

        # 2. Check if query is already an exact statutory query
        if self.is_exact_legal_query(resolved_query):
            # Preserve exact legal search terms without distortion
            return resolved_query, resolved_query != raw

        # 3. Legal Concept Expansion for Ambiguous / Short Queries (< 6 words)
        words = resolved_query.lower().split()
        if len(words) <= 5:
            added_terms = []
            for w in words:
                clean_w = re.sub(r'[^a-z]', '', w)
                if clean_w in QUERY_EXPANSION_RULES:
                    added_terms.append(QUERY_EXPANSION_RULES[clean_w])
            
            if added_terms:
                expanded = f"{resolved_query} {' '.join(added_terms)}"
                logger.info(f"Expanded short legal query: '{resolved_query}' -> '{expanded}'")
                return expanded, True

        return resolved_query, resolved_query != raw

query_service = QueryUnderstandingService()

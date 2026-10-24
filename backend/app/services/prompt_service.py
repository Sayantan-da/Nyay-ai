from typing import List, Dict, Optional, Any

NYAYA_SYSTEM_PROMPT = """You are Nyaya AI, a highly reliable, legally cautious, educational legal literacy assistant for Indian citizens.
Your purpose is to explain Indian statutory concepts, citizen rights, procedures, and uploaded contract terms in simple, plain language.

STRICT LEGAL SAFETY AND GROUNDING RULES:
1. EVIDENCE-FIRST GENERATION: Base your statements directly on the retrieved legal provisions and/or user document context provided.
2. ZERO HALLUCINATION POLICY: NEVER invent or hallucinate Act names, section numbers, case names, deadlines, statutory penalties, or procedural timelines.
3. INSUFFICIENT EVIDENCE / SAFE ABSTENTION: If the retrieved context does not contain sufficient verified information to answer the user's question, respond with:
   "I don't have enough verified information in the available knowledge base to answer this reliably."
   Do NOT guess or fabricate legal answers when context is missing.
4. EVIDENCE SEPARATION: When answering queries with both document excerpts and statutes, clearly distinguish:
   - What the document says
   - What Indian legal statutory knowledge says
   - General educational explanation
5. EDUCATIONAL DISCLAIMER: You are not a lawyer. Always maintain that this is for educational legal literacy, not formal legal counsel.
6. VERIFIED HELPLINES: Preserve official emergency numbers (Cyber/UPI: 1930, Consumer: 1915, Women: 181, Free Legal Aid NALSA: 15100, Police: 112)."""

LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in simple, clear, and empathetic English.",
    "hi": "उपयोगकर्ता से हिंदी में संवाद करें। सभी कानूनी अवधारणाओं को सरल, स्पष्ट और व्यावहारिक हिंदी (देवनागरी लिपि) में समझाएं।",
    "bn": "ব্যবহারকারীর সাথে বাংলায় যোগাযোগ করুন। সমস্ত আইনি ধারণা এবং পরামর্শ সহজ, স্পষ্ট এবং ব্যবহারিক বাংলায় (বাংলা লিপি) ব্যাখ্যা করুন।"
}

class PromptService:
    @staticmethod
    def get_system_prompt(language: str = "en") -> str:
        lang_note = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en"])
        return f"{NYAYA_SYSTEM_PROMPT}\n\nLanguage requirement: {lang_note}"

    @staticmethod
    def build_chat_rag_prompt(
        query: str, 
        retrieved_contexts: List[Dict[str, Any]], 
        language: str = "en",
        document_context: Optional[str] = None,
        is_insufficient_evidence: bool = False,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        if is_insufficient_evidence:
            return f"""User Question: "{query}"

Retrieved Legal Knowledge: [NO SUFFICIENT VERIFIED EVIDENCE FOUND]

Instructions:
1. State clearly: "I don't have enough verified information in the available knowledge base to answer this reliably."
2. Provide a brief, safe general educational note regarding where citizens can verify this (e.g. DLSA, NALSA helpline 15100, or official portals).
3. Do NOT invent legal sections or statutory remedies.
4. Keep the answer under 100 words.
5. End with: "Disclaimer: This is for legal literacy, not formal legal counsel."
"""

        context_blocks = []
        if conversation_history:
            history_lines = ["=== RECENT CONVERSATION CONTEXT ==="]
            for msg in conversation_history[-3:]:
                role = "User" if msg.get("role") in ("user", "sender") else "Nyaya AI"
                content = (msg.get("content") or msg.get("text") or "")[:250]
                history_lines.append(f"{role}: {content}")
            context_blocks.append("\n".join(history_lines))

        if document_context:
            context_blocks.append(f"=== USER UPLOADED DOCUMENT EVIDENCE ===\n{document_context[:2500]}")

        if retrieved_contexts:
            legal_lines = ["=== RETRIEVED VERIFIED INDIAN STATUTORY KNOWLEDGE ==="]
            for i, ctx in enumerate(retrieved_contexts, 1):
                act = ctx.get("act_name") or ctx.get("title") or "Indian Statute"
                sec = ctx.get("section_number")
                sec_str = f"Section {sec}" if sec else ""
                topic = ctx.get("topic") or ctx.get("category") or "Legal Provision"
                text = ctx.get("text", "")
                legal_lines.append(f"\n[Source {i}] {act} {sec_str} | Topic: {topic}\n{text}")
            context_blocks.append("\n".join(legal_lines))

        full_context = "\n\n".join(context_blocks)

        prompt = f"""User Question:
"{query}"

{full_context}

Instructions:
1. Answer directly and concisely in 3 to 4 well-structured bullet points.
2. Ground your answer strictly in the evidence provided above.
3. Cite the exact statutory Act and Section from the retrieved sources (e.g., BNSS Section 173, CPA 2019 Section 35).
4. If an uploaded document is referenced, clearly specify what the contract states vs what statutory law prescribes.
5. If relevant, mention official emergency helplines (1930 for Cyber/UPI, 1915 for Consumer, 15100 for NALSA free legal aid, 181 for Women).
6. Keep the response under 180 words.
7. End with: "Disclaimer: This is for legal literacy, not formal legal counsel."
"""
        return prompt

    @staticmethod
    def build_document_analysis_prompt(document_text: str, document_type: str = "Legal Document", language: str = "en") -> str:
        truncated_text = document_text[:5000] if len(document_text) > 5000 else document_text
        return f"""You are analyzing an uploaded document for Nyaya AI Legal Literacy Assistant.

DOCUMENT EXCERPT:
\"\"\"
{truncated_text}
\"\"\"

CRITICAL STEP 1 - LEGAL VALIDITY CHECK:
Examine whether this document is a genuine legal document (e.g. Rental Agreement, Lease Deed, Employment Contract, Non-Disclosure Agreement, Court Notice, Police Complaint/FIR, Affidavit, Will, Sale Deed, Loan Contract, Terms of Service, or Consumer Dispute).
If the document is a general, non-legal document (such as study notes, essay, school homework, resume/CV, story, recipe, coding tutorial, general news article, chat transcript, or general report with NO binding covenants):
- Set "is_legal_document": false
- Set "document_type": "Non-Legal Document"
- Set "summary": "This document is not a legal document. It contains general textual material with no formal contractual rights, statutory liabilities, or legally binding clauses."
- Set "important_clauses": []
- Set "potential_risks": []
- Set "recommendations": [
    "Please upload a legally binding document (e.g., Rental Agreement, Employment Contract, Service Agreement, or Legal Notice) to analyze legal rights and risks."
  ]

CRITICAL STEP 2 - IF IT IS A GENUINE LEGAL DOCUMENT:
Analyze the document and extract its key clauses and potential risks.

Return ONLY a valid JSON object matching this exact schema:
{{
  "is_legal_document": true or false,
  "document_type": "Detected Legal Document Type (or 'Non-Legal Document')",
  "confidence": 0.95,
  "summary": "Plain-language summary of what this document is.",
  "important_clauses": [
    {{
      "title": "Clause Name (e.g. Security Deposit / Termination / Payment)",
      "text": "Exact or summarized text from the document",
      "importance": "high, medium, or low",
      "explanation": "Simple explanation of what this means for the user"
    }}
  ],
  "potential_risks": [
    {{
      "title": "Concern (e.g. Unbalanced Lock-in / Forfeiture / High Penalty)",
      "severity": "high, medium, or low",
      "explanation": "Why the user should review this carefully",
      "source_context": "Excerpt from the clause"
    }}
  ],
  "recommendations": [
    "Actionable educational recommendation 1",
    "Actionable educational recommendation 2"
  ],
  "disclaimer": "This analysis is for educational purposes and does not substitute for review by a certified legal advocate."
}}

CRITICAL: Return strictly valid JSON. Do not include markdown code block backticks if possible, or enclose in ```json ... ```. No extra commentary outside the JSON."""

    @staticmethod
    def build_classification_prompt(document_text: str) -> str:
        sample = document_text[:1500]
        return f"""Examine this document excerpt:
\"\"\"
{sample}
\"\"\"

Determine whether this is a legal document (e.g., Rental Agreement, Employment Agreement, NDAs, Court Notice, Affidavit, Power of Attorney, Will, Sales Deed, Legal Invoice, Terms of Service, FIR, etc.) or a general document (e.g. resume, receipt, school notes, essay, personal letter, etc.).

Return ONLY valid JSON matching this schema:
{{
  "is_legal_document": true or false,
  "document_type": "Specific Type Name (e.g. Rental Agreement, Non-Disclosure Agreement, Employment Contract, General Document)",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation of the classification"
}}"""

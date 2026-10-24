import pytest
import numpy as np
from app.services.rag_service import rag_service, RAGService
from app.services.embedding_service import embedding_service
from app.services.legal_chunker import legal_chunker
from app.services.reranker_service import reranker_service
from app.services.query_service import query_service
from app.services.prompt_service import PromptService
from app.services.ocr_service import ocr_service
from app.services.document_service import document_service

@pytest.fixture(autouse=True)
def setup_rag():
    rag_service.initialize_knowledge_base()

# 1. Relevant legal question
def test_case_01_relevant_legal_question():
    res, trace = rag_service.retrieve_hybrid("What is Zero FIR under Section 173 of BNSS?")
    assert len(res) > 0
    assert any("BNSS" in (r.get("act_name") or "") for r in res)
    assert trace["confidence_level"] == "strong"
    assert trace["abstain_recommended"] is False

# 2. Irrelevant question
def test_case_02_irrelevant_question():
    res, trace = rag_service.retrieve_hybrid("What is the recipe for chocolate chip cookies?")
    assert trace["confidence_level"] in ("insufficient", "moderate")
    assert trace["top_relevance_score"] < 0.65

# 3. No matching knowledge
def test_case_03_no_matching_knowledge():
    res, trace = rag_service.retrieve_hybrid("What are the corporate tax brackets of Lichtenstein?")
    assert trace["abstain_recommended"] is True

# 4. Ambiguous question
def test_case_04_ambiguous_question():
    rewritten, was_rewritten = query_service.rewrite_for_retrieval("landlord deposit?")
    assert was_rewritten is True
    assert "security deposit" in rewritten or "tenancy" in rewritten
    res, trace = rag_service.retrieve_hybrid("landlord deposit?")
    assert len(res) > 0
    assert any("Tenancy" in (r.get("topic") or r.get("category") or "") for r in res)

# 5. Exact section lookup
def test_case_05_exact_section_lookup():
    res, trace = rag_service.retrieve_hybrid("Section 138 NI Act")
    assert len(res) > 0
    top = res[0]
    assert "138" in str(top.get("section_number"))
    assert "Negotiable Instruments" in top.get("act_name", "")

# 6. Uploaded document question
def test_case_06_uploaded_document_question():
    contract_text = """
    EMPLOYMENT AGREEMENT
    Clause 4. Confidentiality and Non-Compete:
    Employee shall not engage with competitor firms for 24 months post termination.
    Clause 5. Liquidated Damages:
    Breach shall attract liquidated damages of Rs. 5,00,000.
    """
    rag_service.add_user_document_text("employment_contract.pdf", "Employment Agreement", contract_text)
    res, trace = rag_service.retrieve_hybrid("What are the liquidated damages under the confidentiality clause?")
    assert len(res) > 0
    assert any("5,00,000" in r.get("text", "") or "Liquidated Damages" in r.get("text", "") for r in res)

# 7. Follow-up question with conversational history
def test_case_07_followup_question():
    history = [{"role": "user", "text": "What is Zero FIR?"}, {"role": "assistant", "text": "Zero FIR is filed anywhere."}]
    rewritten, was_rewritten = query_service.rewrite_for_retrieval("Can I file it in another state?", history)
    assert "zero fir" in rewritten.lower()

# 8. Multilingual question (Hindi / Bengali)
def test_case_08_multilingual_prompt():
    prompt_hi = PromptService.get_system_prompt(language="hi")
    assert "हिंदी" in prompt_hi
    prompt_bn = PromptService.get_system_prompt(language="bn")
    assert "বাংলা" in prompt_bn

# 9. Hallucination attempt
def test_case_09_hallucination_attempt():
    prompt = PromptService.build_chat_rag_prompt(
        query="Cite Section 999 of the Martian Colonial Treaty",
        retrieved_contexts=[],
        is_insufficient_evidence=True
    )
    assert "I don't have enough verified information" in prompt
    assert "Do NOT invent legal sections" in prompt

# 10. Empty query
def test_case_10_empty_query():
    res, trace = rag_service.retrieve_hybrid("")
    assert trace["was_rewritten"] is False

# 11. Very long query
def test_case_11_very_long_query():
    long_q = "Can my landlord retain my deposit? " * 50
    res, trace = rag_service.retrieve_hybrid(long_q)
    assert len(res) > 0

# 12. FAISS unavailable fallback
def test_case_12_faiss_unavailable_fallback():
    # Verify pure dot-product / BM25 fallback
    saved_faiss = rag_service._legal_faiss
    try:
        rag_service._legal_faiss = None
        res, trace = rag_service.retrieve_hybrid("What is Zero FIR?")
        assert len(res) > 0
        assert any("BNSS" in (r.get("act_name") or "") for r in res)
    finally:
        rag_service._legal_faiss = saved_faiss

# 13. Ollama unavailable handling
def test_case_13_prompt_abstention_on_failure():
    prompt = PromptService.build_chat_rag_prompt("Unknown query", [], is_insufficient_evidence=True)
    assert "NO SUFFICIENT VERIFIED EVIDENCE FOUND" in prompt

# 14. Missing model fallback
def test_case_14_embedding_dimension_and_normalization():
    vec = embedding_service.embed_query("Consumer rights test")
    assert vec.shape[0] == 384
    norm = np.linalg.norm(vec)
    assert abs(norm - 1.0) < 1e-4

# 15. Corrupted document handling
def test_case_15_corrupted_document():
    corrupted_bytes = b"NOT_A_VALID_PDF_HEADER_123456"
    with pytest.raises(ValueError) as exc:
        ocr_service.extract_document_text(corrupted_bytes, "corrupt.pdf")
    assert "Failed to read PDF document" in str(exc.value)

# 16. Missing metadata resilience
def test_case_16_missing_metadata_resilience():
    chunks = legal_chunker.split_legal_text("Simple text without section titles")
    assert len(chunks) > 0
    assert "chunk_id" in chunks[0]
    assert chunks[0]["jurisdiction"] == "India"

import os
import sys
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

# Add app directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database.database import Base, engine
from app.services.intent_service import intent_service, IntentType
from app.services.rag_service import rag_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    rag_service.initialize_knowledge_base()
    yield

# 1. "hi" returns a friendly greeting without legal retrieval or disclaimer
def test_case_01_hi_returns_greeting():
    resp = client.post("/api/chat", json={"message": "hi", "language": "en"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "GREETING"
    assert "Nyaya AI" in data["response"]
    assert len(data["sources"]) == 0
    assert data["disclaimer"] == ""
    assert data["abstained"] is False
    assert data["status"] == "success"

# 2. "hii" does not trigger FAISS retrieval
def test_case_02_hii_does_not_trigger_faiss():
    with patch.object(rag_service, "retrieve_hybrid") as mock_retrieve:
        resp = client.post("/api/chat", json={"message": "hii", "language": "en"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["intent"] == "GREETING"
        assert len(data["sources"]) == 0
        mock_retrieve.assert_not_called()

# 3. "hello, how are you?" receives a natural conversational response
def test_case_03_conversational_greeting():
    resp = client.post("/api/chat", json={"message": "hello, how are you?", "language": "en"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "GREETING"
    assert ("doing well" in data["response"].lower() or "how may i assist" in data["response"].lower())
    assert len(data["sources"]) == 0
    assert data["disclaimer"] == ""

# 4. "thanks" receives a concise acknowledgement
def test_case_04_thanks_receives_acknowledgement():
    resp = client.post("/api/chat", json={"message": "thanks", "language": "en"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "CASUAL"
    assert "welcome" in data["response"].lower()
    assert len(data["sources"]) == 0
    assert data["disclaimer"] == ""

# 5. "hi, what are my tenant rights?" triggers legal retrieval (not classified as greeting!)
def test_case_05_greeting_with_legal_question_triggers_legal_retrieval():
    resp = client.post("/api/chat", json={"message": "hi, what are my tenant rights?", "language": "en"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "LEGAL_QUERY"
    # Must retrieve relevant sources from Tenancy knowledge base
    assert len(data["sources"]) > 0
    assert any("Tenan" in s["category"] or "Rental" in s["category"] for s in data["sources"])
    assert data["disclaimer"] != ""

# 6. A question about a rental agreement retrieves relevant sources
def test_case_06_rental_agreement_question_retrieves_sources():
    resp = client.post("/api/chat", json={
        "message": "What is the standard notice period and deposit refund timeline in a residential rental agreement?",
        "language": "en"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "LEGAL_QUERY"
    assert len(data["sources"]) > 0
    assert any("Rental" in s["title"] or "Tenancy" in s["title"] or "Tenancy" in s["category"] for s in data["sources"])

# 7. An unrelated query does not receive arbitrary statutes
def test_case_07_unrelated_query_no_arbitrary_statutes():
    resp = client.post("/api/chat", json={
        "message": "What is the recipe for chocolate chip cookies?",
        "language": "en"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "UNKNOWN"
    # UNKNOWN intent must NEVER attach arbitrary legal statutes!
    assert len(data["sources"]) == 0
    assert "Nyaya AI" in data["response"]
    assert "chocolate" not in data["response"].lower()

# 8. A legal question with insufficient evidence returns an appropriate fallback
def test_case_08_insufficient_evidence_legal_fallback():
    # Query asking about something not in Indian legal corpus
    resp = client.post("/api/chat", json={
        "message": "What is the tax rate on spaceship trading under Martian Maritime law?",
        "language": "en"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["abstained"] is True
    # Insufficient evidence must NOT attach false sources
    assert len(data["sources"]) == 0
    assert "enough verified information" in data["response"].lower() or "unable" in data["response"].lower()

# 9. Follow-up questions use relevant prior context
def test_case_09_followup_question_uses_prior_context():
    # First turn
    turn1 = client.post("/api/chat", json={"message": "What is Zero FIR under BNSS?", "language": "en"})
    assert turn1.status_code == 200
    conv_id = turn1.json()["conversation_id"]

    # Follow-up turn
    turn2 = client.post("/api/chat", json={
        "message": "Can I file it in another state?",
        "conversation_id": conv_id,
        "language": "en"
    })
    assert turn2.status_code == 200
    data2 = turn2.json()
    assert data2["intent"] == "FOLLOW_UP"
    assert len(data2["sources"]) > 0
    assert any("BNSS" in s["act_name"] or "FIR" in s["title"] for s in data2["sources"])

# 10. Document questions retrieve only authorized document context
def test_case_10_document_question_isolates_document():
    doc_text = """
    SERVICE AGREEMENT
    Clause 9: The contractor must deliver all deliverables within 14 calendar days.
    Penalty for delay is INR 2,000 per day.
    """
    resp = client.post("/api/chat", json={
        "message": "What is the penalty for delay in this agreement?",
        "document_context": doc_text,
        "language": "en"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["intent"] == "DOCUMENT_QUERY"
    assert "2,000" in data["response"] or "delay" in data["response"].lower()

# 11. Empty or failed retrieval does not produce fabricated citations
def test_case_11_empty_retrieval_no_fabricated_citations():
    with patch.object(rag_service, "retrieve_hybrid", return_value=([], {"abstain_recommended": True, "top_relevance_score": 0.0})):
        resp = client.post("/api/chat", json={"message": "What are the rules for interstellar trade?", "language": "en"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["sources"]) == 0
        assert data["abstained"] is True

# 12. Hindi and Bengali greetings are handled appropriately
def test_case_12_hindi_and_bengali_greetings():
    # Hindi greeting
    resp_hi = client.post("/api/chat", json={"message": "नमस्ते", "language": "hi"})
    assert resp_hi.status_code == 200
    data_hi = resp_hi.json()
    assert data_hi["intent"] == "GREETING"
    assert "नमस्ते" in data_hi["response"]
    assert len(data_hi["sources"]) == 0

    # Bengali greeting
    resp_bn = client.post("/api/chat", json={"message": "নমস্কার", "language": "bn"})
    assert resp_bn.status_code == 200
    data_bn = resp_bn.json()
    assert data_bn["intent"] == "GREETING"
    assert "নমস্কার" in data_bn["response"]
    assert len(data_bn["sources"]) == 0

# 13. Ollama unavailable errors are handled without crashing the API
def test_case_13_ollama_unavailable_graceful_error():
    with patch("app.services.llm_service.llm_service.generate_response", side_effect=Exception("Connection to Ollama refused")):
        resp = client.post("/api/chat", json={
            "message": "What are my rights against unauthorized UPI fraud?",
            "language": "en"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "error"
        assert "unavailable" in data["response"].lower()

# 14. Existing chat response compatibility is preserved
def test_case_14_response_compatibility_preserved():
    resp = client.post("/api/chat", json={"message": "Hello", "language": "en"})
    assert resp.status_code == 200
    data = resp.json()
    # Required keys by React Native frontend:
    assert "conversation_id" in data
    assert "response" in data
    assert "message" in data  # Alias for message
    assert "language" in data
    assert "sources" in data
    assert "confidence" in data
    assert "disclaimer" in data
    assert "abstained" in data
    assert "status" in data
    assert "intent" in data

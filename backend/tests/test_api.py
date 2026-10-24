import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add app directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["api"] == "healthy"
    assert data["database"] == "healthy"
    assert "ollama" in data
    assert "model" in data
    assert data["model"] == "qwen2.5:3b"

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Nyaya AI" in data["project"]

def test_auth_workflow():
    test_email = f"user_{os.urandom(4).hex()}@test.com"
    # Register
    reg_resp = client.post("/api/auth/register", json={
        "email": test_email,
        "password": "SecurePassword123!",
        "full_name": "Test Citizen",
        "preferred_language": "en"
    })
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    token = reg_data["access_token"]

    # Login
    login_resp = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "SecurePassword123!"
    })
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    login_token = login_data["access_token"]

    # Current User
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {login_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == test_email

def test_chat_endpoint_with_rag():
    resp = client.post("/api/chat", json={
        "message": "My landlord is refusing to return my security deposit of Rs 50000. What are my rights?",
        "language": "en",
        "use_rag": True
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "response" in data
    assert "conversation_id" in data
    assert len(data["sources"]) > 0
    assert any("Tenancy" in s["category"] for s in data["sources"])

def test_scenarios_workflow():
    list_resp = client.get("/api/scenarios")
    assert list_resp.status_code == 200
    scenarios = list_resp.json()
    assert len(scenarios) > 0
    sc_id = scenarios[0]["id"]

    # Submit answer
    answer_resp = client.post("/api/scenarios/answer", json={
        "scenario_id": sc_id,
        "selected_option_ids": ["opt_1a", "opt_2a"]
    })
    assert answer_resp.status_code == 200
    res = answer_resp.json()
    assert "total_score" in res
    assert "legal_awareness_rating" in res

def test_scanner_upload_rental_agreement():
    rental_text = """
    RESIDENTIAL RENTAL AGREEMENT
    This Agreement is entered into on 1st January 2026 between Shri Rajesh Kumar (Landlord/Lessor)
    and Sayan Das (Tenant/Lessee) for Premises at Flat 402, Green Valley Apartments, Kolkata.
    1. Monthly Rent: Rs. 20,000 payable by 5th of each calendar month.
    2. Security Deposit: Tenant has deposited Rs. 60,000 as refundable interest-free security deposit.
       Said deposit shall be refunded within 10 days of vacating after damage deductions.
    3. Lock-in Period: Both parties agree to a lock-in period of 6 months. Early vacating will forfeit deposit.
    4. Notice Period: Either party may terminate with 1 month written notice post lock-in period.
    5. Jurisdiction: Courts in Kolkata shall have exclusive dispute jurisdiction.
    """
    files = {
        "file": ("rental_agreement.txt", rental_text.encode("utf-8"), "text/plain")
    }
    resp = client.post("/api/scanner/upload", files=files, data={"language": "en"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_legal_document"] is True
    assert "Rental Agreement" in data["document_type"]
    assert len(data["important_clauses"]) >= 2
    assert len(data["potential_risks"]) >= 1
    assert "disclaimer" in data

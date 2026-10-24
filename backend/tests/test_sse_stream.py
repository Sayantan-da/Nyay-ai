import os
import sys
import json
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database.database import Base, engine
from app.services.rag_service import rag_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    rag_service.initialize_knowledge_base()
    yield

def test_sse_stream_greeting():
    """Verify that greetings stream via SSE with meta, tokens, and done events."""
    with client.stream("POST", "/api/chat/stream", json={"message": "hi", "language": "en"}) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")

        events = []
        for line in resp.iter_lines():
            if line and line.startswith("data:"):
                json_str = line[5:].strip()
                events.append(json.loads(json_str))

        event_types = [e["type"] for e in events]
        assert "meta" in event_types
        assert "sources" in event_types
        assert "token" in event_types
        assert "done" in event_types

        meta_event = next(e for e in events if e["type"] == "meta")
        assert meta_event["intent"] == "GREETING"

        token_text = "".join(e["token"] for e in events if e["type"] == "token")
        assert "Nyaya AI" in token_text

def test_sse_stream_legal_query():
    """Verify that legal queries stream via SSE with retrieved sources and streamed tokens."""
    with client.stream("POST", "/api/chat/stream", json={"message": "What is Zero FIR under BNSS?", "language": "en"}) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")

        events = []
        for line in resp.iter_lines():
            if line and line.startswith("data:"):
                json_str = line[5:].strip()
                events.append(json.loads(json_str))

        event_types = [e["type"] for e in events]
        assert "meta" in event_types
        assert "sources" in event_types
        assert "token" in event_types
        assert "done" in event_types

        sources_event = next(e for e in events if e["type"] == "sources")
        assert len(sources_event["sources"]) > 0
        assert any("BNSS" in s.get("act_name", "") or "FIR" in s.get("title", "") for s in sources_event["sources"])

        done_event = next(e for e in events if e["type"] == "done")
        assert done_event["status"] == "success"
        assert done_event["disclaimer"] != ""

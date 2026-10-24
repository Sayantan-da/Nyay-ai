import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="Citizen")
    preferred_language = Column(String(50), default="en")  # en, hi, bn
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("DocumentRecord", back_populates="user", cascade="all, delete-orphan")
    scenario_attempts = relationship("ScenarioAttempt", back_populates="user", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(255), default="Legal Inquiry")
    language = Column(String(50), default="en")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender = Column(String(50), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    sources_json = Column(Text, default="[]")  # Retrieved RAG citations
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

class DocumentRecord(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="documents")
    analysis = relationship("DocumentAnalysisRecord", back_populates="document", uselist=False, cascade="all, delete-orphan")

class DocumentAnalysisRecord(Base):
    __tablename__ = "document_analyses"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    is_legal_document = Column(Boolean, default=True)
    document_type = Column(String(255), default="General Document")
    confidence = Column(Float, default=0.9)
    summary = Column(Text, default="")
    important_clauses_json = Column(Text, default="[]")
    potential_risks_json = Column(Text, default="[]")
    recommendations_json = Column(Text, default="[]")
    disclaimer = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("DocumentRecord", back_populates="analysis")

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)  # Tenancy, Cybercrime, Consumer, Workplace, Police
    role = Column(String(100), default="Citizen")   # Tenant, Consumer, Employee, Citizen
    description = Column(Text, nullable=False)
    initial_prompt = Column(Text, nullable=False)
    options_json = Column(Text, default="[]")       # List of interactive steps with choices and legal outcomes
    difficulty = Column(String(50), default="Medium")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ScenarioAttempt(Base):
    __tablename__ = "scenario_attempts"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    score = Column(Integer, default=0)
    decisions_json = Column(Text, default="[]")
    feedback = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="scenario_attempts")

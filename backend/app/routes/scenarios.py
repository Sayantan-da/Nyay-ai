import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.database import get_db
from app.database.models import Scenario, ScenarioAttempt, User
from app.utils.security import get_current_user_optional

router = APIRouter(prefix="/scenarios", tags=["Legal Scenario Simulator"])

class ScenarioOption(BaseModel):
    id: str
    text: str
    legal_awareness_points: int
    explanation: str

class ScenarioStep(BaseModel):
    step_number: int
    situation: str
    options: List[ScenarioOption]

class ScenarioItem(BaseModel):
    id: int
    title: str
    category: str
    role: str
    description: str
    difficulty: str
    steps: List[ScenarioStep]

class SubmitAnswerRequest(BaseModel):
    scenario_id: int
    selected_option_ids: List[str]

class ScenarioResultResponse(BaseModel):
    scenario_id: int
    total_score: int
    max_score: int
    legal_awareness_rating: str  # Excellent, Proficient, Needs Improvement
    feedback: List[str]
    educational_summary: str

INITIAL_SCENARIOS = [
    {
        "title": "Unauthorized UPI Debit & Golden Hour Response",
        "category": "Cybercrime",
        "role": "Digital Citizen",
        "difficulty": "Beginner",
        "description": "You receive an SMS that Rs. 25,000 was debited via UPI to an unknown merchant without your approval. What do you do first?",
        "steps": [
            {
                "step_number": 1,
                "situation": "You discover the unauthorized debit at 9:00 PM. The bank branch is closed.",
                "options": [
                    {
                        "id": "opt_1a",
                        "text": "Immediately dial 1930 (National Cyber Crime Helpline) and freeze UPI / card on banking app.",
                        "legal_awareness_points": 10,
                        "explanation": "Correct! Dialing 1930 during the 'golden hour' enables law enforcement and payment switches to freeze the money in the fraudster's account."
                    },
                    {
                        "id": "opt_1b",
                        "text": "Wait until morning to visit the physical bank branch.",
                        "legal_awareness_points": 2,
                        "explanation": "Waiting allows scammers to cash out the stolen funds through multiple mule accounts, making recovery extremely difficult."
                    },
                    {
                        "id": "opt_1c",
                        "text": "Search for a customer care phone number on Google and call the top ad link.",
                        "legal_awareness_points": 0,
                        "explanation": "Dangerous! Fake customer care numbers on Google search are a common scam tactic to steal remaining funds."
                    }
                ]
            },
            {
                "step_number": 2,
                "situation": "After reporting to 1930, you need to register a formal complaint and claim zero-liability with the bank.",
                "options": [
                    {
                        "id": "opt_2a",
                        "text": "File complaint on cybercrime.gov.in, note acknowledgment number, and notify bank within 3 days.",
                        "legal_awareness_points": 10,
                        "explanation": "Under RBI circulars, reporting unauthorized electronic transactions within 3 days protects you from customer liability."
                    },
                    {
                        "id": "opt_2b",
                        "text": "Delete all SMS messages and uninstall your banking app.",
                        "legal_awareness_points": 0,
                        "explanation": "Deleting messages destroys crucial transaction evidence required under BSA 2023 for cyber investigation."
                    }
                ]
            }
        ]
    },
    {
        "title": "Landlord Refusing Security Deposit Refund",
        "category": "Rental/Tenancy",
        "role": "Tenant",
        "difficulty": "Intermediate",
        "description": "Your 11-month lease ends. You hand over the clean apartment, but the landlord refuses to return your Rs. 60,000 deposit claiming non-existent damages.",
        "steps": [
            {
                "step_number": 1,
                "situation": "The landlord ignores your phone calls and WhatsApp messages asking for the deposit return.",
                "options": [
                    {
                        "id": "opt_t1a",
                        "text": "Compile joint inspection photos, rent receipts, and send a formal written notice with a 15-day deadline.",
                        "legal_awareness_points": 10,
                        "explanation": "Proper legal procedure starts with an evidentiary record and a formal written notice giving a specific compliance timeline."
                    },
                    {
                        "id": "opt_t1b",
                        "text": "Refuse to vacate the flat and change the locks.",
                        "legal_awareness_points": 3,
                        "explanation": "Illegal trespass or holding possession post lease expiry weakens your legal standing."
                    }
                ]
            },
            {
                "step_number": 2,
                "situation": "The landlord still refuses to respond to the written notice.",
                "options": [
                    {
                        "id": "opt_t2a",
                        "text": "Send an advocate legal notice or file a petition before the Rent Authority / Small Causes Court.",
                        "legal_awareness_points": 10,
                        "explanation": "A formal legal notice followed by Rent Authority or summary civil suit (Order 37 CPC) is the lawful remedy for debt recovery."
                    },
                    {
                        "id": "opt_t2b",
                        "text": "Post defamatory abuse on social media tagging the landlord's relatives.",
                        "legal_awareness_points": 1,
                        "explanation": "Public defamation can expose you to counter legal notices or criminal defamation under Section 356 BNS."
                    }
                ]
            }
        ]
    },
    {
        "title": "Police Refusal to File FIR (Zero FIR Right)",
        "category": "Criminal Law & Rights",
        "role": "Citizen",
        "difficulty": "Intermediate",
        "description": "Your bag was stolen in another city. The local police station refuses to register your complaint, stating: 'The crime happened elsewhere, go there.'",
        "steps": [
            {
                "step_number": 1,
                "situation": "The officer asks you to travel 300 km to the place of occurrence.",
                "options": [
                    {
                        "id": "opt_p1a",
                        "text": "Politely request the officer to register a 'Zero FIR' under Section 173 of BNSS 2023.",
                        "legal_awareness_points": 10,
                        "explanation": "Under Section 173 BNSS (and Supreme Court Lalita Kumari guidelines), police MUST register a Zero FIR regardless of territory."
                    },
                    {
                        "id": "opt_p1b",
                        "text": "Argue loudly and physically block the police station entrance.",
                        "legal_awareness_points": 1,
                        "explanation": "Obstructing public servants in the discharge of public functions is an offence under Section 221 BNS."
                    }
                ]
            }
        ]
    }
]

def seed_scenarios_if_empty(db: Session):
    count = db.query(Scenario).count()
    if count == 0:
        for s in INITIAL_SCENARIOS:
            sc = Scenario(
                title=s["title"],
                category=s["category"],
                role=s["role"],
                difficulty=s["difficulty"],
                description=s["description"],
                initial_prompt=s["description"],
                options_json=json.dumps(s["steps"])
            )
            db.add(sc)
        db.commit()

@router.get("", response_model=List[ScenarioItem])
def get_all_scenarios(db: Session = Depends(get_db)):
    seed_scenarios_if_empty(db)
    scenarios = db.query(Scenario).all()
    results = []
    for s in scenarios:
        try:
            steps_data = json.loads(s.options_json or "[]")
        except Exception:
            steps_data = []
        results.append(ScenarioItem(
            id=s.id,
            title=s.title,
            category=s.category,
            role=s.role,
            description=s.description,
            difficulty=s.difficulty,
            steps=steps_data
        ))
    return results

@router.post("/answer", response_model=ScenarioResultResponse)
def evaluate_scenario_answers(
    req: SubmitAnswerRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    sc = db.query(Scenario).filter(Scenario.id == req.scenario_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Scenario not found")

    steps_data = json.loads(sc.options_json or "[]")
    total_score = 0
    max_score = 0
    feedback_list = []

    for step in steps_data:
        options = step.get("options", [])
        step_max = max((opt.get("legal_awareness_points", 0) for opt in options), default=10)
        max_score += step_max
        for opt in options:
            if opt.get("id") in req.selected_option_ids:
                pts = opt.get("legal_awareness_points", 0)
                total_score += pts
                feedback_list.append(f"Decision '{opt.get('text')[:40]}...': {opt.get('explanation')}")

    # Rating
    pct = (total_score / max_score * 100) if max_score > 0 else 0
    if pct >= 80:
        rating = "Excellent Legal Literacy"
    elif pct >= 50:
        rating = "Proficient Awareness"
    else:
        rating = "Needs Improvement"

    # Save attempt
    try:
        attempt = ScenarioAttempt(
            scenario_id=sc.id,
            user_id=current_user.id if current_user else None,
            score=total_score,
            decisions_json=json.dumps(req.selected_option_ids),
            feedback=f"Score: {total_score}/{max_score}. Rating: {rating}."
        )
        db.add(attempt)
        db.commit()
    except Exception:
        db.rollback()

    return ScenarioResultResponse(
        scenario_id=sc.id,
        total_score=total_score,
        max_score=max_score,
        legal_awareness_rating=rating,
        feedback=feedback_list,
        educational_summary=f"In this scenario, understanding procedural rights (such as time-sensitive reporting and formal notices) is key to asserting your rights lawfully."
    )

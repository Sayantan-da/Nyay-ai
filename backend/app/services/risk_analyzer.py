import re
from typing import List, Dict, Any
from app.models.analysis_models import ImportantClause, PotentialRisk

class RiskAnalyzer:
    @staticmethod
    def analyze_clauses_heuristically(text: str, document_type: str) -> Dict[str, Any]:
        """Examine document text for key contractual provisions and potential concerns."""
        text_lower = text.lower()
        clauses: List[ImportantClause] = []
        risks: List[PotentialRisk] = []
        recommendations: List[str] = []

        # 1. Lock-in Period Analysis
        lock_in_match = re.search(r'(?i)(lock[\s-]?in period of (\d+) (months|years)|minimum stay of (\d+) months)', text)
        if lock_in_match:
            snippet = lock_in_match.group(0)
            clauses.append(ImportantClause(
                title="Lock-in Commitment",
                text=snippet,
                importance="high",
                explanation="Specifies a minimum binding duration during which neither party can terminate without penalty."
            ))
            risks.append(PotentialRisk(
                title="Early Termination Restriction (Lock-in)",
                severity="medium",
                explanation="Vacating or breaking the agreement during the lock-in period typically involves forfeiture of security deposit or penalty rent.",
                source_context=snippet
            ))
            recommendations.append("Verify whether the lock-in period aligns with your planned duration of stay or employment.")

        # 2. Security Deposit Analysis
        deposit_match = re.search(r'(?i)(security deposit(?: of)? (?:rs\.?|inr)?\s*[\d,]+|refundable (?:interest[\s-]?free )?security deposit|interest[\s-]?free refundable deposit|security deposit)', text)
        if deposit_match:
            snippet = deposit_match.group(0)
            clauses.append(ImportantClause(
                title="Security Deposit",
                text=snippet,
                importance="high",
                explanation="Refundable monetary sum held by the party against possible damages or unpaid dues."
            ))
            
            # Check for forfeiture or refund timeline
            if "non-refundable" in text_lower:
                risks.append(PotentialRisk(
                    title="Non-Refundable Deposit Warning",
                    severity="high",
                    explanation="A clause terms the deposit non-refundable, which is unusual for standard tenancy agreements.",
                    source_context="non-refundable deposit clause found"
                ))
                recommendations.append("Clarify with the owner why the deposit is non-refundable and seek written amendment.")
            else:
                recommendations.append("Ensure written agreement states exact timeline for deposit return (e.g. within 7 to 14 days of handover).")

        # 3. Notice Period & Termination
        notice_match = re.search(r'(?i)(notice period of (\d+) (months?|days?)|giving (\d+) (months?|days?) written notice)', text)
        if notice_match:
            snippet = notice_match.group(0)
            clauses.append(ImportantClause(
                title="Notice Period for Termination",
                text=snippet,
                importance="high",
                explanation="Advance written notice required before either party can end the agreement."
            ))

        # Check for unilateral termination
        if re.search(r'(?i)(terminate immediately without notice|terminate at sole discretion)', text):
            risks.append(PotentialRisk(
                title="Unilateral Immediate Termination",
                severity="high",
                explanation="One party reserves the right to terminate without adequate prior notice, causing disruption.",
                source_context="immediate termination at sole discretion"
            ))
            recommendations.append("Negotiate mutual notice periods of equal duration (e.g. 30 days for both parties).")

        # 4. Dispute Resolution & Jurisdiction
        jurisdiction_match = re.search(r'(?i)(jurisdiction of the courts (?:at|in) ([a-zA-Z\s]+)|arbitration in ([a-zA-Z\s]+))', text)
        if jurisdiction_match:
            snippet = jurisdiction_match.group(0)
            clauses.append(ImportantClause(
                title="Jurisdiction & Dispute Resolution",
                text=snippet,
                importance="medium",
                explanation="Designates which court or city has exclusive power to adjudicate disputes arising from this contract."
            ))
            recommendations.append("Ensure the agreed court jurisdiction is in a convenient local city where you reside.")

        # 5. Penalties and Late Fees
        penalty_match = re.search(r'(?i)(penalty of (?:rs\.?|inr)?\s*[\d,]+|interest of (\d+)%\s*per (?:month|annum))', text)
        if penalty_match:
            snippet = penalty_match.group(0)
            clauses.append(ImportantClause(
                title="Late Payment Penalty / Interest",
                text=snippet,
                importance="medium",
                explanation="Financial penal charges applied if monthly obligations are delayed beyond due date."
            ))
            risks.append(PotentialRisk(
                title="Delay Penalty Charges",
                severity="low",
                explanation="Check whether the rate of interest or daily penalty for delay is reasonable.",
                source_context=snippet
            ))

        # General recommendations if list is short
        if not recommendations:
            recommendations = [
                "Carefully inspect all dates, monetary amounts, and signatures before executing.",
                "Maintain duplicate signed copies of the document and all associated transaction receipts.",
                "Seek independent legal advice if any clause appears ambiguous or one-sided."
            ]

        return {
            "clauses": clauses,
            "risks": risks,
            "recommendations": recommendations
        }

risk_analyzer = RiskAnalyzer()

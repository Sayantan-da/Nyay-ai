import os
import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from app.services.embedding_service import embedding_service
from app.services.legal_chunker import legal_chunker
from app.services.reranker_service import reranker_service
from app.services.query_service import query_service

logger = logging.getLogger("nyaya.rag")

# Configurable Retrieval Parameters
RETRIEVAL_TOP_K = 15      # candidate pool depth from each retriever
FINAL_CONTEXT_K = 4       # top re-ranked passages to pass to LLM
CONFIDENCE_HIGH_THRESHOLD = 0.65
CONFIDENCE_MODERATE_THRESHOLD = 0.40

# Structured Verified Statutory Knowledge Base (Schema compliant with Section 2)
STRUCTURED_LEGAL_CORPUS: List[Dict[str, Any]] = [
    {
        "chunk_id": "cpa_2019_sec35_edaakhil",
        "act_name": "Consumer Protection Act, 2019",
        "section_number": "35",
        "section_title": "Manner in which complaint shall be made (e-Daakhil)",
        "topic": "Consumer Grievance Redressal & E-Commerce",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "Ministry of Consumer Affairs / CPA 2019",
        "page_number": None,
        "title": "Consumer Protection Act 2019 - Defective Goods, Refunds & e-Daakhil",
        "category": "Consumer Rights",
        "text": """Under Section 35 of the Consumer Protection Act, 2019, consumers can file complaints electronically through the e-Daakhil portal (edaakhil.nic.in).
Consumers have rights against unfair trade practices, defective products, deficient services, and misleading advertisements.
E-commerce marketplaces and sellers are legally obligated to process refunds or replacements for defective goods.
Key Steps:
1. Send a written notice/email to customer support preserving invoice, delivery tracking, and photos of defects.
2. File a grievance with the National Consumer Helpline at 1915 or portal consumerhelpline.gov.in.
3. If unresolved, file an e-complaint on e-Daakhil before the District Consumer Commission based on claim value."""
    },
    {
        "chunk_id": "it_act_sec66c_cybercrime",
        "act_name": "Information Technology Act, 2000 & BNS 2023",
        "section_number": "66C/66D",
        "section_title": "Identity Theft and Cheating by Personation using Computer Resource",
        "topic": "Cybercrime, Online Scams & UPI Financial Fraud",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "Indian Cyber Crime Coordination Centre (I4C) & IT Act 2000",
        "page_number": None,
        "title": "Cybercrime, Online Scams & UPI Financial Fraud (Helpline 1930)",
        "category": "Cybercrime",
        "text": """For unauthorized UPI transactions, bank debit scams, fake payment links, or task fraud:
Immediate Golden Hour Actions:
1. Call 1930 immediately (National Cyber Crime Reporting Helpline) to freeze fraudulent transactions across bank and payment gateway nodes.
2. Immediately notify your bank within 3 working days under RBI circular guidelines to limit unauthorized liability to zero.
3. File an official cyber complaint at https://cybercrime.gov.in/ with transaction IDs, UPI reference numbers, SMS alerts, and screenshots.
Relevant Provisions: IT Act Section 66C (identity theft), Section 66D (cheating by personation), and Bharatiya Nyaya Sanhita (BNS) Section 318 (Cheating)."""
    },
    {
        "chunk_id": "model_tenancy_deposit_refund",
        "act_name": "Model Tenancy Act & Indian Contract Act, 1872",
        "section_number": "11/73",
        "section_title": "Security Deposit Return, Lock-in Periods and Non-Refundable Covenants",
        "topic": "Rental & Tenancy Rights",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "Ministry of Housing and Urban Affairs & Indian Contract Act",
        "page_number": None,
        "title": "Rental & Tenancy Agreements - Deposits and Termination",
        "category": "Rental/Tenancy",
        "text": """Key tenant rights and standard clauses in residential tenancy agreements:
1. Security Deposit: Landlords must refund security deposits upon vacant handover after legitimate utility or damage deductions. Unreasonable deductions or total forfeiture without proof violates contractual covenants.
2. Notice Period & Lock-in: A notice period (typically 1 month) governs lease termination. Terminating early during a lock-in period may involve forfeiture of advance rent, but penalties must be proportionate and agreed in writing.
3. Maintenance & Entry: Landlord cannot enter premises without prior notice (typically 24 hours).
4. Eviction: Landlord cannot forcefully evict a tenant or cut electricity/water without due process of law. Disputes are resolved before Rent Authorities or civil courts."""
    },
    {
        "chunk_id": "bnss_2023_sec173_zero_fir",
        "act_name": "Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023",
        "section_number": "173",
        "section_title": "Information in cognizable cases (Zero FIR)",
        "topic": "Zero FIR Registration & Police Duties",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "BNSS 2023 / Ministry of Home Affairs",
        "page_number": None,
        "title": "BNSS Section 173 - Zero FIR and Cognizable Offenses",
        "category": "Criminal Law & FIR",
        "text": """Under Section 173 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 (replacing CrPC Section 154):
1. Zero FIR: A citizen can register a First Information Report (FIR) at ANY police station irrespective of territorial jurisdiction if a cognizable offense has taken place.
2. Transfer Requirement: The receiving police station must record the FIR, assign a Zero FIR number, initiate immediate preliminary steps if urgent, and transfer the case to the jurisdictional police station.
3. Free Copy: The informant/complainant is entitled to receive a copy of the recorded FIR free of cost immediately.
4. E-FIR: Allows electronic communication of information subject to subsequent signature verification within 3 days."""
    },
    {
        "chunk_id": "bnss_2023_sec35_arrest_rights",
        "act_name": "Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023",
        "section_number": "35",
        "section_title": "Grounds of arrest and right to inform nominated person",
        "topic": "Arrest Safeguards & Bail Notice",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "BNSS 2023 / Ministry of Home Affairs",
        "page_number": None,
        "title": "BNSS Section 35 - Arrest Safeguards & Legal Rights",
        "category": "Criminal Law & FIR",
        "text": """Safeguards for persons arrested under Section 35 of BNSS 2023:
1. Grounds of Arrest: Every police officer arresting any person without warrant must immediately communicate full particulars of the offense and grounds of arrest.
2. Right to Bail: If the offense is bailable, police must inform the person that they are entitled to be released on bail.
3. Nominated Person Notice: Police have a mandatory legal duty to inform a designated relative or friend immediately upon arrest.
4. Medical Examination: The arrested person has the right to be examined by a medical practitioner upon arrest to document physical condition."""
    },
    {
        "chunk_id": "bsa_2023_sec61_63_digital_evidence",
        "act_name": "Bharatiya Sakshya Adhiniyam (BSA), 2023",
        "section_number": "61/63",
        "section_title": "Admissibility of electronic records and chats",
        "topic": "Digital Evidence & Electronic Proof",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "Bharatiya Sakshya Adhiniyam 2023",
        "page_number": None,
        "title": "BSA 2023 Sections 61 & 63 - Digital Records & WhatsApp Evidence",
        "category": "Evidence Law",
        "text": """Under Section 61 and Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023:
Electronic records, WhatsApp/SMS messages, emails, server logs, CCTV footage, and digital audio recordings are legally admissible evidence.
A certificate signed by the person in lawful control of the device or an authorized expert validates digital prints in court.
Preserve digital evidence without altering metadata, timestamps, or headers."""
    },
    {
        "chunk_id": "posh_2013_sec4_9_workplace",
        "act_name": "Sexual Harassment of Women at Workplace (POSH) Act, 2013",
        "section_number": "4/9",
        "section_title": "Constitution of Internal Committee & Complaint Procedure",
        "topic": "Workplace Harassment & Women's Rights",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "POSH Act 2013 / MWCD",
        "page_number": None,
        "title": "POSH Act 2013 - Internal Committee & Redressal Mechanism",
        "category": "Women's Legal Rights",
        "text": """The POSH Act 2013 mandates safe workplace environments:
1. Internal Committee (IC): Every workplace with 10 or more employees must constitute an IC headed by a senior woman presiding officer with at least one external NGO member.
2. Complaint Timeline (Sec 9): Written complaint must be submitted within 3 months of incident (extendable by 3 months by IC).
3. Interim Relief: Complainants may request paid leave up to 3 months or job transfer during inquiry.
4. Confidentiality: Identity of aggrieved party cannot be disclosed under Section 16.
Emergency Helpline: 181 (Women's Helpline)."""
    },
    {
        "chunk_id": "pwdva_2005_domestic_violence",
        "act_name": "Protection of Women from Domestic Violence Act, 2005",
        "section_number": "12/17/18",
        "section_title": "Right to reside in shared household and Protection Orders",
        "topic": "Domestic Violence Safeguards & Reliefs",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "PWDVA 2005",
        "page_number": None,
        "title": "Domestic Violence Act 2005 - Shared Household & Protection Orders",
        "category": "Women's Legal Rights",
        "text": """Under the Protection of Women from Domestic Violence Act, 2005 (PWDVA):
1. Right to Reside (Sec 17): Every woman in a domestic relationship has the right to reside in the shared household and cannot be evicted by the respondent except by due process.
2. Reliefs Available: Protection orders (restraining violence), Residence orders, Monetary relief, and Child custody orders.
3. Access: Contact Protection Officers in the district, Service Providers, or call 181 / 112. Free legal aid is available via NALSA (15100)."""
    },
    {
        "chunk_id": "ni_act_sec138_cheque_bounce",
        "act_name": "Negotiable Instruments Act, 1881",
        "section_number": "138",
        "section_title": "Dishonour of cheque for insufficiency of funds",
        "topic": "Cheque Dishonour, Notice Timeline & Criminal Liability",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "Negotiable Instruments Act 1881",
        "page_number": None,
        "title": "Section 138 NI Act - Cheque Bounce Statutory Process",
        "category": "Commercial Law",
        "text": """When a cheque bounces due to insufficient funds:
1. Statutory Demand Notice: Payee must issue a formal written legal notice to the drawer within 30 days of receiving the cheque return memo.
2. 15-Day Payment Window: The drawer is given 15 days from receipt of notice to make payment.
3. Criminal Complaint: If payment is not made within 15 days, a complaint under Section 138 NI Act must be filed before the Judicial Magistrate within 30 days thereafter.
4. Penalty: Imprisonment up to 2 years, or fine up to twice the cheque amount, or both."""
    },
    {
        "chunk_id": "rti_act_2005_sec6_7",
        "act_name": "Right to Information Act, 2005",
        "section_number": "6/7",
        "section_title": "Request for obtaining information & Disposal of request",
        "topic": "RTI Filing, Fee and Time Limits",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "Right to Information Act 2005",
        "page_number": None,
        "title": "RTI Act 2005 - Citizen Information Access & 30-Day Limit",
        "category": "Citizen Rights",
        "text": """The RTI Act empowers citizens to seek information from public authorities:
1. Application: File online at rtionline.gov.in or in person with Rs. 10 fee (free for BPL citizens).
2. 30-Day Mandatory Limit: Public Information Officer (PIO) must provide information within 30 days.
3. Life & Liberty Exception: If information concerns life or liberty of a person, it must be provided within 48 hours.
4. Appeals: First Appeal to departmental appellate authority within 30 days; Second Appeal to Central/State Information Commission."""
    },
    {
        "chunk_id": "rera_2016_sec14_18",
        "act_name": "Real Estate (Regulation and Development) Act, 2016",
        "section_number": "14/18",
        "section_title": "Adherence to sanctioned plans & Return of amount and compensation",
        "topic": "Buyer Rights, Builder Delays & Workmanship Defect Warranty",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "RERA Act 2016",
        "page_number": None,
        "title": "RERA 2016 - Homebuyer Protection, Builder Delay Compensation",
        "category": "Property Law",
        "text": """Under RERA 2016:
1. Mandatory Registration: Projects over 500 sq meters or 8 apartments must register with RERA.
2. Delayed Possession (Sec 18): Builders failing to complete on agreed schedule must pay monthly prescribed interest or refund full amount with interest upon buyer withdrawal.
3. Structural Warranty: Builder is liable to rectify structural or workmanship defects for 5 years from possession without charge.
4. File complaints before the State RERA Authority portal."""
    },
    {
        "chunk_id": "nalsa_art39a_legal_aid",
        "act_name": "Constitution of India & Legal Services Authorities Act, 1987",
        "section_number": "Article 39A / Sec 12",
        "section_title": "Equal justice, free legal aid and criteria for eligibility",
        "topic": "NALSA Free Legal Aid & Fundamental Rights",
        "jurisdiction": "India",
        "document_type": "statute",
        "language": "English",
        "source": "Constitution of India / NALSA",
        "page_number": None,
        "title": "Article 39A & NALSA - Free Legal Aid (Helpline 15100)",
        "category": "Constitutional Rights",
        "text": """Article 39A of the Constitution of India and the Legal Services Authorities Act, 1987 guarantee free legal aid:
1. Eligibility: Women, children, SC/ST citizens, custody undertrials, and low-income citizens qualify for free legal representation.
2. Services: Free legal counsel for civil and criminal cases, bail applications, and Lok Adalat settlements.
3. Contact: NALSA National Legal Helpline: 15100 or approach the District Legal Services Authority (DLSA)."""
    }
]

class BM25Searcher:
    """Keyword-based BM25 search engine with tokenization and legal term sensitivity."""
    def __init__(self):
        self.corpus_docs: List[Dict[str, Any]] = []
        self._bm25_model = None

    def tokenize(self, text: str) -> List[str]:
        return [w for w in re.findall(r'\b[a-zA-Z0-9_\-]{2,}\b', text.lower())]

    def fit(self, docs: List[Dict[str, Any]]):
        self.corpus_docs = docs
        tokenized_corpus = [self.tokenize(f"{d.get('title','')} {d.get('act_name','')} {d.get('section_number','')} {d.get('topic','')} {d.get('text','')}") for d in docs]
        
        try:
            from rank_bm25 import BM25Okapi
            self._bm25_model = BM25Okapi(tokenized_corpus)
        except Exception as e:
            logger.warning(f"rank_bm25 not available, using pure python BM25 fallback: {e}")
            self._bm25_model = None

    def search(self, query: str, top_k: int = 15) -> List[Tuple[Dict[str, Any], float]]:
        if not self.corpus_docs:
            return []
        tokens = self.tokenize(query)
        if not tokens:
            return [(d, 0.0) for d in self.corpus_docs[:top_k]]

        if self._bm25_model is not None:
            raw_scores = self._bm25_model.get_scores(tokens)
            # Clip negative IDF scores to non-negative [0, inf)
            scores = np.maximum(0.0, raw_scores)
            ranked_indices = np.argsort(scores)[::-1][:top_k]
            results = []
            max_score = float(np.max(scores)) if len(scores) > 0 and np.max(scores) > 0 else 1.0
            for idx in ranked_indices:
                norm_score = float(scores[idx]) / max_score if max_score > 0 else 0.0
                results.append((self.corpus_docs[idx], round(norm_score, 3)))
            return results

        # Fallback keyword overlap scoring
        results = []
        q_set = set(tokens)
        for doc in self.corpus_docs:
            doc_tokens = set(self.tokenize(f"{doc.get('title','')} {doc.get('act_name','')} {doc.get('text','')}"))
            overlap = len(q_set.intersection(doc_tokens))
            score = round(overlap / len(q_set), 3) if q_set else 0.0
            results.append((doc, score))
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

class RAGService:
    """
    Advanced Hybrid RAG Service.
    - Two RAG sources: Legal Knowledge RAG + User Document RAG
    - Hybrid Retrieval: BM25 Okapi + FAISS IndexFlatIP(384)
    - Fusion via Reciprocal Rank Fusion (RRF)
    - Re-ranking via local ReRankerService
    - Confidence Assessment and Safe Abstention
    - Full Retrieval Traceability for evaluation
    """
    def __init__(self):
        # 1. Legal Knowledge RAG Source
        self.legal_corpus: List[Dict[str, Any]] = []
        self.legal_embeddings: Optional[np.ndarray] = None
        self._legal_faiss = None
        self._legal_bm25 = BM25Searcher()

        # 2. User Document RAG Source (per-document chunks)
        self.user_doc_chunks: List[Dict[str, Any]] = []
        self.user_doc_embeddings: Optional[np.ndarray] = None
        self._user_faiss = None
        self._user_bm25 = BM25Searcher()

        self._initialized = False

    @property
    def documents(self) -> List[Dict[str, Any]]:
        """Backwards compatibility alias for legal_corpus."""
        return self.legal_corpus

    def initialize_knowledge_base(self):
        if self._initialized:
            return
        logger.info("Initializing Nyaya Advanced Hybrid RAG Knowledge Base...")
        self.legal_corpus = list(STRUCTURED_LEGAL_CORPUS)
        
        # Build BM25 index
        self._legal_bm25.fit(self.legal_corpus)

        # Build FAISS index with L2 normalized 384-d vectors
        texts_to_embed = [
            f"{d['act_name']} Section {d.get('section_number', '')}: {d.get('section_title', '')}\nTopic: {d.get('topic', '')}\n{d['text']}"
            for d in self.legal_corpus
        ]
        self.legal_embeddings = embedding_service.embed_texts(texts_to_embed)

        try:
            import faiss
            dim = self.legal_embeddings.shape[1]
            self._legal_faiss = faiss.IndexFlatIP(dim)  # Inner Product == Cosine similarity for normalized vectors
            self._legal_faiss.add(self.legal_embeddings)
            logger.info(f"Legal FAISS index built with {len(self.legal_corpus)} structured chunks (dim={dim}).")
        except Exception as e:
            logger.warning(f"FAISS init fallback: {e}")
            self._legal_faiss = None

        self._initialized = True

    def add_user_document_text(self, filename: str, doc_type: str, cleaned_text: str):
        """Indexes an uploaded user document into the User Document RAG source using legal structure chunking."""
        chunks = legal_chunker.split_legal_text(
            text=cleaned_text,
            document_title=filename,
            document_type=doc_type,
            act_name=f"Contract: {filename}"
        )
        if not chunks:
            return

        self.user_doc_chunks.extend(chunks)
        self._user_bm25.fit(self.user_doc_chunks)

        chunk_texts = [f"{c.get('section_title', '')}\n{c['text']}" for c in chunks]
        new_embs = embedding_service.embed_texts(chunk_texts)

        if self.user_doc_embeddings is not None:
            self.user_doc_embeddings = np.vstack([self.user_doc_embeddings, new_embs])
        else:
            self.user_doc_embeddings = new_embs

        try:
            import faiss
            dim = new_embs.shape[1]
            if self._user_faiss is None:
                self._user_faiss = faiss.IndexFlatIP(dim)
            self._user_faiss.add(new_embs)
            logger.info(f"User Document '{filename}' indexed with {len(chunks)} structured chunks.")
        except Exception as e:
            logger.warning(f"User Document FAISS index update fallback: {e}")

    def _reciprocal_rank_fusion(
        self,
        bm25_results: List[Tuple[Dict[str, Any], float]],
        faiss_results: List[Tuple[Dict[str, Any], float]],
        rrf_k: int = 60
    ) -> List[Dict[str, Any]]:
        """Merges BM25 and FAISS results using Reciprocal Rank Fusion."""
        doc_scores: Dict[str, Dict[str, Any]] = {}

        for rank, (doc, score) in enumerate(bm25_results):
            doc_id = doc.get("chunk_id") or doc.get("id") or str(id(doc))
            if doc_id not in doc_scores:
                doc_scores[doc_id] = {"doc": doc, "rrf_score": 0.0, "bm25_score": score, "faiss_score": 0.0}
            doc_scores[doc_id]["rrf_score"] += 1.0 / (rrf_k + rank + 1)
            doc_scores[doc_id]["bm25_score"] = score

        for rank, (doc, score) in enumerate(faiss_results):
            doc_id = doc.get("chunk_id") or doc.get("id") or str(id(doc))
            if doc_id not in doc_scores:
                doc_scores[doc_id] = {"doc": doc, "rrf_score": 0.0, "bm25_score": 0.0, "faiss_score": score}
            doc_scores[doc_id]["rrf_score"] += 1.0 / (rrf_k + rank + 1)
            doc_scores[doc_id]["faiss_score"] = score

        merged = []
        for d_id, data in doc_scores.items():
            doc_item = dict(data["doc"])
            doc_item["rrf_score"] = round(data["rrf_score"], 4)
            doc_item["bm25_score"] = round(data["bm25_score"], 3)
            doc_item["faiss_score"] = round(data["faiss_score"], 3)
            # Default similarity is hybrid weighted combination
            doc_item["similarity_score"] = round(0.5 * data["faiss_score"] + 0.5 * data["bm25_score"], 3)
            merged.append(doc_item)

        merged.sort(key=lambda x: x["rrf_score"], reverse=True)
        return merged

    def retrieve_hybrid(
        self,
        query: str,
        retrieval_k: int = RETRIEVAL_TOP_K,
        final_k: int = FINAL_CONTEXT_K,
        include_user_docs: bool = True
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Executes complete Hybrid Retrieval (BM25 + FAISS + Re-ranking).
        Returns: (final_chunks, debug_trace)
        """
        if not self._initialized:
            self.initialize_knowledge_base()

        # 1. Query Understanding & Rewriting
        rewritten_query, was_rewritten = query_service.rewrite_for_retrieval(query)

        # 2. Search Legal Knowledge Source
        # 2a. BM25 Search
        bm25_candidates = self._legal_bm25.search(rewritten_query, top_k=retrieval_k)

        # 2b. FAISS Dense Semantic Search
        q_vec = embedding_service.embed_query(rewritten_query)
        q_vec_arr = np.array([q_vec], dtype="float32")

        faiss_candidates = []
        if self._legal_faiss is not None:
            scores, indices = self._legal_faiss.search(q_vec_arr, retrieval_k)
            for score, idx in zip(scores[0], indices[0]):
                if 0 <= idx < len(self.legal_corpus):
                    faiss_candidates.append((self.legal_corpus[idx], float(score)))
        else:
            dot_scores = np.dot(self.legal_embeddings, q_vec_arr[0])
            top_idxs = np.argsort(dot_scores)[::-1][:retrieval_k]
            for idx in top_idxs:
                faiss_candidates.append((self.legal_corpus[idx], float(dot_scores[idx])))

        # 3. Fuse Legal Knowledge Candidates via RRF
        merged_candidates = self._reciprocal_rank_fusion(bm25_candidates, faiss_candidates)

        # 4. If User Documents exist and requested, retrieve and fuse user document chunks
        user_candidates = []
        if include_user_docs and self.user_doc_chunks:
            user_bm25 = self._user_bm25.search(rewritten_query, top_k=5)
            user_faiss = []
            if self._user_faiss is not None:
                u_scores, u_indices = self._user_faiss.search(q_vec_arr, 5)
                for s, idx in zip(u_scores[0], u_indices[0]):
                    if 0 <= idx < len(self.user_doc_chunks):
                        user_faiss.append((self.user_doc_chunks[idx], float(s)))
            user_candidates = self._reciprocal_rank_fusion(user_bm25, user_faiss)
            # Prepend top user contract passages
            merged_candidates = user_candidates[:2] + merged_candidates

        # 5. Re-ranking Stage
        reranked_results = reranker_service.rerank(
            query=query,
            candidates=merged_candidates[:retrieval_k],
            top_k=final_k
        )

        # 6. Confidence & Abstention Evaluation
        top_score = reranked_results[0]["similarity_score"] if reranked_results else 0.0
        if top_score >= CONFIDENCE_HIGH_THRESHOLD:
            confidence_level = "strong"
            abstain = False
        elif top_score >= CONFIDENCE_MODERATE_THRESHOLD:
            confidence_level = "moderate"
            abstain = False
        else:
            confidence_level = "insufficient"
            abstain = True

        debug_trace = {
            "original_query": query,
            "rewritten_query": rewritten_query,
            "was_rewritten": was_rewritten,
            "bm25_candidates_count": len(bm25_candidates),
            "faiss_candidates_count": len(faiss_candidates),
            "merged_candidates_count": len(merged_candidates),
            "final_top_k": len(reranked_results),
            "top_relevance_score": top_score,
            "confidence_level": confidence_level,
            "abstain_recommended": abstain
        }

        return reranked_results, debug_trace

    def retrieve(self, query: str, top_k: int = 3, threshold: float = 0.01) -> List[Dict[str, Any]]:
        """Preserves backwards-compatible API contract for existing callers."""
        final_chunks, _ = self.retrieve_hybrid(query=query, final_k=top_k)
        return final_chunks

    def add_document(self, title: str, category: str, text: str, source: str = "User Uploaded"):
        """Backwards compatibility for document addition."""
        self.add_user_document_text(filename=source, doc_type=category, cleaned_text=text)

rag_service = RAGService()

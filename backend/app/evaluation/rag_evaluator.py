import os
import sys
import json
import time
import logging
from typing import List, Dict, Any, Tuple
import numpy as np

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.services.rag_service import rag_service, STRUCTURED_LEGAL_CORPUS, BM25Searcher
from app.services.embedding_service import embedding_service
from app.services.reranker_service import reranker_service
from app.services.query_service import query_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nyaya.evaluator")

def is_match(retrieved_doc: Dict[str, Any], tc: Dict[str, Any]) -> bool:
    """Verifies whether a retrieved chunk matches the expected test case criteria."""
    exp_source = tc.get("expected_source", "")
    exp_sec = tc.get("expected_section", "")
    exp_topic = tc.get("expected_topic", "")

    if exp_source == "NONE":
        return False

    doc_act = retrieved_doc.get("act_name", "")
    doc_title = retrieved_doc.get("title", "")
    doc_sec = str(retrieved_doc.get("section_number", ""))
    doc_topic = retrieved_doc.get("topic", "")

    # Match by Act name
    act_match = exp_source.lower() in doc_act.lower() or exp_source.lower() in doc_title.lower()
    sec_match = exp_sec.lower() in doc_sec.lower() if exp_sec else True
    topic_match = exp_topic.lower() in doc_topic.lower() if exp_topic else False

    return act_match or (sec_match and topic_match)

def evaluate_retrieval_method(
    test_cases: List[Dict[str, Any]],
    method_name: str,
    top_k: int = 3
) -> Dict[str, Any]:
    """
    Executes a retrieval experiment over the evaluation dataset and calculates:
    - Hit Rate
    - Precision@K
    - Recall@K
    - MRR (Mean Reciprocal Rank)
    - Abstention rate on out-of-scope / adversarial questions
    - Mean retrieval latency (ms)
    """
    rag_service.initialize_knowledge_base()

    in_scope_cases = [tc for tc in test_cases if tc.get("expected_source") != "NONE"]
    out_of_scope_cases = [tc for tc in test_cases if tc.get("expected_source") == "NONE"]

    hits = 0
    reciprocal_ranks = []
    precisions = []
    recalls = []
    latencies = []

    for tc in in_scope_cases:
        q = tc["question"]
        t0 = time.perf_counter()

        retrieved_docs: List[Dict[str, Any]] = []

        if method_name == "FAISS_ONLY":
            # Semantic search only
            q_vec = embedding_service.embed_query(q)
            q_vec_arr = np.array([q_vec], dtype="float32")
            if rag_service._legal_faiss is not None:
                scores, indices = rag_service._legal_faiss.search(q_vec_arr, top_k)
                for score, idx in zip(scores[0], indices[0]):
                    if 0 <= idx < len(rag_service.legal_corpus):
                        doc = dict(rag_service.legal_corpus[idx])
                        doc["similarity_score"] = float(score)
                        retrieved_docs.append(doc)
            else:
                dot_scores = np.dot(rag_service.legal_embeddings, q_vec_arr[0])
                top_idxs = np.argsort(dot_scores)[::-1][:top_k]
                for idx in top_idxs:
                    doc = dict(rag_service.legal_corpus[idx])
                    doc["similarity_score"] = float(dot_scores[idx])
                    retrieved_docs.append(doc)

        elif method_name == "BM25_PLUS_FAISS":
            # Hybrid BM25 + FAISS without cross re-ranker
            rewritten_q, _ = query_service.rewrite_for_retrieval(q)
            bm25_res = rag_service._legal_bm25.search(rewritten_q, top_k=15)
            q_vec = embedding_service.embed_query(rewritten_q)
            q_vec_arr = np.array([q_vec], dtype="float32")
            faiss_res = []
            if rag_service._legal_faiss is not None:
                scores, indices = rag_service._legal_faiss.search(q_vec_arr, 15)
                for score, idx in zip(scores[0], indices[0]):
                    if 0 <= idx < len(rag_service.legal_corpus):
                        faiss_res.append((rag_service.legal_corpus[idx], float(score)))
            merged = rag_service._reciprocal_rank_fusion(bm25_res, faiss_res)
            retrieved_docs = merged[:top_k]

        elif method_name == "HYBRID_PLUS_RERANKER":
            # Full NyayaAI Architecture: Query Rewriting + BM25 + FAISS + Re-ranking
            retrieved_docs, _ = rag_service.retrieve_hybrid(query=q, retrieval_k=15, final_k=top_k)

        latency = (time.perf_counter() - t0) * 1000
        latencies.append(latency)

        # Evaluate Hit, Precision@K, Recall@K, MRR
        matched_indices = [i for i, d in enumerate(retrieved_docs) if is_match(d, tc)]
        if matched_indices:
            hits += 1
            first_match_rank = matched_indices[0] + 1
            reciprocal_ranks.append(1.0 / first_match_rank)
            precisions.append(len(matched_indices) / top_k)
            recalls.append(1.0)  # At least 1 relevant chunk captured
        else:
            reciprocal_ranks.append(0.0)
            precisions.append(0.0)
            recalls.append(0.0)

    # Evaluate Out-of-Scope / Adversarial handling
    correct_abstentions = 0
    for tc in out_of_scope_cases:
        q = tc["question"]
        _, trace = rag_service.retrieve_hybrid(query=q, retrieval_k=15, final_k=top_k)
        if trace.get("abstain_recommended", False):
            correct_abstentions += 1

    total_in_scope = len(in_scope_cases)
    total_out_of_scope = len(out_of_scope_cases)

    hit_rate = round((hits / total_in_scope) * 100, 2) if total_in_scope else 0.0
    mrr = round(float(np.mean(reciprocal_ranks)), 4) if reciprocal_ranks else 0.0
    precision_at_k = round(float(np.mean(precisions)), 4) if precisions else 0.0
    recall_at_k = round(float(np.mean(recalls)), 4) if recalls else 0.0
    abstention_accuracy = round((correct_abstentions / total_out_of_scope) * 100, 2) if total_out_of_scope else 0.0
    avg_latency_ms = round(float(np.mean(latencies)), 2) if latencies else 0.0

    return {
        "method": method_name,
        "total_test_cases": len(test_cases),
        "in_scope_cases": total_in_scope,
        "out_of_scope_cases": total_out_of_scope,
        "hit_rate_pct": hit_rate,
        "mrr": mrr,
        "precision_at_k": precision_at_k,
        "recall_at_k": recall_at_k,
        "abstention_accuracy_pct": abstention_accuracy,
        "avg_latency_ms": avg_latency_ms
    }

def run_evaluation_benchmark():
    dataset_path = os.path.join(os.path.dirname(__file__), "evaluation_dataset.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    print(f"\n=======================================================")
    print(f"  NYAYA AI — RAG EVALUATION BENCHMARK SUITE")
    print(f"  Total Test Cases: {len(test_cases)}")
    print(f"=======================================================\n")

    exp1 = evaluate_retrieval_method(test_cases, "FAISS_ONLY", top_k=3)
    exp2 = evaluate_retrieval_method(test_cases, "BM25_PLUS_FAISS", top_k=3)
    exp3 = evaluate_retrieval_method(test_cases, "HYBRID_PLUS_RERANKER", top_k=3)

    results = [exp1, exp2, exp3]

    print("| Experiment / Architecture | Hit Rate (%) | MRR | Precision@3 | Recall@3 | Latency (ms) |")
    print("| :--- | :---: | :---: | :---: | :---: | :---: |")
    for r in results:
        print(f"| **{r['method']}** | {r['hit_rate_pct']}% | {r['mrr']} | {r['precision_at_k']} | {r['recall_at_k']} | {r['avg_latency_ms']} ms |")

    print(f"\nOut-of-Scope / Adversarial Abstention Accuracy: {exp3['abstention_accuracy_pct']}%\n")

    output_path = os.path.join(os.path.dirname(__file__), "evaluation_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Results saved to {output_path}")

    return results

if __name__ == "__main__":
    run_evaluation_benchmark()

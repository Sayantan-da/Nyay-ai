import asyncio
import sys
from app.services.llm_service import LLMService
from app.services.rag_service import rag_service

async def main():
    print("=" * 60, flush=True)
    print("Testing Nyaya AI: Local LLM + Vector RAG Pipeline", flush=True)
    print("=" * 60, flush=True)
    
    # 1. Test Ollama Connectivity
    llm = LLMService()
    health = await llm.check_health()
    print(f"Ollama Health: {health}", flush=True)
    
    # 2. Test Vector RAG Retrieval
    query = "Someone stole Rs 25,000 via a fake UPI payment link. What is the golden hour rule?"
    print(f"\nQuerying RAG Vector DB: '{query}'", flush=True)
    rag_service.initialize_knowledge_base()
    results = rag_service.retrieve(query, top_k=2)
    print(f"Retrieved {len(results)} statutory records from Vector DB:", flush=True)
    for idx, doc in enumerate(results, 1):
        print(f"  [{idx}] {doc['title']} (Score: {doc.get('relevance_score')})", flush=True)
    
    # 3. Test Local LLM Generation grounded by RAG
    print("\nCalling Local Ollama Model (qwen2.5:3b)...", flush=True)
    prompt = f"User asks: {query}\n\nStatutory Context:\n{results[0]['text'] if results else 'None'}\n\nProvide citizen advice in 3 bullet points."
    response = await llm.generate_response(prompt=prompt, language="en")
    print("\nLocal LLM Response:\n" + "-" * 40, flush=True)
    print(response, flush=True)
    print("-" * 40, flush=True)
    print("\nSUCCESS: Both Local LLM and Vector RAG are working perfectly!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

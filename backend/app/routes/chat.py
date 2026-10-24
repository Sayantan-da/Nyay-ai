import json
import time
import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.database.models import User, Conversation, Message
from app.models.chat_models import ChatRequest, ChatResponse, ChatSource, ConversationSummary, MessageItem
from app.utils.security import get_current_user_optional
from app.services.rag_service import rag_service
from app.services.prompt_service import PromptService
from app.services.llm_service import llm_service
from app.services.query_service import query_service
from app.services.intent_service import intent_service, IntentType

logger = logging.getLogger("nyaya.chat")

router = APIRouter(prefix="/chat", tags=["Chat"])

RELEVANCE_THRESHOLD = 0.40  # Minimum similarity score required to attach a source

@router.post("", response_model=ChatResponse)
async def send_chat_message(
    req: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    start_time = time.perf_counter()
    user_id = current_user.id if current_user else None
    user_message = req.message.strip()
    
    # 1. Resolve or create conversation
    conv = None
    conversation_history = []
    if req.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
        if conv:
            prev_msgs = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).limit(6).all()
            for m in reversed(prev_msgs):
                conversation_history.append({"role": m.sender, "content": m.content})
    
    if not conv:
        first_words = " ".join(user_message.split()[:5])
        title = (first_words[:40] + "...") if len(first_words) > 40 else first_words
        conv = Conversation(
            user_id=user_id,
            title=title or "Legal Inquiry",
            language=req.language or "en"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # 2. Intent-Aware Classification Layer
    has_doc_ctx = bool(req.document_context and len(req.document_context.strip()) > 10)
    detected_intent, meta = intent_service.classify(
        query=user_message,
        conversation_history=conversation_history,
        has_document_context=has_doc_ctx
    )

    logger.info(
        f"Intent classified: intent={detected_intent.value}, "
        f"has_doc_context={has_doc_ctx}, has_history={len(conversation_history) > 0}"
    )

    # 3. Fast Routing for Non-RAG Intents (GREETING, CASUAL, CLARIFICATION, UNKNOWN, Missing Doc)
    if detected_intent in (IntentType.GREETING, IntentType.CASUAL, IntentType.CLARIFICATION, IntentType.UNKNOWN) or \
       (detected_intent == IntentType.DOCUMENT_QUERY and not has_doc_ctx and not meta.get("has_legal_content")):
        
        static_reply = intent_service.get_static_response(
            intent=detected_intent,
            query=user_message,
            language=req.language or "en",
            meta=meta
        )

        # Greetings, casual acknowledgements and clarifications have NO disclaimers, NO statutory sources
        disclaimer = ""
        confidence = 1.0 if detected_intent in (IntentType.GREETING, IntentType.CASUAL) else 0.60
        abstained = detected_intent in (IntentType.UNKNOWN, IntentType.CLARIFICATION)

        # Save to DB
        user_msg = Message(
            conversation_id=conv.id,
            sender="user",
            content=user_message,
            sources_json="[]",
            confidence=1.0
        )
        db.add(user_msg)

        ai_msg = Message(
            conversation_id=conv.id,
            sender="assistant",
            content=static_reply,
            sources_json="[]",
            confidence=confidence
        )
        db.add(ai_msg)
        db.commit()

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.info(f"Fast routed intent={detected_intent.value} in {elapsed_ms:.1f}ms (RAG & LLM bypassed)")

        return ChatResponse(
            conversation_id=conv.id,
            response=static_reply,
            message=static_reply,
            intent=detected_intent.value,
            language=req.language or "en",
            sources=[],
            confidence=confidence,
            disclaimer=disclaimer,
            abstained=abstained,
            status="success",
            document_id=req.document_id,
            debug_trace={"intent": detected_intent.value, "fast_routed": True, "elapsed_ms": round(elapsed_ms, 2)} if req.debug_mode else None
        )

    # 4. RAG Retrieval for Legal Query, Active Document Query, or Conversational Follow-Up
    retrieval_query = user_message
    if detected_intent == IntentType.FOLLOW_UP and conversation_history:
        retrieval_query, was_rewritten = query_service.rewrite_for_retrieval(user_message, conversation_history)
        logger.info(f"Follow-up query resolved for retrieval (was_rewritten={was_rewritten})")

    retrieved_sources: List[ChatSource] = []
    rag_contexts = []
    debug_trace = None
    abstained = False

    if req.use_rag:
        try:
            docs, trace = rag_service.retrieve_hybrid(
                query=retrieval_query,
                retrieval_k=15,
                final_k=4,
                include_user_docs=True
            )
            debug_trace = trace if req.debug_mode else None
            top_score = trace.get("top_relevance_score", 0.0)

            # Strict relevance threshold filtering:
            # If top score is below threshold or abstain recommended, DO NOT attach irrelevant sources!
            if trace.get("abstain_recommended", False) or top_score < RELEVANCE_THRESHOLD:
                abstained = True
                retrieved_sources = []
                rag_contexts = []
                logger.info(f"RAG retrieval insufficient: top_score={top_score:.3f} < threshold={RELEVANCE_THRESHOLD}")
            else:
                abstained = False
                for d in docs:
                    score = float(d.get("similarity_score") or d.get("relevance_score") or 0.0)
                    # Filter out low-relevance outlier chunks from source list
                    if score >= RELEVANCE_THRESHOLD:
                        retrieved_sources.append(ChatSource(
                            title=d.get("title") or d.get("act_name") or "Legal Reference",
                            category=d.get("category") or d.get("topic") or "Indian Law",
                            relevance_score=score,
                            excerpt=(d.get("text") or "")[:280] + "...",
                            chunk_id=d.get("chunk_id"),
                            act_name=d.get("act_name"),
                            section_number=str(d.get("section_number")) if d.get("section_number") else None,
                            topic=d.get("topic"),
                            similarity_score=score,
                            source=d.get("source"),
                            document_type=d.get("document_type")
                        ))
                        rag_contexts.append(d)
                
                # If no individual document cleared the relevance threshold, abstain safely
                if not rag_contexts:
                    abstained = True
                    retrieved_sources = []
        except Exception as e:
            logger.error(f"Error during RAG retrieval: {e}")
            abstained = True
            retrieved_sources = []
            rag_contexts = []

    # 5. Safe Abstention Handling or Grounded Prompt Construction
    if abstained or not rag_contexts:
        abstained = True
        retrieved_sources = []
        lang = (req.language or "en").lower()
        if lang == "hi":
            assistant_response = (
                "उपलब्ध कानूनी ज्ञानकोष में इस विषय पर विश्वसनीय उत्तर देने के लिए पर्याप्त सत्यापित जानकारी नहीं है। "
                "सत्यापित कानूनी सहायता और मार्गदर्शन के लिए आप राष्ट्रीय कानूनी सेवा प्राधिकरण (NALSA) की निःशुल्क हेल्पलाइन 15100 या अपने जिला कानूनी सेवा प्राधिकरण (DLSA) से संपर्क कर सकते हैं।"
            )
        elif lang == "bn":
            assistant_response = (
                "উপলব্ধ আইনি তথ্যভাণ্ডারে এই বিষয়ে নির্ভরযোগ্য উত্তর দেওয়ার জন্য পর্যাপ্ত যাচাইকৃত তথ্য নেই। "
                "সঠিক আইনি তথ্যের জন্য অনুগ্রহ করে জাতীয় আইনি সেবা কর্তৃপক্ষ (NALSA) বিনামূল্যে হেল্পলাইন 15100 বা আপনার জেলা আইনি পরিষেবা কর্তৃপক্ষ (DLSA)-এর সাথে যোগাযোগ করুন।"
            )
        else:
            assistant_response = (
                "There is not enough verified information in the available knowledge base to answer this reliably. "
                "For verified legal guidance regarding this situation, you may reach out to the National Legal Services Authority (NALSA) free helpline at 15100 or your District Legal Services Authority (DLSA)."
            )
        response_status = "success"
    else:
        prompt = PromptService.build_chat_rag_prompt(
            query=user_message,
            retrieved_contexts=rag_contexts,
            language=req.language or "en",
            document_context=req.document_context,
            is_insufficient_evidence=False,
            conversation_history=conversation_history
        )

        # 6. Local Ollama Qwen 2.5 Inference with graceful exception handling
        try:
            assistant_response = await llm_service.generate_response(
                prompt=prompt,
                language=req.language or "en"
            )
            response_status = "success"
        except Exception as e:
            logger.error(f"Ollama generation failed or timed out: {e}")
            response_status = "error"
            assistant_response = (
                "The local AI model is currently unavailable to finalize the generated explanation. "
                "Please verify that the Ollama service is running on your machine."
            )

    # 7. Persist to Database
    user_msg = Message(
        conversation_id=conv.id,
        sender="user",
        content=user_message,
        sources_json="[]",
        confidence=1.0
    )
    db.add(user_msg)

    sources_json_str = json.dumps([s.model_dump() for s in retrieved_sources])
    ai_msg = Message(
        conversation_id=conv.id,
        sender="assistant",
        content=assistant_response,
        sources_json=sources_json_str,
        confidence=0.95 if (retrieved_sources and not abstained) else 0.40
    )
    db.add(ai_msg)
    db.commit()

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Chat complete: intent={detected_intent.value}, sources={len(retrieved_sources)}, "
        f"abstained={abstained}, status={response_status}, elapsed_ms={elapsed_ms:.1f}ms"
    )

    disclaimer = (
        "This educational explanation is for legal literacy and does not constitute formal legal counsel."
        if (detected_intent in (IntentType.LEGAL_QUERY, IntentType.DOCUMENT_QUERY, IntentType.FOLLOW_UP) and not abstained)
        else "Disclaimer: This is for legal literacy, not formal legal counsel." if abstained
        else ""
    )

    return ChatResponse(
        conversation_id=conv.id,
        response=assistant_response,
        message=assistant_response,
        intent=detected_intent.value,
        language=req.language or "en",
        sources=retrieved_sources,
        confidence=0.95 if (retrieved_sources and not abstained) else 0.40,
        disclaimer=disclaimer,
        abstained=abstained,
        status=response_status,
        document_id=req.document_id,
        debug_trace=debug_trace
    )

@router.post("/stream")
async def send_chat_message_stream(
    req: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events (SSE) streaming endpoint for real-time legal chat.
    Emits events:
      - meta: { "type": "meta", "intent": "...", "conversation_id": ... }
      - sources: { "type": "sources", "sources": [...] }
      - token: { "type": "token", "token": "..." }
      - done: { "type": "done", "conversation_id": ..., "sources": [...], "disclaimer": ..., "status": ... }
    """
    user_id = current_user.id if current_user else None
    user_message = req.message.strip()

    # 1. Resolve or create conversation
    conv = None
    conversation_history = []
    if req.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
        if conv:
            prev_msgs = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).limit(6).all()
            for m in reversed(prev_msgs):
                conversation_history.append({"role": m.sender, "content": m.content})

    if not conv:
        first_words = " ".join(user_message.split()[:5])
        title = (first_words[:40] + "...") if len(first_words) > 40 else first_words
        conv = Conversation(
            user_id=user_id,
            title=title or "Legal Inquiry",
            language=req.language or "en"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    conv_id = conv.id

    # 2. Intent Classification
    has_doc_ctx = bool(req.document_context and len(req.document_context.strip()) > 10)
    detected_intent, meta = intent_service.classify(
        query=user_message,
        conversation_history=conversation_history,
        has_document_context=has_doc_ctx
    )

    # Save user message to DB
    user_msg = Message(
        conversation_id=conv_id,
        sender="user",
        content=user_message,
        sources_json="[]",
        confidence=1.0
    )
    db.add(user_msg)
    db.commit()

    async def event_generator():
        # Step A: Emit initial metadata event
        yield f"data: {json.dumps({'type': 'meta', 'intent': detected_intent.value, 'conversation_id': conv_id})}\n\n"

        # Step B: Fast-Routed non-RAG intents
        if detected_intent in (IntentType.GREETING, IntentType.CASUAL, IntentType.CLARIFICATION, IntentType.UNKNOWN) or \
           (detected_intent == IntentType.DOCUMENT_QUERY and not has_doc_ctx and not meta.get("has_legal_content")):

            static_reply = intent_service.get_static_response(
                intent=detected_intent,
                query=user_message,
                language=req.language or "en",
                meta=meta
            )
            # Emit empty sources
            yield f"data: {json.dumps({'type': 'sources', 'sources': []})}\n\n"

            # Stream words with slight delay for natural reading
            full_response = ""
            for word in static_reply.split(" "):
                token = word + " "
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
                await asyncio.sleep(0.015)

            # Save assistant message to DB
            ai_msg = Message(
                conversation_id=conv_id,
                sender="assistant",
                content=static_reply,
                sources_json="[]",
                confidence=1.0 if detected_intent in (IntentType.GREETING, IntentType.CASUAL) else 0.60
            )
            db.add(ai_msg)
            db.commit()

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv_id, 'sources': [], 'disclaimer': '', 'status': 'success'})}\n\n"
            return

        # Step C: RAG Retrieval
        retrieval_query = user_message
        if detected_intent == IntentType.FOLLOW_UP and conversation_history:
            retrieval_query, _ = query_service.rewrite_for_retrieval(user_message, conversation_history)

        retrieved_sources = []
        rag_contexts = []
        abstained = False

        if req.use_rag:
            try:
                docs, trace = rag_service.retrieve_hybrid(
                    query=retrieval_query,
                    retrieval_k=15,
                    final_k=4,
                    include_user_docs=True
                )
                top_score = trace.get("top_relevance_score", 0.0)
                if trace.get("abstain_recommended", False) or top_score < RELEVANCE_THRESHOLD:
                    abstained = True
                else:
                    for d in docs:
                        score = float(d.get("similarity_score") or d.get("relevance_score") or 0.0)
                        if score >= RELEVANCE_THRESHOLD:
                            retrieved_sources.append(ChatSource(
                                title=d.get("title") or d.get("act_name") or "Legal Reference",
                                category=d.get("category") or d.get("topic") or "Indian Law",
                                relevance_score=score,
                                excerpt=(d.get("text") or "")[:280] + "...",
                                chunk_id=d.get("chunk_id"),
                                act_name=d.get("act_name"),
                                section_number=str(d.get("section_number")) if d.get("section_number") else None,
                                topic=d.get("topic"),
                                similarity_score=score,
                                source=d.get("source"),
                                document_type=d.get("document_type")
                            ))
                            rag_contexts.append(d)
                    if not rag_contexts:
                        abstained = True
            except Exception as e:
                logger.error(f"Error during streaming RAG retrieval: {e}")
                abstained = True

        # Emit sources immediately so UI can show citations while LLM is generating!
        sources_payload = [s.model_dump() for s in retrieved_sources] if not abstained else []
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources_payload})}\n\n"

        # Step D: Safe Abstention vs LLM Streaming
        if abstained or not rag_contexts:
            lang = (req.language or "en").lower()
            if lang == "hi":
                abstain_text = (
                    "उपलब्ध कानूनी ज्ञानकोष में इस विषय पर विश्वसनीय उत्तर देने के लिए पर्याप्त सत्यापित जानकारी नहीं है। "
                    "सत्यापित कानूनी सहायता और मार्गदर्शन के लिए आप राष्ट्रीय कानूनी सेवा प्राधिकरण (NALSA) की निःशुल्क हेल्पलाइन 15100 या अपने जिला कानूनी सेवा प्राधिकरण (DLSA) से संपर्क कर सकते हैं।"
                )
            elif lang == "bn":
                abstain_text = (
                    "উপলব্ধ আইনি তথ্যভাণ্ডারে এই বিষয়ে নির্ভরযোগ্য উত্তর দেওয়ার জন্য পর্যাপ্ত যাচাইকৃত তথ্য নেই। "
                    "সঠিক আইনি তথ্যের জন্য অনুগ্রহ করে জাতীয় আইনি সেবা কর্তৃপক্ষ (NALSA) বিনামূল্যে হেল্পলাইন 15100 বা আপনার জেলা আইনি পরিষেবা কর্তৃপক্ষ (DLSA)-এর সাথে যোগাযোগ করুন।"
                )
            else:
                abstain_text = (
                    "There is not enough verified information in the available knowledge base to answer this reliably. "
                    "For verified legal guidance regarding this situation, you may reach out to the National Legal Services Authority (NALSA) free helpline at 15100 or your District Legal Services Authority (DLSA)."
                )

            for word in abstain_text.split(" "):
                yield f"data: {json.dumps({'type': 'token', 'token': word + ' '})}\n\n"
                await asyncio.sleep(0.015)

            ai_msg = Message(
                conversation_id=conv_id,
                sender="assistant",
                content=abstain_text,
                sources_json="[]",
                confidence=0.40
            )
            db.add(ai_msg)
            db.commit()

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv_id, 'sources': [], 'disclaimer': 'Disclaimer: This is for legal literacy, not formal legal counsel.', 'status': 'success'})}\n\n"
            return

        # Step E: Grounded Prompt Construction & Ollama Streaming
        prompt = PromptService.build_chat_rag_prompt(
            query=user_message,
            retrieved_contexts=rag_contexts,
            language=req.language or "en",
            document_context=req.document_context,
            is_insufficient_evidence=False,
            conversation_history=conversation_history
        )

        full_generated_text = ""
        try:
            async for token in llm_service.generate_response_stream(
                prompt=prompt,
                language=req.language or "en"
            ):
                full_generated_text += token
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"
            response_status = "success"
        except Exception as e:
            logger.error(f"Streaming token generation error: {e}")
            err_token = "\n[AI response was interrupted]"
            full_generated_text += err_token
            yield f"data: {json.dumps({'type': 'token', 'token': err_token})}\n\n"
            response_status = "error"

        # Step F: Persist to DB and emit final done event
        disclaimer = "This educational explanation is for legal literacy and does not constitute formal legal counsel."
        sources_json_str = json.dumps(sources_payload)
        ai_msg = Message(
            conversation_id=conv_id,
            sender="assistant",
            content=full_generated_text,
            sources_json=sources_json_str,
            confidence=0.95
        )
        db.add(ai_msg)
        db.commit()

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv_id, 'sources': sources_payload, 'disclaimer': disclaimer, 'status': response_status})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/conversations", response_model=List[ConversationSummary])
def get_conversations(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Conversation)
    if current_user:
        query = query.filter(Conversation.user_id == current_user.id)
    
    conversations = query.order_by(Conversation.updated_at.desc()).limit(20).all()
    results = []
    for c in conversations:
        msg_count = db.query(Message).filter(Message.conversation_id == c.id).count()
        results.append(ConversationSummary(
            id=c.id,
            title=c.title,
            language=c.language,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=msg_count
        ))
    return results

@router.get("/{conversation_id}/messages", response_model=List[MessageItem])
def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    items = []
    for m in messages:
        sources_list = []
        try:
            raw_s = json.loads(m.sources_json or "[]")
            sources_list = [ChatSource(**s) for s in raw_s]
        except Exception:
            pass
        items.append(MessageItem(
            id=m.id,
            sender=m.sender,
            content=m.content,
            created_at=m.created_at,
            sources=sources_list
        ))
    return items

@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully"}

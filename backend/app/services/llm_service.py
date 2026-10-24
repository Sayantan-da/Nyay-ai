import json
import logging
import re
import asyncio
import time
from typing import Dict, Any, Optional, List
import httpx
from app.config import settings
from app.services.prompt_service import PromptService

logger = logging.getLogger("nyaya.llm")

def extract_json_from_text(raw: str) -> Dict[str, Any]:
    """Parse JSON from model response even if surrounded by markdown fences or explanatory text."""
    if not raw:
        raise ValueError("Empty LLM output")
    cleaned = raw.strip()

    # If wrapped in ```json ... ``` or ``` ... ```
    if cleaned.startswith("```"):
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # Find first { and matching last }
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = cleaned[first_brace : last_brace + 1]
        try:
            return json.loads(candidate)
        except Exception:
            pass

    raise ValueError(f"Could not parse valid JSON from LLM output: {raw[:200]}...")

class LLMService:
    def __init__(self):
        self.base_url = settings.OLLAMA_HOST.rstrip("/")
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT_SECONDS
        self._cached_health: Optional[Dict[str, Any]] = None
        self._cached_health_time: float = 0.0
        self._warmed_up: bool = False

    async def check_health(self) -> Dict[str, Any]:
        """Check Ollama connectivity and available pulled models (cached for 4s to prevent poll storm)."""
        now = time.time()
        if self._cached_health and (now - self._cached_health_time < 4.0):
            return self._cached_health

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    has_target = any(self.model in m for m in models)
                    res = {
                        "status": "healthy",
                        "connected": True,
                        "target_model": self.model,
                        "model_ready": has_target,
                        "available_models": models
                    }
                    self._cached_health = res
                    self._cached_health_time = now

                    # Auto warm up model in background if connected and not yet warmed
                    if has_target and not self._warmed_up:
                        self._warmed_up = True
                        asyncio.create_task(self.warmup())

                    return res
        except Exception as e:
            logger.warning(f"Ollama health check failed: {e}")
            res = {
                "status": "unavailable",
                "connected": False,
                "target_model": self.model,
                "model_ready": False,
                "error": str(e),
                "available_models": []
            }
            # Short cache for failure so it can retry soon
            self._cached_health = res
            self._cached_health_time = now
            return res

        return {
            "status": "degraded",
            "connected": False,
            "target_model": self.model,
            "model_ready": False,
            "available_models": []
        }

    async def warmup(self) -> None:
        """Pre-load model into memory with keep_alive=-1 so it never unloads to disk."""
        try:
            active_model = await self.get_active_model()
            logger.info(f"Warming up Ollama model '{active_model}' with keep_alive=-1 (permanent in-RAM)...")
            async with httpx.AsyncClient(timeout=60.0) as client:
                await client.post(
                    f"{self.base_url}/api/generate",
                    json={"model": active_model, "keep_alive": -1}
                )
            logger.info(f"Ollama model '{active_model}' loaded and locked in RAM (permanent awake).")
        except Exception as e:
            logger.warning(f"Ollama warmup notice: {e}")

    async def get_active_model(self) -> str:
        """Return configured model, or first available Qwen/Ollama model if target is not yet pulled."""
        health = await self.check_health()
        if health.get("connected"):
            available = health.get("available_models", [])
            for m in available:
                if self.model in m:
                    return m
            # If target model not pulled yet, fallback to any available model
            if available:
                logger.info(f"Target model '{self.model}' not yet pulled. Using active model: {available[0]}")
                return available[0]
        return self.model

    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        language: str = "en"
    ) -> str:
        """Call Ollama /api/generate asynchronously."""
        health = await self.check_health()
        if health.get("connected") and health.get("available_models"):
            active_model = await self.get_active_model()
            final_system = system_prompt or PromptService.get_system_prompt(language)
            
            payload = {
                "model": active_model,
                "prompt": prompt,
                "system": final_system,
                "stream": False,
                "keep_alive": -1,
                "options": {
                    "temperature": 0.25,
                    "top_p": 0.9,
                    "num_ctx": 2048,
                    "num_predict": 300,
                    "num_thread": 6
                }
            }

            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(f"{self.base_url}/api/generate", json=payload)
                    if response.status_code == 200:
                        result = response.json()
                        return result.get("response", "").strip()
                    else:
                        logger.error(f"Ollama error {response.status_code}: {response.text}")
            except Exception as ex:
                logger.warning(f"Ollama call failed or timed out ({ex}). Utilizing structured educational fallback.")
        else:
            logger.info("No Ollama models ready yet. Utilizing high-fidelity legal fallback.")

        # Educational fallback response if Ollama is starting or downloading
        if language == "hi":
            return (
                "नमस्ते! न्याय एआई (Nyaya AI) कानूनी साक्षरता प्रणाली वर्तमान में आपके अनुरोध का विश्लेषण कर रही है।\n\n"
                "- यदि यह वित्तीय धोखाधड़ी या यूपीआई फ्रॉड है: तुरंत 1930 पर कॉल करें या cybercrime.gov.in पर रिपोर्ट करें।\n"
                "- उपभोक्ता विवादों के लिए: राष्ट्रीय उपभोक्ता हेल्पलाइन 1915 पर संपर्क करें।\n"
                "- आपातकालीन सहायता: 112 या महिला हेल्पलाइन: 181।\n\n"
                "यह सामान्य कानूनी शिक्षा है, पेशेवर कानूनी सलाह नहीं।"
            )
        elif language == "bn":
            return (
                "নমস্কার! ন্যায় এআই (Nyaya AI) আইনি সচেতনতা সহকারী আপনার প্রশ্নের বিশ্লেষণ করছে।\n\n"
                "- আর্থিক বা ইউপিআই জালিয়াতির ক্ষেত্রে: অবিলম্বে ১৯৩০ নম্বরে কল করুন অথবা cybercrime.gov.in এ অভিযোগ করুন।\n"
                "- ক্রেতা অধিকার বা পণ্য সংক্রান্ত বিরোধে: জাতীয় উপভোক্তা হেল্পলাইন ১৯১৫-এ যোগাযোগ করুন।\n"
                "- জরুরি সহায়তা: ১১২ অথবা মহিলা হেল্পলাইন: ১৮১।\n\n"
                "এটি শিক্ষামূলক আইনি তথ্য, পেশাদার আইনজীবীর পরামর্শ নয়।"
            )
        else:
            return (
                "Welcome to Nyaya AI Legal Literacy Assistant.\n\n"
                "- If facing immediate UPI or online financial cyber-fraud, call the 1930 helpline immediately and file a complaint at cybercrime.gov.in within the golden hour.\n"
                "- For consumer grievances regarding defective goods or services, contact the National Consumer Helpline at 1915 or file on edaakhil.nic.in.\n"
                "- For residential rental or workplace issues, always preserve written agreements, transaction receipts, and formal notice communications.\n"
                "- Emergency contact: 112 | Women's helpline: 181 | Free legal aid (NALSA): 15100.\n\n"
                "Disclaimer: This is general legal information for literacy purposes, not formal legal advice."
            )

    async def generate_response_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        language: str = "en"
    ):
        """Stream response tokens from Ollama /api/generate."""
        health = await self.check_health()
        if health.get("connected") and health.get("available_models"):
            active_model = await self.get_active_model()
            final_system = system_prompt or PromptService.get_system_prompt(language)
            
            payload = {
                "model": active_model,
                "prompt": prompt,
                "system": final_system,
                "stream": True,
                "keep_alive": -1,
                "options": {
                    "temperature": 0.25,
                    "top_p": 0.9,
                    "num_ctx": 2048,
                    "num_predict": 250
                }
            }

            stream_timeout = httpx.Timeout(connect=30.0, read=120.0, write=30.0, pool=30.0)
            has_tokens = False
            try:
                async with httpx.AsyncClient(timeout=stream_timeout) as client:
                    async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as resp:
                        if resp.status_code == 200:
                            async for line in resp.aiter_lines():
                                if not line:
                                    continue
                                try:
                                    chunk = json.loads(line)
                                    token = chunk.get("response", "")
                                    if token:
                                        has_tokens = True
                                        yield token
                                    if chunk.get("done", False):
                                        break
                                except Exception:
                                    continue
                            if has_tokens:
                                return
                        else:
                            logger.error(f"Ollama stream HTTP error: {resp.status_code}")
            except Exception as ex:
                logger.warning(f"Ollama stream notice ({type(ex).__name__}): {ex}")

        # Fallback tokens ONLY if no tokens were ever emitted
        if not has_tokens:
            fallback_msg = (
                "The local AI model is currently unavailable to stream the generated explanation. "
                "Please verify that the Ollama service is running on your machine."
            )
            for word in fallback_msg.split(" "):
                yield word + " "

    async def generate_structured_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Request structured JSON from Qwen 2.5 and parse with validation."""
        health = await self.check_health()
        if not (health.get("connected") and health.get("available_models")):
            raise ValueError("Ollama model not ready yet.")

        active_model = await self.get_active_model()
        payload = {
            "model": active_model,
            "prompt": prompt,
            "system": system_prompt or "You are a legal document analyzer. Return ONLY valid JSON.",
            "format": "json",
            "stream": False,
            "keep_alive": -1,
            "options": {
                "temperature": 0.2,
                "num_ctx": 4096
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{self.base_url}/api/generate", json=payload)
                if response.status_code == 200:
                    raw_text = response.json().get("response", "")
                    return extract_json_from_text(raw_text)
        except Exception as ex:
            logger.warning(f"Structured JSON generation with Ollama failed ({ex}).")

        raise ValueError("Could not obtain structured JSON from Ollama runtime.")

llm_service = LLMService()

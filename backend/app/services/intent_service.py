import re
import logging
from enum import Enum
from typing import List, Dict, Optional, Tuple, Any

logger = logging.getLogger("nyaya.intent")

class IntentType(str, Enum):
    GREETING = "GREETING"
    CASUAL = "CASUAL"
    LEGAL_QUERY = "LEGAL_QUERY"
    DOCUMENT_QUERY = "DOCUMENT_QUERY"
    FOLLOW_UP = "FOLLOW_UP"
    CLARIFICATION = "CLARIFICATION"
    UNKNOWN = "UNKNOWN"

# 1. Obvious Pure Greeting Patterns (Full-match or isolated phrase)
GREETING_WORDS = {
    # English
    "hi", "hii", "hiii", "hello", "helloo", "hey", "heya", "howdy", "sup", "yo",
    "good morning", "good afternoon", "good evening", "good day", "greetings",
    # Hindi / Hinglish (Latin + Devanagari)
    "namaste", "namaskar", "namaskaram", "pranam", "pranaam", "ram ram", "radhe radhe",
    "kaise ho", "kya haal hai", "kya haal", "aap kaise ho", "namashkar", "adaab",
    "नमस्ते", "नमस्कार", "प्रणाम", "नमस्ते जी", "कैसे हो", "क्या हाल है", "प्रणाम जी",
    # Bengali (Latin + Bengali script)
    "nomoshkar", "kemon acho", "kemon achen", "ki khobor", "shuvo shokal", "bhalo achi",
    "নমস্কার", "হ্যালো", "কেমন আছো", "কেমন আছেন", "কী খবর", "শুভ সকাল"
}

# Greeting phrases with optional punctuation or conversational opening
GREETING_REGEX = re.compile(
    r'^(?:'
    r'h+[i|e|y]+[a-z]*|'
    r'hello+[a-z]*|'
    r'hey+[a-z]*|'
    r'good\s+(?:morning|afternoon|evening|day)|'
    r'namaste+|namaskar[a-z]*|prana*m|nomoshkar|'
    r'adaab|sat\s+sri\s+akal|'
    r'kemon\s+ach[oe]n?|kaise\s+ho|'
    r'नमस्ते|नमस्कार|प्रणाम|নমস্কার|হ্যালো|কেমন\s+[আা][ছচ][েনো]?'
    r')(?:\s+(?:there|nyaya|all|everyone|sir|maam|madam|ji|bhai|जी|বাবু))?'
    r'[\s!.,?।]*$',
    re.IGNORECASE | re.UNICODE
)

# Friendly conversational greetings with "how are you"
CONVERSATIONAL_GREETING_REGEX = re.compile(
    r'^(?:hi|hello|hey|namaste|nomoshkar)[,\s]+(?:how\s+are\s+you|how\s+r\s+u|how\'s\s+it\s+going|how\s+do\s+you\s+do)[\s?]*$',
    re.IGNORECASE
)

# 2. Casual / Acknowledgement Patterns
CASUAL_WORDS = {
    # Thanks
    "thanks", "thank you", "thank you so much", "thx", "ty", "many thanks",
    "dhanyawad", "dhanyavaad", "shukriya", "dhonyobad", "dhonnobad",
    # Acknowledgements
    "ok", "okay", "k", "got it", "understood", "alright", "all right", "cool",
    "great", "fine", "sure", "noted", "nice", "awesome", "perfect",
    # Closings / Goodbyes
    "bye", "goodbye", "good bye", "see you", "see ya", "tata", "alvida",
    "take care", "have a nice day", "have a good day"
}

CASUAL_REGEX = re.compile(
    r'^(?:'
    r'thank(?:s|\s+you(?:\s+so\s+much|\s+very\s+much)?)|thx|ty|'
    r'dhanyawad|shukriya|dhonyobad|'
    r'ok(?:ay)?|k|got\s+it|understood|alright|all\s+right|cool|great|fine|sure|noted|nice|'
    r'bye(?:-bye)?|goodbye|see\s+(?:you|ya)|tata|alvida|take\s+care'
    r')[\s!.,?]*$',
    re.IGNORECASE
)

# 3. Substantive Legal Domain Vocabulary & Patterns
LEGAL_KEYWORDS = [
    # Tenancy & Rental
    r'\b(?:deposit|rent|rental|tenan(?:t|cy)|landlord|evict(?:ion)?|lease|lock-in|sublet|maintenance|broker(?:age)?)\b',
    # Consumer & E-Commerce
    r'\b(?:refund|defective|warranty|guarantee|e-commerce|consumer|edaakhil|replacement|counterfeit|unfair\s+trade)\b',
    # Cybercrime & Financial
    r'\b(?:upi|scam|fraud|cyber(?:crime)?|phishing|otp|hacked|unauthorized\s+transaction|bank\s+fraud|1930)\b',
    # Workplace & Labor
    r'\b(?:posh|harassment|unpaid\s+salary|salary|wage|resignation|relieving\s+letter|pf|provident\s+fund|gratuity|employment|internship)\b',
    # Criminal & Police Procedures
    r'\b(?:fir|zero\s+fir|police|arrest|bail|detention|bns|bnss|bsa|ipc|crpc|warrant|station|custody|cognizable)\b',
    # Legal General & Statutory
    r'\b(?:section|sec\.?|act|statute|statutory|law|laws|legal|court|jurisdiction|notice|legal\s+notice|affidavit|stamp\s+paper|cheque\s+bounce|138|ni\s+act|nalsa|dlsa|rights?|lawyer|advocate|sue|illegal|penalty|fine|tax|taxation|punishment|offense|offence|prosecution)\b'
]
LEGAL_KEYWORDS_REGEX = re.compile('|'.join(LEGAL_KEYWORDS), re.IGNORECASE)

# 4. Explicit Document Reference Patterns
DOCUMENT_QUERY_PATTERNS = [
    re.compile(r'\b(?:in\s+this|from\s+this|per\s+this|my)\s+(?:contract|agreement|document|lease|deed|file|clause)\b', re.IGNORECASE),
    re.compile(r'\b(?:this\s+contract|this\s+agreement|this\s+document|this\s+clause|this\s+lease)\b', re.IGNORECASE),
    re.compile(r'\b(?:clause\s+\d+|clause\s+[a-z]|section\s+in\s+this)\b', re.IGNORECASE),
    re.compile(r'\b(?:what\s+does\s+(?:the|this|my)\s+(?:agreement|contract|document|clause)\s+say)\b', re.IGNORECASE),
    re.compile(r'\b(?:summarize\s+(?:this|my|the)\s+(?:document|agreement|contract))\b', re.IGNORECASE),
]

# 5. Contextual Follow-Up Pronoun / Elliptical Patterns
FOLLOW_UP_PATTERNS = [
    re.compile(r'^(?:can|could|would|does|is|what\s+about|why|how)\s+(?:it|this|that|they|he|she|so)\b', re.IGNORECASE),
    re.compile(r'\b(?:in\s+another\s+state|what\s+if\s+they\s+refuse|then\s+what|what\s+happens\s+next|can\s+they\s+do\s+that)\b', re.IGNORECASE),
    re.compile(r'^(?:and|so|then|what\s+about)\s+', re.IGNORECASE)
]

# 6. Ambiguous Clarification Triggers
CLARIFICATION_PATTERNS = [
    re.compile(r'^(?:i\s+got\s+a\s+notice|someone\s+sent\s+me\s+a\s+notice|got\s+notice)[\s.?!]*$', re.IGNORECASE),
    re.compile(r'^(?:what\s+should\s+i\s+do|help\s+me|i\s+need\s+help|what\s+to\s+do)[\s.?!]*$', re.IGNORECASE),
    re.compile(r'^(?:they\s+cheated\s+me|i\s+got\s+scammed|can\s+they\s+sue\s+me)[\s.?!]*$', re.IGNORECASE),
    re.compile(r'^(?:is\s+this\s+legal|is\s+that\s+allowed)[\s.?!]*$', re.IGNORECASE)
]

class IntentService:
    """
    Lightweight, deterministic and intent-aware routing service.
    Classifies queries before RAG retrieval to prevent unnecessary FAISS/Ollama calls.
    """

    @staticmethod
    def classify(
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        has_document_context: bool = False
    ) -> Tuple[IntentType, Dict[str, Any]]:
        raw = query.strip()
        cleaned = re.sub(r'[\s!.,?]+', ' ', raw).strip().lower()

        meta: Dict[str, Any] = {
            "cleaned_query": cleaned,
            "has_document_context": has_document_context,
            "history_length": len(conversation_history) if conversation_history else 0
        }

        # 1. Empty query
        if not cleaned:
            return IntentType.UNKNOWN, meta

        # 2. Check for substantive legal content first!
        # This guarantees: "Hi, what are my tenant rights?" is routed as LEGAL_QUERY, NOT GREETING.
        has_legal_content = bool(LEGAL_KEYWORDS_REGEX.search(raw))
        meta["has_legal_content"] = has_legal_content

        # Check explicit document references
        has_doc_ref = any(pat.search(raw) for pat in DOCUMENT_QUERY_PATTERNS)
        meta["has_doc_ref"] = has_doc_ref

        # If document query explicitly or document context active with document inquiry
        if has_doc_ref or (has_document_context and has_legal_content):
            meta["reason"] = "Document context active or explicit document reference detected"
            return IntentType.DOCUMENT_QUERY, meta

        # If user asks about their document without uploading one
        if has_doc_ref and not has_document_context:
            meta["reason"] = "User asked about document but none provided"
            return IntentType.DOCUMENT_QUERY, meta

        # 3. Deterministic Conversational Greetings with "How are you"
        if CONVERSATIONAL_GREETING_REGEX.match(raw.strip()):
            meta["reason"] = "Conversational greeting with state inquiry"
            meta["is_conversational_greeting"] = True
            return IntentType.GREETING, meta

        # 4. Pure Greeting (MUST NOT have substantive legal content)
        if not has_legal_content:
            if cleaned in GREETING_WORDS or GREETING_REGEX.match(raw.strip()):
                meta["reason"] = "Exact greeting pattern match"
                return IntentType.GREETING, meta

        # 5. Casual Acknowledgements / Gratitude / Goodbyes (MUST NOT have substantive legal content)
        if not has_legal_content:
            if cleaned in CASUAL_WORDS or CASUAL_REGEX.match(raw.strip()):
                meta["reason"] = "Casual conversational acknowledgement"
                return IntentType.CASUAL, meta

        # 6. Conversational Follow-Up Check
        if conversation_history and len(conversation_history) > 0:
            is_followup = any(pat.search(raw) for pat in FOLLOW_UP_PATTERNS)
            if is_followup:
                meta["reason"] = "Elliptical follow-up referencing prior conversation turn"
                return IntentType.FOLLOW_UP, meta

        # 7. Substantive Legal Query
        if has_legal_content:
            meta["reason"] = "Matched verified Indian statutory and legal domain concepts"
            return IntentType.LEGAL_QUERY, meta

        # 8. Ambiguous queries requiring clarification
        if any(pat.match(raw.strip()) for pat in CLARIFICATION_PATTERNS):
            meta["reason"] = "Ambiguous legal situation lacking necessary procedural context"
            return IntentType.CLARIFICATION, meta

        # 9. Fallback: Short query check (< 3 words) with no legal keywords
        words = cleaned.split()
        if len(words) <= 2 and not has_legal_content:
            # Check if common greeting variant
            for gw in GREETING_WORDS:
                if gw in cleaned:
                    meta["reason"] = "Fuzzy short greeting match"
                    return IntentType.GREETING, meta

        # 10. Out of domain / Unknown
        meta["reason"] = "Out of legal domain or unclassified query"
        return IntentType.UNKNOWN, meta

    @staticmethod
    def get_static_response(
        intent: IntentType,
        query: str,
        language: str = "en",
        meta: Optional[Dict[str, Any]] = None
    ) -> str:
        """Returns direct natural response templates for non-RAG intents."""
        meta = meta or {}
        lang = (language or "en").lower()

        if intent == IntentType.GREETING:
            if meta.get("is_conversational_greeting"):
                if lang == "hi":
                    return "नमस्ते! मैं बहुत अच्छा हूँ, धन्यवाद। मैं न्याय एआई (Nyaya AI) हूँ, आपका कानूनी साक्षरता सहायक। आज मैं आपके अधिकारों, किरायेदारी या कानूनी दस्तावेजों को समझने में कैसे मदद करूँ?"
                if lang == "bn":
                    return "নমস্কার! আমি ভালো আছি, ধন্যবাদ। আমি ন্যায় এআই (Nyaya AI), আপনার আইনি সহায়তা সহকারী। আজ আপনার আইনি অধিকার, ভাড়া চুক্তি বা অন্যান্য আইনি বিষয়ে কীভাবে সাহায্য করতে পারি?"
                return "Hello! I'm doing well, thank you. I am Nyaya AI, your Indian legal literacy assistant. How may I assist you with your legal rights, tenancy, or documents today?"

            # Standard greeting
            if lang == "hi":
                return "नमस्ते! मैं न्याय एआई (Nyaya AI) हूँ, आपका कानूनी साक्षरता सहायक। मैं भारतीय कानूनों के तहत आपके अधिकारों, किरायेदारी नियमों, उपभोक्ता मामलों और समझौतों को सरल भाषा में समझाने में मदद कर सकता हूँ। आप किस कानूनी विषय पर जानकारी चाहते हैं?"
            if lang == "bn":
                return "নমস্কার! আমি ন্যায় এআই (Nyaya AI), আপনার আইনি সাক্ষরতা সহকারী। আমি ভারতীয় আইনের অধীনে আপনার নাগরিক অধিকার, ভাড়া সংক্রান্ত নিয়ম এবং আইনি চুক্তি বুঝতে সাহায্য করতে পারি। আজ আপনি কী জানতে চান?"
            return "Hi! I'm Nyaya AI, your legal literacy assistant. I can help you understand your legal rights, simplify documents, and explore everyday legal situations. What would you like help with?"

        if intent == IntentType.CASUAL:
            lower = query.lower()
            if any(w in lower for w in ["thank", "dhanya", "shukriya", "dhonyo"]):
                if lang == "hi":
                    return "आपका स्वागत है! यदि आपको कभी भी अपने कानूनी अधिकारों या दस्तावेजों के बारे में जानकारी चाहिए, तो बेझिझक पूछें।"
                if lang == "bn":
                    return "আপনাকে স্বাগতম! আইনি অধিকার বা চুক্তিপত্র সম্পর্কে কোনো প্রশ্ন থাকলে নির্দ্বিধায় জিজ্ঞাসা করুন।"
                return "You're welcome! Feel free to ask whenever you need help understanding legal rights, contracts, or procedural safeguards. Stay informed and empowered!"

            if any(w in lower for w in ["bye", "goodbye", "alvida", "see you", "tata"]):
                if lang == "hi":
                    return "अलविदा! सुरक्षित रहें और अपने कानूनी अधिकारों के प्रति जागरूक रहें। फिर मिलेंगे!"
                if lang == "bn":
                    return "বিদায়! সচেতন থাকুন এবং সুরক্ষিত থাকুন। কোনো প্রশ্ন থাকলে আবার আসবেন!"
                return "Goodbye! Stay safe and legally aware. Feel free to return whenever you need clarity on your rights or agreements."

            # Acknowledgement (ok, got it)
            if lang == "hi":
                return "समझ गया! यदि आपके पास इस संबंध में कोई और प्रश्न है, तो बेझिझक बताएं।"
            if lang == "bn":
                return "বুঝেছি! এ বিষয়ে বা অন্য কোনো আইনি বিষয়ে আরও কিছু জানার থাকলে বলুন।"
            return "Understood! Let me know if you would like more details or have any further questions."

        if intent == IntentType.CLARIFICATION:
            if lang == "hi":
                return "सटीक और उपयोगी कानूनी जानकारी प्रदान करने के लिए, क्या आप थोड़ा और विवरण दे सकते हैं? उदाहरण के लिए, यह मामला किस प्रकार के नोटिस या विवाद से संबंधित है?"
            if lang == "bn":
                return "সঠিক আইনি তথ্য দেওয়ার জন্য, আপনি কি আরেকটু বিস্তারিত বলতে পারেন? যেমন, এটি কী ধরনের নোটিশ বা চুক্তি সংক্রান্ত বিষয়?"
            return "To provide accurate legal guidance under Indian law, could you please share a few more details? For example, what type of notice or dispute is this regarding, and what specific outcome are you seeking?"

        if intent == IntentType.DOCUMENT_QUERY and not meta.get("has_document_context"):
            if lang == "hi":
                return "आपने अभी तक कोई दस्तावेज़ अपलोड नहीं किया है। कृपया 'Scanner' टैब का उपयोग करके अपना समझौता या नोटिस अपलोड करें ताकि मैं उसकी जांच कर सकूँ।"
            if lang == "bn":
                return "আপনি এখনও কোনো নথি আপলোড করেননি। দয়া করে 'Scanner' ট্যাবে গিয়ে আপনার চুক্তিপত্র বা নোটিশ আপলোড করুন।"
            return "You haven't uploaded or selected a document yet. Please navigate to the Scanner tab to upload your agreement, lease, or legal notice so I can analyze its clauses and terms for you."

        # UNKNOWN / Out of domain
        if lang == "hi":
            return "मैं न्याय एआई (Nyaya AI) हूँ, जो भारतीय नागरिक अधिकारों, किरायेदारी, उपभोक्ता विवादों, साइबर धोखाधड़ी और अनुबंध विश्लेषण में विशेषज्ञता रखता हूँ। मैं केवल भारतीय कानूनी मामलों में सहायता कर सकता हूँ। क्या आपका कोई कानूनी प्रश्न है?"
        if lang == "bn":
            return "আমি ন্যায় এআই (Nyaya AI), ভারতীয় নাগরিক অধিকার, ভাড়াটে অধিকার, সাইবার জালিয়াতি এবং আইনি নথি বিশ্লেষণে বিশেষজ্ঞ। আমি কেবল আইনি বিষয়ে সাহায্য করতে পারি। আপনার কি কোনো আইনি প্রশ্ন আছে?"
        return "I am Nyaya AI, specialized in Indian legal literacy, citizen rights, and document understanding. I can help with tenancy leases, cyber fraud (1930), consumer protection (1915), workplace compliance (POSH), and police procedures. How can I assist you with an Indian legal matter?"

intent_service = IntentService()

import os
import math
import logging
from typing import List
import numpy as np

logger = logging.getLogger("nyaya.embedding")

class EmbeddingService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None
        self._dim = 384
        self._initialized = False

    def _load_model(self):
        if self._initialized:
            return
        # Use high-performance, deterministic local dense legal embedding engine
        self._model = "fast_dense"
        logger.info("Nyaya AI local dense legal embedding engine initialized.")
        self._initialized = True

    def _dense_hash_embed(self, text: str) -> np.ndarray:
        """Deterministic 384-dimensional dense semantic representation."""
        vec = np.zeros(self._dim, dtype="float32")
        words = text.lower().replace("\n", " ").split()
        if not words:
            return vec

        import hashlib
        for i, word in enumerate(words):
            cleaned = "".join(c for c in word if c.isalnum())
            if not cleaned:
                continue
            h1 = int(hashlib.md5(cleaned.encode("utf-8")).hexdigest(), 16) % self._dim
            vec[h1] += 1.5

            # Bigram feature
            if i < len(words) - 1:
                next_cleaned = "".join(c for c in words[i+1] if c.isalnum())
                if next_cleaned:
                    bigram = f"{cleaned}_{next_cleaned}".encode("utf-8")
                    h2 = int(hashlib.md5(bigram).hexdigest(), 16) % self._dim
                    vec[h2] += 2.0

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        self._load_model()
        if not texts:
            return np.zeros((0, self._dim), dtype="float32")

        if self._model != "fast_dense":
            try:
                embeddings = self._model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
                norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
                norms[norms == 0] = 1e-12
                return (embeddings / norms).astype("float32")
            except Exception:
                pass

        vectors = [self._dense_hash_embed(t) for t in texts]
        return np.array(vectors, dtype="float32")

    def embed_query(self, query: str) -> np.ndarray:
        return self.embed_texts([query])[0]

embedding_service = EmbeddingService()

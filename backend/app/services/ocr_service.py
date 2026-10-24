import io
import logging
from typing import Tuple, Optional
import fitz  # PyMuPDF
from PIL import Image

logger = logging.getLogger("nyaya.ocr")

class OCRService:
    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes, max_pages: int = 25) -> Tuple[str, int]:
        """Extract text from PDF pages using PyMuPDF (fitz)."""
        full_text = []
        page_count = 0
        try:
            with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
                page_count = len(doc)
                pages_to_process = min(page_count, max_pages)
                for page_idx in range(pages_to_process):
                    page = doc[page_idx]
                    page_text = page.get_text()
                    if page_text and page_text.strip():
                        full_text.append(f"--- Page {page_idx + 1} ---\n{page_text.strip()}")
            
            extracted = "\n\n".join(full_text)
            return extracted, page_count
        except Exception as e:
            logger.error(f"Error parsing PDF: {e}")
            raise ValueError(f"Failed to read PDF document: {str(e)}")

    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> str:
        """Extract text from image using Tesseract OCR if available, or clean metadata."""
        try:
            import pytesseract
            img = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(img)
            return text.strip()
        except ImportError:
            logger.warning("pytesseract not installed. Returning image descriptor.")
            return "Image uploaded (OCR requires tesseract-ocr binary on host system). Please upload a text PDF for complete extraction."
        except Exception as e:
            logger.error(f"OCR image extraction error: {e}")
            return f"Image processing notice: OCR engine encountered ({str(e)})."

    @classmethod
    def extract_document_text(cls, file_bytes: bytes, filename: str) -> Tuple[str, str]:
        """Auto-detect format and extract textual content."""
        name_lower = filename.lower()
        if name_lower.endswith(".pdf"):
            text, pages = cls.extract_text_from_pdf(file_bytes)
            return text, "pdf"
        elif name_lower.endswith((".png", ".jpg", ".jpeg", ".webp")):
            text = cls.extract_text_from_image(file_bytes)
            return text, "image"
        elif name_lower.endswith(".txt"):
            try:
                return file_bytes.decode("utf-8"), "txt"
            except UnicodeDecodeError:
                return file_bytes.decode("latin-1", errors="ignore"), "txt"
        else:
            raise ValueError("Unsupported format. Please upload PDF, PNG, JPG, or TXT documents.")

ocr_service = OCRService()

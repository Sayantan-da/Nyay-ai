# Nyaya AI Auto Smart Scanner — Evidence-First Upgrade

**Status: FINALIZED**

## Goal
Improve the existing Auto Smart Scanner in place. Preserve FastAPI, Ollama, FAISS, existing upload API compatibility, and the React Native scanner flow. Do not rebuild the scanner or claim legal certainty.

## First implementation increment
1. Make ingestion fail safely for unsupported, empty, oversized, malformed, and unreadable files.
2. Ensure OCR failures are reported as extraction failures rather than placeholder text.
3. Prevent user-supplied filenames from controlling upload paths.
4. Add focused automated tests for extraction and upload validation.
5. Keep successful `/api/scanner/upload` response fields backward compatible.

## Follow-up increments
- Preserve page-aware extracted text and attach evidence excerpts to findings.
- Make heuristic findings clause-local; do not infer risk from unrelated text elsewhere in a document.
- Ground legal-basis fields only in retrieved, verifiable sources; otherwise leave them empty and disclose uncertainty.
- Improve the React Native report with evidence-first clause cards and transparent risk categories.
- Add scanned-PDF OCR only with a documented, available OCR engine and tests.

## Acceptance criteria
- Invalid and empty uploads return controlled 4xx responses, not internal-error traces.
- Unsupported formats and oversized uploads are rejected.
- OCR unavailability or failure cannot be represented as successful text extraction.
- Upload paths remain within the configured upload directory regardless of supplied filename.
- Existing scanner response schema remains compatible.
- Automated tests cover new failure cases and the existing scanner workflow.
- No claim of completion without captured test output.

## Out of scope
- Replacing Ollama, FAISS, or the current mobile framework.
- Adding a cloud LLM or sending contract contents to a third party.
- Presenting a numeric score as a legal determination.
- Generating statutory citations that cannot be verified against retrieved sources.

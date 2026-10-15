# BRD + Project Presentation Coverage Matrix

This matrix maps the supplied **BRD For Sakshi.pdf** and **AI Document Intelligent System Blue Theme.pdf** to the current codebase. It distinguishes implemented features from deployment-dependent items and requirements that are not yet complete.

## Project presentation: AI Document Intelligent System

| Requirement from presentation | Code location / status |
|---|---|
| Digital PDF, DOCX, TXT and common data/image uploads | `backend/app/main.py` — `/api/documents/upload` |
| Image preprocessing (grayscale, contrast, upscale, denoise) | `backend/app/services/ingestion/service.py` — `preprocess_image` |
| OCR for images and scanned/low-text PDF pages | `backend/app/services/ingestion/service.py` — `ocr_image`, `extract_text`; requires Tesseract in runtime |
| AI/NLP text analysis | extracted text is chunked and embedded; RAG/LLM provider in `backend/app/services/llm/provider.py` |
| Document classification | `classify_document` (TF-IDF/logistic-regression baseline, with keyword fallback) |
| Key-field extraction (name, date, amount, ID) | `extract_key_fields` |
| Persist and display document results | SQLAlchemy `Document` / `DocumentChunk` records and Document Intelligence UI |
| Human verification / reject extracted result | `/api/documents/{id}/verify` |
| Re-index and export results | `/api/documents/{id}/reindex`, `/api/documents/{id}/export` |
| Handwritten text recognition | **Not guaranteed**. Tesseract OCR is included, but handwriting accuracy needs separate evaluation/model support. |

## BRD: Multi-Tenant AI Agent Platform

| Requirement | Code location / status |
|---|---|
| Registration/login, password hashing, JWT and refresh/logout | `/api/auth/*`; `backend/app/core/security.py` |
| Tenant-scoped protected data and retrieval | JWT-derived tenant context; `DocumentChunk.tenant_id`; tenant isolation tests |
| PDF/DOCX/TXT and image ingestion + embeddings | `/api/documents/upload`; ingestion and embedding services |
| URL crawling | `/api/websites/crawl`; same-host crawl and robots.txt support |
| Sitemap crawling | Supported by crawler when sitemap URL is provided or declared by robots.txt |
| RAG answer grounded in tenant knowledge | `/api/chat`, `/api/public/chat`; retrieval, context manager and LLM provider |
| Agent persona, tone, prompt and widget appearance | Agent APIs and AI Agent / Settings UI |
| Embeddable website chat | Public chat endpoint and chat route; verify generated embed instructions in the Web UI before production deployment |
| Dashboard analytics | `/api/analytics`; analytics UI |
| Unified conversations and live human takeover | `/api/conversations*` takeover/release/message routes |
| Fallback detection, feedback and correction workflow | `/api/feedback`, `/api/knowledge-gaps*` |
| Flutter admin client | `mobile/` — starter administration client; validate on a real device |
| Booking and optional checkout | Booking APIs and demo checkout; Stripe requires secrets and webhook setup |
| Push notifications | **Not a complete production push-notification delivery system**; mobile UI support should not be interpreted as APNs/FCM configured delivery |
| Performance targets (<500 ms widget load, <2 s response start) | **Not load-tested or guaranteed** in this archive |
| TLS 1.2+, production secrets, strict deployment CORS, managed storage, monitoring/backups | Deployment configuration required before public production use |
| Payment subscriptions | Out of scope per BRD Phase 1; appointment checkout is separate and optional |

## Local run

Follow `docs/windows-runbook.md`. The intended stack is Docker Compose + PostgreSQL/pgvector + FastAPI + Next.js. OCR needs Tesseract (installed in the backend Docker image). For generative answers, configure `GROQ_API_KEY`; without it, the app uses a conservative extractive fallback.

## Validation honesty

Python syntax compilation is a lightweight check, not proof of end-to-end operation. Docker/browser/mobile end-to-end checks require the target environment. Run `docker compose up --build`, seed the demo account, and run `docker compose exec backend pytest -q` before demonstrating. Do not use demo secrets or the default demo credentials in a public deployment.

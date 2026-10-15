# Multi-Tenant AI Agent Platform

Enterprise-style multi-tenant AI platform combining document intelligence (OCR, preprocessing, ML classification, structured extraction and verification), LLM/RAG support, semantic retrieval, tenant isolation, private knowledge ingestion, website crawling, human handoff, feedback, analytics, conversational booking and optional payments.

## Stack
- Backend: Python 3.12, FastAPI, SQLAlchemy, PostgreSQL + pgvector, Redis, JWT
- AI: provider abstraction, Groq when configured, safe local fallback, Sentence Transformers `all-MiniLM-L6-v2`, TF-IDF/Logistic Regression document-classification baseline
- Document AI: PyMuPDF, Tesseract OCR, Pillow preprocessing, structured key-field extraction and reviewer verification
- Web: Next.js 14, TypeScript, light SaaS UI
- Mobile: Flutter
- Deployment: Docker Compose

## Run the complete stack

For a step-by-step Windows 11 walkthrough and troubleshooting, see [`docs/windows-runbook.md`](docs/windows-runbook.md).

1. Install Docker Desktop.
2. Copy `.env.example` to `.env` and optionally add `GROQ_API_KEY`.
3. Run:

```bash
docker compose up --build
```

4. In another terminal seed demo data:

```bash
docker compose exec backend python seed.py
```

Open `http://localhost:3000`.

Demo: `demo@example.com` / `Demo123!`

Swagger: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

## Local development

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
# Set DATABASE_URL to a running PostgreSQL + pgvector instance
alembic upgrade head
python seed.py
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` when needed.

### Mobile

```bash
cd mobile
flutter pub get
flutter run
```

For Android emulator, `10.0.2.2` maps to the host machine. For a physical device, change `apiBase` in `mobile/lib/main.dart` to the host LAN address.

## Migrations

```bash
cd backend
alembic upgrade head
```

## Test

```bash
cd backend
pytest -q
```


## Module 7 — Conversational Booking & Transaction Engine

The platform now includes autonomous appointment booking and centralized transaction analytics. Customers can request a service/date/time in the public AI chat; the backend validates the tenant's service catalog and checks overlapping appointments before confirming the slot.

### Booking modes
- **Free bookings:** appointment is confirmed immediately.
- **Paid bookings:** appointment is held as `pending_payment` until checkout succeeds.
- **Demo checkout:** works without external credentials.
- **Stripe Checkout:** enabled by setting `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.

### Booking APIs
- `POST /api/bot/book-appointment` — reserve an available slot.
- `POST /api/payments/create-session` — create payment checkout.
- `POST /api/payments/webhook/stripe` — confirm successful Stripe payments.
- `POST /api/payments/demo/{session_id}/complete` — complete local demo checkout.
- `PUT /api/tenant/settings/booking` — switch Free/Paid mode.
- `GET /api/booking/services` / `POST /api/booking/services` — service catalog.
- `GET /api/appointments` — tenant appointments.
- `GET /api/analytics/bookings/monthly` — monthly trend.
- `GET /api/analytics/bookings/time-wise` — booking-hour distribution.
- `GET /api/analytics/bookings/category` — service/category distribution.
- `POST /api/public/chat` — unauthenticated customer chatbot endpoint.

The Web **Bookings** page and Flutter client consume the same APIs, so booking metrics come from one tenant-scoped backend pipeline.

## Main API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET/POST /api/agents`
- `PATCH /api/agents/{id}`
- `POST /api/documents/upload`
- `GET /api/documents`
- `GET /api/documents/{id}`
- `GET /api/documents/{id}/chunks`
- `PUT /api/documents/{id}/verify`
- `GET /api/knowledge/search`
- `DELETE /api/documents/{id}`
- `POST /api/websites/crawl`
- `GET /api/knowledge/sources`
- `GET/POST /api/faqs`
- `POST /api/chat`
- `GET /api/conversations`
- `GET /api/conversations/{id}`
- `POST /api/conversations/{id}/takeover`
- `POST /api/conversations/{id}/release`
- `POST /api/conversations/{id}/message`
- `GET/POST /api/feedback`
- `GET /api/knowledge-gaps`
- `POST /api/knowledge-gaps/{id}/resolve`
- `GET /api/analytics`
- `GET /api/analytics/bookings/monthly`
- `GET /api/analytics/bookings/time-wise`
- `GET /api/analytics/bookings/category`
- `GET /api/team`

## Tenant isolation
Every protected API resolves the tenant from JWT claims and verifies membership. Vector retrieval explicitly filters on `DocumentChunk.tenant_id`. The tests include a tenant-scoping contract.

## Research alignment
See `docs/research-gap-mapping.md`, `docs/architecture.md` and `docs/rag-pipeline.md`.

## Known limitations
- Redis is provisioned for the architecture but the current core API remains usable without making Redis a hard dependency.
- The LLM fallback is intentionally conservative and does not pretend to be a general-purpose local LLM.
- Original uploads are retained in the local `backend/uploads` volume for re-indexing. For production, replace local disk storage with managed object storage and lifecycle policies.
- Module 7 uses database-backed availability and a bounded conversational parser; Google/Microsoft calendar synchronization is not included.
- Stripe is optional; demo checkout keeps paid-booking flows runnable without credentials.
- The Flutter client is an administration starter client; the web dashboard contains the complete primary management experience.

## Document Intelligence

See `docs/document-intelligence.md`. The Document AI page is available at `/document-intelligence`. The implementation now covers the supplied specification's OCR, image preprocessing, AI/NLP analysis, classification, information extraction, storage/display and verification workflow.

## Supplied PDF alignment

`docs/pdf-coverage.md` maps the supplied project PDF methodology to the implementation. The main missing-from-original prototype capabilities—scanned-image OCR, image preprocessing, ML classification, structured key-field extraction and reviewer verification—are now included.

## Validation status

The project includes automated unit/contract tests. Run `docker compose exec backend pytest -q` after the stack is built. The authoring environment used to prepare this archive did not have Docker or all pinned Python packages available, so a full container/browser end-to-end run could not be performed here; do not treat the archive as independently production-certified.


See `docs/brd-ppt-coverage-matrix.md` for the BRD + presentation feature audit.

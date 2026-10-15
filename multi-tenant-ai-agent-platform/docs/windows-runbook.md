# Windows 11 — complete runbook

This is the recommended path for a repeatable demo because it starts PostgreSQL + pgvector, the API, OCR dependencies and the web dashboard together.

## Prerequisites

1. Install Docker Desktop for Windows and start it.
2. In PowerShell, run `docker --version` and `docker compose version`.
3. Extract the ZIP to a short path such as `C:\projects\multi-tenant-ai-agent-platform`.
4. Open PowerShell in the extracted project root (the folder containing `docker-compose.yml`).

## First run

```powershell
Copy-Item .env.example .env
# Optional: edit .env and set GROQ_API_KEY. The app still starts without it.
docker compose up --build -d
docker compose ps
docker compose logs --tail 100 backend
```

Wait for the backend to finish `alembic upgrade head`. Then seed the demo workspace:

```powershell
docker compose exec backend python seed.py
```

Open:

- Web app: http://localhost:3000
- API health: http://localhost:8000/health
- Interactive API docs: http://localhost:8000/docs

Demo login: `demo@example.com` / `Demo123!`.

## Verify the main flows

1. Log in and open **Knowledge**; add an FAQ or upload a text/PDF document.
2. Open **Document AI**; inspect classification and extracted fields, then verify/reject the result.
3. Open **AI Agent** and ask a question grounded in the knowledge you added.
4. Open **Conversations** and verify conversation history / handoff controls.
5. Open **Bookings**; inspect services and appointment analytics. The demo seed adds Consultation and Premium Demo services.
6. Open **Analytics**, **Feedback**, **Websites**, **Team**, and **Settings** to explore management modules.

## Useful commands

```powershell
# Follow logs
 docker compose logs -f backend
 docker compose logs -f frontend

# Stop services but retain database data
 docker compose down

# Stop services and DELETE the database volume (destructive)
 docker compose down -v

# Rebuild after code changes
 docker compose up --build -d

# Backend automated tests inside the installed container
 docker compose exec backend pytest -q
```

## Troubleshooting

- **Docker command not found:** install/start Docker Desktop, then reopen PowerShell.
- **Port 3000/8000/5432 already in use:** stop the conflicting app or change the left-hand port in `docker-compose.yml`.
- **Backend cannot connect to database:** check `docker compose ps` and `docker compose logs db`; wait until the database health check is healthy.
- **Login fails on a clean database:** run `docker compose exec backend python seed.py` after migrations finish.
- **Scanned document returns no text:** use a clear, upright scan. The container installs English Tesseract OCR; handwriting and low-quality scans may still fail.
- **AI answers are conservative:** without `GROQ_API_KEY`, the app uses a local extractive fallback, not a generative LLM. Configure the key in `.env` and recreate the backend with `docker compose up -d --force-recreate backend` to enable Groq.
- **Embedding model first-run delay:** Sentence Transformers may download a model on first use if outbound network access is available. If unavailable, the deterministic local fallback keeps the API shape working, but retrieval quality is lower.
- **Frontend shows API errors:** verify `http://localhost:8000/health` and check backend logs.

## Production hardening checklist

Before public deployment, replace all demo secrets, configure HTTPS and strict CORS, use managed object storage, add backups and monitoring, configure real calendar/payment credentials, review retention/privacy obligations, and load-test the system. Demo credentials and compose defaults are for local evaluation only.

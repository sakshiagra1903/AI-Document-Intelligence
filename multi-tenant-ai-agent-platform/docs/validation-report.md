# Validation report for the delivered archive

## Checks performed in the build workspace

- Python bytecode compilation: passed for backend app, seed script and tests.
- Document-intelligence and context/tenant-scope unit/contract tests: 4 passed.
- ZIP integrity: checked after packaging.
- Code review fixes applied during this pass:
  - Corrected the `DocumentChunk` composite index to reference existing columns (`tenant_id`, `document_id`).
  - Added original-upload storage and tenant-scoped re-indexing/deletion cleanup.
  - Fixed the public-booking email fallback expression.
  - Made Alembic honor the `DATABASE_URL` environment variable.
  - Pinned a Passlib-compatible bcrypt version.
  - Fixed context-budget handling so a long top-ranked chunk can be clipped instead of producing empty context.

## Checks not completed in this workspace

- Docker Compose end-to-end boot: Docker CLI/daemon was unavailable.
- Full pytest suite: the workspace did not have all pinned dependencies installed (`python-jose` and `pgvector` were unavailable), and network access prevented installing them. The Docker image installs dependencies from `requirements.txt`; run the full suite inside the built backend container.
- Next.js production build: frontend dependencies were not installed in the workspace and network access was unavailable.
- Real Groq, Stripe, external calendar providers and mobile-device testing require user credentials/devices and are not claimed as verified.

A passing subset of tests is not equivalent to a fully production-certified application. Use `docs/windows-runbook.md` to perform the complete local validation after Docker Desktop is installed.

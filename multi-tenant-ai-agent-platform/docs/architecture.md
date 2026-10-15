# Architecture

Customer -> Next.js public chat -> FastAPI -> tenant authorization -> RAG engine -> pgvector -> context manager -> LLM provider -> grounded response -> citations / human handoff.

Private knowledge follows extraction -> cleaning -> chunking -> embedding -> tenant-scoped vector storage -> retrieval.

Every protected query derives `tenant_id` from the verified JWT and never accepts an arbitrary tenant ID from the client.

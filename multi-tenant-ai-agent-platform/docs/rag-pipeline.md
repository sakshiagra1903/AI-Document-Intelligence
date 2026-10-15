# RAG pipeline

1. Receive the customer question.
2. Load recent conversation history.
3. Create a normalized embedding for the question.
4. Query only chunks belonging to the current tenant.
5. Rank by cosine similarity and apply the agent threshold.
6. Deduplicate and fit retrieved chunks plus recent history into the context budget.
7. Ask the configured LLM to answer only from verified knowledge.
8. If no usable context is available, return the configured fallback and create a knowledge gap.
9. Attach source metadata to the assistant message.

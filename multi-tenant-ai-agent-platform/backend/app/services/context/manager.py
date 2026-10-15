import re


def estimate_tokens(text: str) -> int:
    """Conservative, dependency-free token estimate for context budgeting."""
    return max(1, int(len(re.findall(r'\S+', text)) * 1.3 + 0.999))


def build_context(chunks, history, max_tokens=3500, max_history=10):
    """Rank chunks and enforce the context budget, truncating the top result if needed."""
    chosen = []
    used = 0
    budget = max(1, int(max_tokens))
    ranked = sorted(chunks, key=lambda item: item.get('similarity', 0), reverse=True)
    for chunk in ranked:
        content = chunk.get('content', '')
        if not content.strip():
            continue
        cost = estimate_tokens(content)
        remaining = budget - used
        if cost <= remaining:
            chosen.append(chunk)
            used += cost
            continue
        # If the top-ranked chunk is larger than the entire budget, retain a useful
        # excerpt rather than returning an empty context and discarding all evidence.
        if not chosen and remaining > 0:
            word_limit = max(1, int(remaining / 1.3))
            excerpt = ' '.join(content.split()[:word_limit])
            if excerpt:
                clipped = dict(chunk)
                clipped['content'] = excerpt
                chosen.append(clipped)
        break
    hist = history[-max(0, int(max_history)):] if max_history else []
    return chosen, hist

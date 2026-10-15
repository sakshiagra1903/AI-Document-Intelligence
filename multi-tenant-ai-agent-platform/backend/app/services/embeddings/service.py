import hashlib, math
from app.core.config import settings

_model=None
def _local_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model=SentenceTransformer(settings.embedding_model)
        except Exception: _model=False
    return _model

def embed(text: str) -> list[float]:
    model=_local_model()
    if model:
        return model.encode(text,normalize_embeddings=True).tolist()
    # deterministic offline fallback; preserves API shape and enables demo/testing
    dims=384; v=[0.0]*dims
    for tok in text.lower().split():
        h=int(hashlib.sha256(tok.encode()).hexdigest(),16)
        for i in (h%dims,(h//dims)%dims,(h//dims**2)%dims): v[i]+=1.0 if h%2 else -1.0
    n=math.sqrt(sum(x*x for x in v)) or 1
    return [x/n for x in v]

def cosine(a,b):
    return sum(x*y for x,y in zip(a,b))/(math.sqrt(sum(x*x for x in a))*math.sqrt(sum(y*y for y in b)) or 1)

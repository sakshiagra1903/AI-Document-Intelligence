from sqlalchemy.orm import Session
from app.models import DocumentChunk, FAQ
from app.services.embeddings.service import embed, cosine

def retrieve(db: Session, tenant_id, query, top_k=5, threshold=.42):
    q=embed(query)
    rows=db.query(DocumentChunk).filter(DocumentChunk.tenant_id==tenant_id).all()
    out=[]
    for r in rows:
        s=cosine(q,r.embedding); out.append({'content':r.content,'similarity':s,'metadata':r.metadata_})
    out=[x for x in out if x['similarity']>=threshold]
    out.sort(key=lambda x:x['similarity'],reverse=True)
    return out[:top_k]

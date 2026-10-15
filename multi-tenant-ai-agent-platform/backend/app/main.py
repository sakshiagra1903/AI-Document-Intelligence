import os, secrets, hashlib, re
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.security import *
from app.db.session import get_db, engine, Base
from app.models import *
from app.schemas.api import *
from app.api.deps import get_current_user, require_roles
from app.services.ingestion.service import extract_text,chunks,classify_document,extract_key_fields
from app.services.embeddings.service import embed
from app.services.retrieval.service import retrieve
from app.services.context.manager import build_context
from app.services.llm.provider import LLMProvider
from app.services.crawler.service import crawl
from app.services.booking.service import get_settings as get_booking_settings, book as create_booking, find_service, parse_booking_intent
from app.services.booking.payments import create_payment_session

app=FastAPI(title=settings.app_name,version='1.0.0',description='Enterprise multi-tenant RAG customer support platform')
app.add_middleware(CORSMiddleware,allow_origins=settings.origins,allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
os.makedirs(settings.upload_dir,exist_ok=True)

@app.get('/health')
def health(db:Session=Depends(get_db)):
    try: db.execute(func.now()); return {'status':'ok','database':'ok'}
    except Exception as e: return {'status':'degraded','database':str(e)}

@app.post('/api/auth/register')
def register(x:RegisterIn,db:Session=Depends(get_db)):
    if db.query(User).filter_by(email=x.email.lower()).first(): raise HTTPException(409,'Email already registered')
    tenant=Tenant(name=x.business_name,website=x.website,industry=x.industry,description=x.description); user=User(email=x.email.lower(),password_hash=hash_password(x.password),name=x.name)
    db.add_all([tenant,user]); db.flush(); db.add(TenantMember(tenant_id=tenant.id,user_id=user.id,role='TENANT_ADMIN'))
    agent=Agent(tenant_id=tenant.id,name=f'{x.business_name} Support Agent',description='AI customer-support assistant'); db.add(agent); db.commit()
    return tokens_for(user,tenant,'TENANT_ADMIN',db)

def tokens_for(user,tenant,role,db):
    access=create_access_token(user.id,tenant.id,role); refresh=create_refresh_token(user.id,tenant.id)
    db.add(RefreshToken(user_id=user.id,token_hash=hash_api_key(refresh),expires_at=datetime.now(timezone.utc)+timedelta(days=settings.refresh_token_days))); db.commit()
    return {'access_token':access,'refresh_token':refresh,'token_type':'bearer','user':{'id':str(user.id),'email':user.email,'name':user.name},'tenant':{'id':str(tenant.id),'name':tenant.name},'role':role}

@app.post('/api/auth/login')
def login(x:LoginIn,db:Session=Depends(get_db)):
    u=db.query(User).filter_by(email=x.email.lower()).first()
    if not u or not verify_password(x.password,u.password_hash): raise HTTPException(401,'Invalid credentials')
    m=db.query(TenantMember).filter_by(user_id=u.id).first(); t=db.get(Tenant,m.tenant_id); return tokens_for(u,t,m.role,db)

@app.post('/api/auth/refresh')
def refresh(x:RefreshIn,db:Session=Depends(get_db)):
    p=decode_token(x.refresh_token,True); row=db.query(RefreshToken).filter_by(token_hash=hash_api_key(x.refresh_token),revoked=False).first()
    if not row or row.expires_at<datetime.now(timezone.utc): raise HTTPException(401,'Refresh token expired')
    uid=UUID(p['sub']); u=db.get(User,uid); m=db.query(TenantMember).filter_by(user_id=uid,tenant_id=UUID(p['tenant_id'])).first(); t=db.get(Tenant,m.tenant_id); row.revoked=True; db.commit(); return tokens_for(u,t,m.role,db)

@app.post('/api/auth/logout')
def logout(x:RefreshIn,db:Session=Depends(get_db)):
    row=db.query(RefreshToken).filter_by(token_hash=hash_api_key(x.refresh_token)).first()
    if row: row.revoked=True; db.commit()
    return {'ok':True}

@app.get('/api/me')
def me(c=Depends(get_current_user)): return {'user':{'id':str(c['user'].id),'email':c['user'].email,'name':c['user'].name},'tenant':{'id':str(c['tenant'].id),'name':c['tenant'].name,'website':c['tenant'].website,'industry':c['tenant'].industry},'role':c['role']}

@app.get('/api/agents')
def agents(c=Depends(get_current_user),db:Session=Depends(get_db)): return db.query(Agent).filter_by(tenant_id=c['tenant'].id).all()
@app.post('/api/agents')
def create_agent(x:AgentIn,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)): a=Agent(tenant_id=c['tenant'].id,**x.model_dump()); db.add(a); db.commit(); db.refresh(a); return a
@app.patch('/api/agents/{id}')
def update_agent(id:UUID,x:AgentIn,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)):
    a=db.query(Agent).filter_by(id=id,tenant_id=c['tenant'].id).first()
    if not a: raise HTTPException(404,'Agent not found')
    for k,v in x.model_dump().items(): setattr(a,k,v)
    db.commit(); db.refresh(a); return a

def process_document(document_id,tenant_id,source_id,filename,data,db):
    d=db.get(Document,document_id)
    try:
        db.query(DocumentChunk).filter_by(document_id=document_id,tenant_id=tenant_id).delete(synchronize_session=False)
        pages,ocr_used=extract_text(filename,data)
        full_text='\n'.join(t for _,t in pages if t).strip()
        if not full_text:
            raise ValueError('No readable text was extracted. For scanned PDFs/images, verify that Tesseract OCR is installed and the document is clear.')
        label,confidence,classifier=classify_document(full_text)
        extracted=extract_key_fields(full_text)
        parts=chunks(pages)
        for page,text in parts:
            db.add(DocumentChunk(tenant_id=tenant_id,document_id=document_id,content=text,embedding=embed(text),metadata_={'source':filename,'page':page,'ocr':ocr_used}))
        d.chunks=len(parts); d.status='indexed'; d.ocr_used=ocr_used; d.classification=label; d.classification_confidence=confidence; d.extracted_data=extracted; d.verification_status='pending'
        s=db.get(KnowledgeSource,source_id); s.status='indexed'; s.metadata_={**(s.metadata_ or {}),'ocr_used':ocr_used,'classification':label,'classification_confidence':confidence,'classifier':classifier,'extracted_fields':list(extracted.keys())}; db.commit()
    except Exception as e:
        d.status='error'; d.error=str(e)[:1000]
        source=db.get(KnowledgeSource,source_id)
        if source: source.status='error'
        db.commit()

@app.post('/api/documents/upload')
async def upload(file:UploadFile=File(...),background:BackgroundTasks=None,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)):
    allowed={'.pdf','.docx','.txt','.md','.csv','.json','.html','.png','.jpg','.jpeg','.tiff','.bmp','.webp'}; original_name=os.path.basename(file.filename or 'upload'); ext=os.path.splitext(original_name)[1].lower(); data=await file.read()
    if ext not in allowed: raise HTTPException(400,'Unsupported file type')
    if len(data)>settings.max_upload_size: raise HTTPException(413,'File too large')
    if not data: raise HTTPException(400,'The uploaded file is empty')
    os.makedirs(settings.upload_dir,exist_ok=True)
    storage_key=f'{secrets.token_hex(16)}{ext}'
    storage_path=os.path.join(settings.upload_dir,storage_key)
    with open(storage_path,'wb') as stored: stored.write(data)
    s=KnowledgeSource(tenant_id=c['tenant'].id,type='document',name=original_name,status='processing'); db.add(s); db.flush(); d=Document(tenant_id=c['tenant'].id,source_id=s.id,filename=original_name,file_type=ext,file_size=len(data),storage_key=storage_key); db.add(d); db.commit()
    process_document(d.id,c['tenant'].id,s.id,original_name,data,db)
    db.refresh(d); return d
@app.get('/api/documents')
def documents(c=Depends(get_current_user),db:Session=Depends(get_db)): return db.query(Document).filter_by(tenant_id=c['tenant'].id).order_by(Document.created_at.desc()).all()
@app.delete('/api/documents/{id}')
def delete_doc(id:UUID,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)):
    d=db.query(Document).filter_by(id=id,tenant_id=c['tenant'].id).first();
    if not d: raise HTTPException(404,'Document not found')
    storage_path=os.path.join(settings.upload_dir,d.storage_key) if d.storage_key else None
    source=db.get(KnowledgeSource,d.source_id)
    db.delete(d)
    if source: db.delete(source)
    db.commit()
    if storage_path and os.path.isfile(storage_path):
        try: os.remove(storage_path)
        except OSError: pass
    return {'ok':True}
@app.post('/api/documents/{id}/reindex')
def reindex(id:UUID,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)):
    d=db.query(Document).filter_by(id=id,tenant_id=c['tenant'].id).first()
    if not d: raise HTTPException(404,'Document not found')
    if not d.storage_key: raise HTTPException(409,'Original file is unavailable. Upload the document again to enable re-indexing.')
    path=os.path.join(settings.upload_dir,os.path.basename(d.storage_key))
    if not os.path.isfile(path): raise HTTPException(410,'Stored source file is missing. Upload the document again.')
    with open(path,'rb') as source_file: data=source_file.read()
    d.status='processing'; d.error=None; d.chunks=0; db.commit()
    process_document(d.id,c['tenant'].id,d.source_id,d.filename,data,db)
    db.refresh(d)
    if d.status=='error': raise HTTPException(422,d.error or 'Document processing failed')
    return d

@app.get('/api/documents/{id}')
def document_detail(id:UUID,c=Depends(get_current_user),db:Session=Depends(get_db)):
    d=db.query(Document).filter_by(id=id,tenant_id=c['tenant'].id).first()
    if not d: raise HTTPException(404,'Document not found')
    return d

@app.put('/api/documents/{id}/verify')
def verify_document(id:UUID,x:VerificationIn,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER','HUMAN_SUPPORT')),db:Session=Depends(get_db)):
    d=db.query(Document).filter_by(id=id,tenant_id=c['tenant'].id).first()
    if not d: raise HTTPException(404,'Document not found')
    d.verification_status=x.status; d.verification_notes=x.notes
    db.add(AnalyticsEvent(tenant_id=c['tenant'].id,event='document_verified'))
    db.commit(); db.refresh(d); return d

@app.get('/api/documents/{id}/export')
def export_document_result(id:UUID,c=Depends(get_current_user),db:Session=Depends(get_db)):
    d=db.query(Document).filter_by(id=id,tenant_id=c['tenant'].id).first()
    if not d: raise HTTPException(404,'Document not found')
    return {'document':d.filename,'classification':d.classification,'classification_confidence':d.classification_confidence,'ocr_used':d.ocr_used,'verification_status':d.verification_status,'extracted_data':d.extracted_data or {},'indexed_chunks':d.chunks}

@app.get('/api/documents/{id}/chunks')
def document_chunks(id:UUID,c=Depends(get_current_user),db:Session=Depends(get_db)):
    d=db.query(Document).filter_by(id=id,tenant_id=c['tenant'].id).first()
    if not d: raise HTTPException(404,'Document not found')
    return db.query(DocumentChunk).filter_by(document_id=id,tenant_id=c['tenant'].id).order_by(DocumentChunk.created_at.asc()).all()

@app.get('/api/knowledge/search')
def knowledge_search(q:str=Query(min_length=2,max_length=500),c=Depends(get_current_user),db:Session=Depends(get_db)):
    rows=retrieve(db,c['tenant'].id,q,top_k=8,threshold=0.0)
    return {'query':q,'results':rows}

@app.post('/api/faqs')
def add_faq(x:FAQIn,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)):
    f=FAQ(tenant_id=c['tenant'].id,**x.model_dump()); db.add(f); db.flush(); db.add(DocumentChunk(tenant_id=c['tenant'].id,document_id=None,content=f'FAQ: {f.question}\nAnswer: {f.answer}',embedding=embed(f'{f.question} {f.answer}'),metadata_={'source':'FAQ','faq_id':str(f.id)})); db.commit(); return f
@app.get('/api/faqs')
def faqs(c=Depends(get_current_user),db:Session=Depends(get_db)): return db.query(FAQ).filter_by(tenant_id=c['tenant'].id).all()

@app.get('/api/knowledge/sources')
def sources(c=Depends(get_current_user),db:Session=Depends(get_db)): return db.query(KnowledgeSource).filter_by(tenant_id=c['tenant'].id).order_by(KnowledgeSource.created_at.desc()).all()

@app.post('/api/websites/crawl')
async def crawl_site(x:CrawlIn,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)):
    s=KnowledgeSource(tenant_id=c['tenant'].id,type='website',name=str(x.url),status='crawling'); db.add(s); db.flush()
    pages=await crawl(str(x.url),min(x.max_pages,settings.max_pages),min(x.max_depth,settings.max_depth),settings.crawl_delay)
    for url,title,content in pages:
        p=WebsitePage(tenant_id=c['tenant'].id,source_id=s.id,url=url,title=title,content=content); db.add(p); db.flush()
        for page,text in chunks([(1,content)]): db.add(DocumentChunk(tenant_id=c['tenant'].id,document_id=None,content=text,embedding=embed(text),metadata_={'source':title,'url':url}))
    s.status='indexed'; s.metadata_={'pages':len(pages),'url':str(x.url)}; db.commit(); return {'source_id':str(s.id),'pages':len(pages),'status':'indexed'}

@app.post('/api/public/chat')
async def public_chat(x:ChatIn,db:Session=Depends(get_db)):
    a=db.query(Agent).filter_by(id=x.agent_id,active=True).first()
    if not a: raise HTTPException(404,'Agent not found')
    tenant_id=a.tenant_id
    conv=db.query(Conversation).filter_by(id=x.conversation_id,tenant_id=tenant_id).first() if x.conversation_id else None
    if not conv: conv=Conversation(tenant_id=tenant_id,agent_id=a.id,customer_id=x.customer_id); db.add(conv); db.flush()
    hist=db.query(Message).filter_by(conversation_id=conv.id,tenant_id=tenant_id).order_by(Message.created_at).all()
    db.add(Message(tenant_id=tenant_id,conversation_id=conv.id,role='user',content=x.message)); db.flush()
    intent=parse_booking_intent(x.message)
    if intent.get('intent') and intent.get('date') and intent.get('time') and intent.get('service'):
        import datetime as dt
        try: start=dt.datetime.fromisoformat(f"{intent['date']}T{intent['time']}").replace(tzinfo=dt.timezone.utc)
        except ValueError: start=None
        if start:
            email=intent.get('email')
            if not email and '@' in x.customer_id:
                email=x.customer_id
            name=(re.search(r'(?:my name is|i am|i\'m)\s+([A-Za-z][A-Za-z .\'-]{1,80})',x.message,re.I) or [None,None])[1] or 'Chat Customer'
            if not email:
                db.commit(); return {'conversation_id':str(conv.id),'answer':'I can book that slot. Please provide your email address and your name so I can confirm it.','sources':[],'handoff_required':False,'booking_required_fields':['name','email']}
            settings=get_booking_settings(db,tenant_id); payload={'start_at':start,'service':intent['service'],'customer_name':name,'customer_email':email,'customer_phone':intent.get('phone'),'conversation_id':conv.id,'duration_minutes':settings.slot_duration_minutes}
            ap,error=create_booking(db,tenant_id,a.id,payload,settings)
            if error:
                db.rollback(); conv=db.query(Conversation).filter_by(id=conv.id,tenant_id=tenant_id).first(); db.add(Message(tenant_id=tenant_id,conversation_id=conv.id,role='assistant',content=error)); db.commit(); return {'conversation_id':str(conv.id),'answer':error,'sources':[],'handoff_required':False}
            db.add(AnalyticsEvent(tenant_id=tenant_id,event='booking_created',value=1)); db.commit();
            if ap.requires_payment:
                session=await create_payment_session(db,tenant_id,ap,settings.payment_provider,None,None); db.commit()
                answer=f"Your {ap.service_name} appointment is reserved for {ap.start_at.strftime('%d %b %Y at %H:%M')}. Please complete payment to confirm your booking."
                return {'conversation_id':str(conv.id),'answer':answer,'sources':[],'handoff_required':False,'booking':{'appointment_id':str(ap.id),'status':ap.status,'requires_payment':True,'payment_url':session.checkout_url,'amount':ap.amount,'currency':ap.currency}}
            answer=f"Your {ap.service_name} appointment is confirmed for {ap.start_at.strftime('%d %b %Y at %H:%M')}."
            return {'conversation_id':str(conv.id),'answer':answer,'sources':[],'handoff_required':False,'booking':{'appointment_id':str(ap.id),'status':ap.status,'requires_payment':False}}
    retrieved=retrieve(db,tenant_id,x.message,a.top_k,a.similarity_threshold); selected,h=build_context(retrieved,[{'role':m.role,'content':m.content} for m in hist],a.max_context_tokens,settings.max_history_messages)
    answer=await LLMProvider().generate(a.system_instructions,[*h,{'role':'user','content':x.message}],selected,a.temperature) or a.fallback_message
    sources=[{'document':r['metadata'].get('source','knowledge'),**({'page':r['metadata']['page']} if 'page' in r['metadata'] else {}),'similarity':round(r['similarity'],3)} for r in selected]
    db.add(Message(tenant_id=tenant_id,conversation_id=conv.id,role='assistant',content=answer,sources=sources)); db.add(AnalyticsEvent(tenant_id=tenant_id,event='message',value=1)); db.commit()
    return {'conversation_id':str(conv.id),'answer':answer,'sources':sources,'handoff_required':False}

@app.post('/api/chat')
async def chat(x:ChatIn,c=Depends(get_current_user),db:Session=Depends(get_db)):
    a=db.query(Agent).filter_by(id=x.agent_id,tenant_id=c['tenant'].id,active=True).first()
    if not a: raise HTTPException(404,'Agent not found')
    conv=db.query(Conversation).filter_by(id=x.conversation_id,tenant_id=c['tenant'].id).first() if x.conversation_id else None
    if not conv: conv=Conversation(tenant_id=c['tenant'].id,agent_id=a.id,customer_id=x.customer_id); db.add(conv); db.flush()
    hist=db.query(Message).filter_by(conversation_id=conv.id,tenant_id=c['tenant'].id).order_by(Message.created_at).all()
    db.add(Message(tenant_id=c['tenant'].id,conversation_id=conv.id,role='user',content=x.message)); db.commit()
    retrieved=retrieve(db,c['tenant'].id,x.message,a.top_k,a.similarity_threshold); selected,h=build_context(retrieved,[{'role':m.role,'content':m.content} for m in hist],a.max_context_tokens,settings.max_history_messages)
    llm=LLMProvider(); answer=await llm.generate(a.system_instructions,[*h,{'role':'user','content':x.message}],selected,a.temperature)
    handoff=not bool(answer) or ('human' in x.message.lower() and 'support' in x.message.lower())
    if not answer: answer=a.fallback_message
    sources=[{'document':r['metadata'].get('source','knowledge'),**({'page':r['metadata']['page']} if 'page' in r['metadata'] else {}),'similarity':round(r['similarity'],3)} for r in selected]
    m=Message(tenant_id=c['tenant'].id,conversation_id=conv.id,role='assistant',content=answer,sources=sources,metadata_={'handoff':handoff}); db.add(m); db.add(AnalyticsEvent(tenant_id=c['tenant'].id,event='message',value=1));
    if handoff: conv.status='escalated'; db.add(KnowledgeGap(tenant_id=c['tenant'].id,query=x.message,reason='fallback_or_handoff')); db.add(Notification(tenant_id=c['tenant'].id,title='Conversation needs attention',body=x.message[:300]))
    db.commit(); return {'conversation_id':str(conv.id),'answer':answer,'sources':sources,'handoff_required':handoff}

@app.get('/api/conversations')
def conversations(c=Depends(get_current_user),db:Session=Depends(get_db)): return db.query(Conversation).filter_by(tenant_id=c['tenant'].id).order_by(Conversation.updated_at.desc()).all()
@app.get('/api/conversations/{id}')
def conversation(id:UUID,c=Depends(get_current_user),db:Session=Depends(get_db)):
    conv=db.query(Conversation).filter_by(id=id,tenant_id=c['tenant'].id).first();
    if not conv: raise HTTPException(404,'Conversation not found')
    return {'conversation':conv,'messages':db.query(Message).filter_by(conversation_id=id,tenant_id=c['tenant'].id).order_by(Message.created_at).all()}
@app.post('/api/conversations/{id}/takeover')
def takeover(id:UUID,x:TakeoverIn,c=Depends(require_roles('TENANT_ADMIN','HUMAN_SUPPORT')),db:Session=Depends(get_db)):
    conv=db.query(Conversation).filter_by(id=id,tenant_id=c['tenant'].id).first();
    if not conv: raise HTTPException(404,'Conversation not found')
    conv.status='human'; db.add(HumanIntervention(tenant_id=c['tenant'].id,conversation_id=id,user_id=c['user'].id,action='takeover',note=x.note)); db.commit(); return {'status':'human'}
@app.post('/api/conversations/{id}/release')
def release(id:UUID,c=Depends(require_roles('TENANT_ADMIN','HUMAN_SUPPORT')),db:Session=Depends(get_db)):
    conv=db.query(Conversation).filter_by(id=id,tenant_id=c['tenant'].id).first();
    if not conv: raise HTTPException(404,'Conversation not found')
    conv.status='ai'; db.add(HumanIntervention(tenant_id=c['tenant'].id,conversation_id=id,user_id=c['user'].id,action='release')); db.commit(); return {'status':'ai'}
@app.post('/api/conversations/{id}/message')
def human_message(id:UUID,x:HumanMessageIn,c=Depends(require_roles('TENANT_ADMIN','HUMAN_SUPPORT')),db:Session=Depends(get_db)):
    conv=db.query(Conversation).filter_by(id=id,tenant_id=c['tenant'].id).first();
    if not conv or conv.status!='human': raise HTTPException(400,'Conversation is not in human mode')
    m=Message(tenant_id=c['tenant'].id,conversation_id=id,role='human',content=x.content); db.add(m); db.commit(); return m

@app.post('/api/feedback')
def feedback(x:FeedbackIn,c=Depends(get_current_user),db:Session=Depends(get_db)):
    m=db.query(Message).filter_by(id=x.message_id,tenant_id=c['tenant'].id).first();
    if not m: raise HTTPException(404,'Message not found')
    f=Feedback(tenant_id=c['tenant'].id,message_id=m.id,rating=x.rating,text=x.text); db.add(f)
    if x.rating<0: db.add(KnowledgeGap(tenant_id=c['tenant'].id,query=m.content,reason='negative_feedback'))
    db.add(AnalyticsEvent(tenant_id=c['tenant'].id,event='positive_feedback' if x.rating>0 else 'negative_feedback')); db.commit(); return f
@app.get('/api/feedback')
def feedbacks(c=Depends(get_current_user),db:Session=Depends(get_db)): return db.query(Feedback).filter_by(tenant_id=c['tenant'].id).order_by(Feedback.created_at.desc()).all()
@app.get('/api/knowledge-gaps')
def gaps(c=Depends(get_current_user),db:Session=Depends(get_db)): return db.query(KnowledgeGap).filter_by(tenant_id=c['tenant'].id).order_by(KnowledgeGap.created_at.desc()).all()
@app.post('/api/knowledge-gaps/{id}/resolve')
def resolve_gap(id:UUID,x:CorrectionIn,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)):
    g=db.query(KnowledgeGap).filter_by(id=id,tenant_id=c['tenant'].id).first();
    if not g: raise HTTPException(404,'Knowledge gap not found')
    g.correction=x.correction; g.status='resolved'; f=FAQ(tenant_id=c['tenant'].id,question=g.query,answer=x.correction,category='Correction'); db.add(f); db.flush(); db.add(DocumentChunk(tenant_id=c['tenant'].id,document_id=None,content=f'Corrected knowledge: {g.query}\n{x.correction}',embedding=embed(f'{g.query} {x.correction}'),metadata_={'source':'Human correction','gap_id':str(g.id)})); db.commit(); return g

@app.get('/api/tenant/settings/booking')
def booking_settings(c=Depends(get_current_user),db:Session=Depends(get_db)):
    return get_booking_settings(db,c['tenant'].id)

@app.put('/api/tenant/settings/booking')
def update_booking_settings(x:BookingSettingsIn,c=Depends(require_roles('TENANT_ADMIN')),db:Session=Depends(get_db)):
    s=get_booking_settings(db,c['tenant'].id)
    for k,v in x.model_dump().items(): setattr(s,k,v)
    db.commit(); db.refresh(s); return s

@app.get('/api/booking/services')
def booking_services(c=Depends(get_current_user),db:Session=Depends(get_db)):
    return db.query(ServiceOffering).filter_by(tenant_id=c['tenant'].id,active=True).all()

@app.post('/api/booking/services')
def create_booking_service(x:ServiceIn,c=Depends(require_roles('TENANT_ADMIN','AGENT_MANAGER')),db:Session=Depends(get_db)):
    row=ServiceOffering(tenant_id=c['tenant'].id,**x.model_dump()); db.add(row); db.commit(); db.refresh(row); return row

@app.post('/api/bot/book-appointment')
def bot_book_appointment(x:BookAppointmentIn,db:Session=Depends(get_db)):
    agent=db.query(Agent).filter_by(id=x.agent_id,active=True).first()
    if not agent: raise HTTPException(404,'Agent not found')
    settings=get_booking_settings(db,agent.tenant_id)
    requested_payment=bool(x.requires_payment or settings.booking_mode=='paid')
    payload=x.model_dump(); payload['duration_minutes']=settings.slot_duration_minutes
    ap,error=create_booking(db,agent.tenant_id,agent.id,payload,settings)
    if error: db.rollback(); raise HTTPException(409,error)
    db.add(AnalyticsEvent(tenant_id=agent.tenant_id,event='booking_created',value=1))
    db.commit(); db.refresh(ap)
    return {'appointment_id':str(ap.id),'status':ap.status,'requires_payment':ap.requires_payment,'payment_status':ap.payment_status,'amount':ap.amount,'currency':ap.currency,'start_at':ap.start_at,'end_at':ap.end_at,'service':ap.service_name}

@app.post('/api/payments/create-session')
async def payments_create_session(x:PaymentSessionIn,db:Session=Depends(get_db)):
    agent=db.query(Agent).filter_by(id=x.agent_id,active=True).first()
    if not agent: raise HTTPException(404,'Agent not found')
    ap=db.query(Appointment).filter_by(id=x.appointment_id,tenant_id=agent.tenant_id).first()
    if not ap: raise HTTPException(404,'Appointment not found')
    if not ap.requires_payment: return {'required':False,'message':'No payment is required for this booking.','appointment_id':str(ap.id)}
    settings=get_booking_settings(db,agent.tenant_id)
    session=await create_payment_session(db,agent.tenant_id,ap,settings.payment_provider,x.success_url,x.cancel_url)
    db.commit(); return {'required':True,'provider':session.provider,'session_id':session.provider_session_id,'checkout_url':session.checkout_url,'amount':session.amount,'currency':session.currency}

@app.post('/api/payments/demo/{session_id}/complete')
def complete_demo_payment(session_id:str,db:Session=Depends(get_db)):
    ps=db.query(PaymentSession).filter_by(provider_session_id=session_id,provider='demo').first()
    if not ps: raise HTTPException(404,'Payment session not found')
    ps.status='paid'; ap=db.get(Appointment,ps.appointment_id); ap.status='confirmed'; ap.payment_status='paid'; db.add(AnalyticsEvent(tenant_id=ps.tenant_id,event='booking_paid',value=ap.amount)); db.commit()
    return {'status':'paid','appointment_id':str(ap.id)}

@app.post('/api/payments/webhook/stripe')
async def stripe_webhook(request:Request,db:Session=Depends(get_db)):
    import os
    if not os.getenv('STRIPE_WEBHOOK_SECRET'): raise HTTPException(503,'Stripe webhook is not configured')
    import stripe
    payload=await request.body(); signature=request.headers.get('stripe-signature','')
    try: event=stripe.Webhook.construct_event(payload,signature,os.getenv('STRIPE_WEBHOOK_SECRET'))
    except Exception as e: raise HTTPException(400,f'Invalid Stripe webhook: {e}')
    if event['type']=='checkout.session.completed':
        sid=event['data']['object'].get('id'); ps=db.query(PaymentSession).filter_by(provider_session_id=sid).first()
        if ps:
            ps.status='paid'; ap=db.get(Appointment,ps.appointment_id); ap.status='confirmed'; ap.payment_status='paid'; db.add(AnalyticsEvent(tenant_id=ps.tenant_id,event='booking_paid',value=ap.amount)); db.commit()
    return {'received':True}

@app.get('/api/appointments')
def appointments(c=Depends(get_current_user),db:Session=Depends(get_db)):
    return db.query(Appointment).filter_by(tenant_id=c['tenant'].id).order_by(Appointment.start_at.desc()).all()

@app.get('/api/analytics/bookings/monthly')
def booking_monthly(c=Depends(get_current_user),db:Session=Depends(get_db)):
    rows=db.query(func.date_trunc('month',Appointment.start_at).label('month'),func.count(Appointment.id)).filter(Appointment.tenant_id==c['tenant'].id,Appointment.status=='confirmed').group_by('month').order_by('month').all()
    return [{'month':m.strftime('%Y-%m'),'bookings':n} for m,n in rows]

@app.get('/api/analytics/bookings/time-wise')
def booking_timewise(c=Depends(get_current_user),db:Session=Depends(get_db)):
    rows=db.query(func.extract('hour',Appointment.start_at).label('hour'),func.count(Appointment.id)).filter(Appointment.tenant_id==c['tenant'].id,Appointment.status=='confirmed').group_by('hour').order_by('hour').all()
    return [{'hour':int(h),'label':f'{int(h):02d}:00–{(int(h)+2)%24:02d}:00','bookings':n} for h,n in rows]

@app.get('/api/analytics/bookings/category')
def booking_category(c=Depends(get_current_user),db:Session=Depends(get_db)):
    rows=db.query(Appointment.service_name,func.count(Appointment.id)).filter(Appointment.tenant_id==c['tenant'].id,Appointment.status=='confirmed').group_by(Appointment.service_name).order_by(func.count(Appointment.id).desc()).all()
    return [{'category':name,'bookings':n} for name,n in rows]

@app.get('/api/analytics')
def analytics(days:int=Query(30,ge=1,le=365),c=Depends(get_current_user),db:Session=Depends(get_db)):
    since=datetime.now(timezone.utc)-timedelta(days=days); ev=db.query(AnalyticsEvent.event,func.count(AnalyticsEvent.id)).filter(AnalyticsEvent.tenant_id==c['tenant'].id,AnalyticsEvent.created_at>=since).group_by(AnalyticsEvent.event).all()
    conv=db.query(func.count(Conversation.id)).filter(Conversation.tenant_id==c['tenant'].id,Conversation.created_at>=since).scalar() or 0
    return {'period_days':days,'total_conversations':conv,'events':{k:v for k,v in ev},'knowledge_gaps':db.query(func.count(KnowledgeGap.id)).filter(KnowledgeGap.tenant_id==c['tenant'].id,KnowledgeGap.status=='open').scalar() or 0}

@app.get('/api/team')
def team(c=Depends(get_current_user),db:Session=Depends(get_db)):
    return db.query(TenantMember,User).join(User,User.id==TenantMember.user_id).filter(TenantMember.tenant_id==c['tenant'].id).all()

# Serve compiled/static frontend if present.
frontend='/app/frontend/out'
if os.path.isdir(frontend): app.mount('/',StaticFiles(directory=frontend,html=True),name='frontend')

import re
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import BookingSettings, ServiceOffering, Appointment

BOOKING_WORDS=('book','booking','appointment','schedule','reserve','reservation','slot')

def get_settings(db:Session, tenant_id):
    s=db.query(BookingSettings).filter_by(tenant_id=tenant_id).first()
    if not s:
        s=BookingSettings(tenant_id=tenant_id); db.add(s); db.flush()
    return s

def parse_booking_intent(text:str):
    low=text.lower()
    if not any(w in low for w in BOOKING_WORDS): return {'intent':False}
    email=(re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+',text) or [None])[0]
    phone=(re.search(r'(?:\+?\d[\d ()-]{7,}\d)',text) or [None])[0]
    date_match=re.search(r'\b(20\d{2}-\d{2}-\d{2})\b',text)
    date_value=date_match.group(1) if date_match else None
    now=datetime.now(timezone.utc)
    if not date_value and re.search(r'\btomorrow\b',low): date_value=(now+timedelta(days=1)).strftime('%Y-%m-%d')
    elif not date_value and re.search(r'\btoday\b',low): date_value=now.strftime('%Y-%m-%d')
    time_match=re.search(r'\b([01]?\d|2[0-3]):([0-5]\d)\b',text)
    time_value=time_match.group(0) if time_match else None
    if not time_value:
        m=re.search(r'\b(1[0-2]|[1-9])(?:[:.]([0-5]\d))?\s*(am|pm)\b',low)
        if m:
            h=int(m.group(1)); minute=int(m.group(2) or 0); ampm=m.group(3)
            if ampm=='pm' and h!=12:h+=12
            if ampm=='am' and h==12:h=0
            time_value=f'{h:02d}:{minute:02d}'
    service_match=re.search(r'(?:for|service|appointment for)\s+([A-Za-z][A-Za-z &_-]{2,60})',text,re.I)
    return {'intent':True,'email':email,'phone':phone,'date':date_value,'time':time_value,'service':service_match.group(1).strip(' .') if service_match else None}

def find_service(db,tenant_id,name):
    q=db.query(ServiceOffering).filter_by(tenant_id=tenant_id,active=True)
    exact=q.filter(ServiceOffering.name.ilike(name)).first()
    if exact:return exact
    for s in q.all():
        if name.lower() in s.name.lower() or s.name.lower() in name.lower(): return s
    return None

def slot_is_available(db,tenant_id,start,end):
    return not db.query(Appointment).filter(Appointment.tenant_id==tenant_id,Appointment.status.in_(['confirmed','pending_payment']),Appointment.start_at < end,Appointment.end_at > start).first()

def book(db,tenant_id,agent_id,data,settings):
    start=data['start_at']; end=start+timedelta(minutes=data.get('duration_minutes',settings.slot_duration_minutes))
    if start.tzinfo is None:start=start.replace(tzinfo=timezone.utc); end=end.replace(tzinfo=timezone.utc)
    if start <= datetime.now(timezone.utc): return None,'The requested time is in the past.'
    if not slot_is_available(db,tenant_id,start,end): return None,'That slot is no longer available. Please choose another time.'
    service=find_service(db,tenant_id,data['service'])
    if not service and db.query(ServiceOffering).filter_by(tenant_id=tenant_id,active=True).count()>0:return None,'I could not find that service. Please choose one of the available services.'
    amount=service.price if service else 0
    requires=bool(settings.booking_mode=='paid' and amount>0)
    ap=Appointment(tenant_id=tenant_id,agent_id=agent_id,service_id=service.id if service else None,conversation_id=data.get('conversation_id'),customer_name=data['customer_name'],customer_email=data['customer_email'],customer_phone=data.get('customer_phone'),service_name=service.name if service else data['service'],start_at=start,end_at=end,status='pending_payment' if requires else 'confirmed',requires_payment=requires,amount=amount,currency=service.currency if service else settings.currency,payment_status='pending' if requires else 'not_required',notes=data.get('notes'))
    db.add(ap); db.flush(); return ap,None

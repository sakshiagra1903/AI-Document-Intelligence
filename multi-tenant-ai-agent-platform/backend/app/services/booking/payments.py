import os, uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models import PaymentSession, Appointment

async def create_payment_session(db:Session, tenant_id, appointment:Appointment, provider:str, success_url:str|None, cancel_url:str|None):
    if provider=='stripe' and os.getenv('STRIPE_SECRET_KEY'):
        import stripe
        stripe.api_key=os.getenv('STRIPE_SECRET_KEY')
        session=stripe.checkout.Session.create(mode='payment',line_items=[{'price_data':{'currency':appointment.currency.lower(),'product_data':{'name':appointment.service_name},'unit_amount':int(round(appointment.amount*100))},'quantity':1}],customer_email=appointment.customer_email,success_url=success_url or 'http://localhost:3000/chat/success',cancel_url=cancel_url or 'http://localhost:3000/chat/cancel')
        sid=session.id; url=session.url
    else:
        sid='demo_'+uuid.uuid4().hex; url=f'http://localhost:3000/payment/demo/{sid}'
    row=PaymentSession(tenant_id=tenant_id,appointment_id=appointment.id,provider=provider,provider_session_id=sid,checkout_url=url,amount=appointment.amount,currency=appointment.currency,status='created',expires_at=datetime.now(timezone.utc)+timedelta(minutes=30))
    db.add(row); db.flush(); return row

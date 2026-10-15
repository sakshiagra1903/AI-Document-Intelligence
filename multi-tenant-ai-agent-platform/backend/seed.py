from app.db.session import Base, engine, SessionLocal
from app.models import *
from app.core.security import hash_password
from app.services.embeddings.service import embed

Base.metadata.create_all(engine)
db = SessionLocal()

if not db.query(User).filter_by(email='demo@example.com').first():
    t = Tenant(
        name='Demo Commerce',
        website='https://example.com',
        industry='Retail',
        description='Enterprise retail e-commerce tenant demonstrating AI customer intelligence.'
    )
    u = User(
        email='demo@example.com',
        name='Demo Admin',
        password_hash=hash_password('Demo123!')
    )
    db.add_all([t, u])
    db.flush()

    db.add(TenantMember(tenant_id=t.id, user_id=u.id, role='TENANT_ADMIN'))
    
    agent = Agent(
        tenant_id=t.id,
        name='Demo Support Agent',
        description='AI Customer Support and Scheduling Specialist',
        personality='Helpful, warm, concise, and professional',
        tone='professional',
        language='en',
        system_instructions='Answer only from verified business knowledge. If information is not in the knowledge base, offer to escalate to human support.',
        welcome_message='Hello! Welcome to Demo Commerce support. How can I assist you with orders, returns, or appointment scheduling today?',
        fallback_message="I don't have enough verified information to answer that accurately. Would you like me to connect you with a human support specialist?",
        support_hours='Mon-Fri 9:00-18:00 IST',
        escalation_rules='Escalate on explicit human request or when customer expresses dissatisfaction.'
    )
    db.add(agent)
    db.flush()

    faq1 = FAQ(
        tenant_id=t.id,
        question='What are your support hours?',
        answer='Our live support team and virtual assistance are available Monday to Friday from 9:00 AM to 6:00 PM IST.',
        category='Support'
    )
    faq2 = FAQ(
        tenant_id=t.id,
        question='What is your return and refund policy?',
        answer='We offer full refunds within 30 days of purchase for unused items in their original packaging. Return shipping is free.',
        category='Billing'
    )
    faq3 = FAQ(
        tenant_id=t.id,
        question='How do I track my order delivery?',
        answer='Once your order ships, you will receive an email with a live tracking number and carrier dispatch link.',
        category='Orders'
    )
    db.add_all([faq1, faq2, faq3])
    db.flush()

    # Vectorize and insert as document chunks for instant RAG
    db.add_all([
        DocumentChunk(
            tenant_id=t.id,
            document_id=None,
            content=f"FAQ: {faq1.question}\nAnswer: {faq1.answer}",
            embedding=embed(f"{faq1.question} {faq1.answer}"),
            metadata_={'source': 'FAQ: Support Hours', 'faq_id': str(faq1.id)}
        ),
        DocumentChunk(
            tenant_id=t.id,
            document_id=None,
            content=f"FAQ: {faq2.question}\nAnswer: {faq2.answer}",
            embedding=embed(f"{faq2.question} {faq2.answer}"),
            metadata_={'source': 'FAQ: Refund Policy', 'faq_id': str(faq2.id)}
        ),
        DocumentChunk(
            tenant_id=t.id,
            document_id=None,
            content=f"FAQ: {faq3.question}\nAnswer: {faq3.answer}",
            embedding=embed(f"{faq3.question} {faq3.answer}"),
            metadata_={'source': 'FAQ: Order Tracking', 'faq_id': str(faq3.id)}
        )
    ])

    # Booking & Services
    db.add(BookingSettings(
        tenant_id=t.id,
        booking_mode='free',
        payment_provider='demo',
        currency='INR',
        slot_duration_minutes=30,
        business_timezone='Asia/Kolkata',
        opening_hour=9,
        closing_hour=18
    ))

    db.add_all([
        ServiceOffering(
            tenant_id=t.id,
            name='General Consultation',
            description='30 minute introductory customer consultation and onboarding.',
            duration_minutes=30,
            price=0,
            currency='INR'
        ),
        ServiceOffering(
            tenant_id=t.id,
            name='Premium Strategy Session',
            description='60 minute paid in-depth enterprise review and setup.',
            duration_minutes=60,
            price=1499,
            currency='INR'
        )
    ])

    # Initial Analytics Events
    db.add_all([
        AnalyticsEvent(tenant_id=t.id, event='message', value=1),
        AnalyticsEvent(tenant_id=t.id, event='positive_feedback', value=1)
    ])

    db.commit()

print('✅ Seeded demo database successfully!')
print('Credentials: demo@example.com / Demo123!')

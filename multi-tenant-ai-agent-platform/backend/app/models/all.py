import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean, Integer, Float, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

def now(): return datetime.now(timezone.utc)
def uid(): return uuid.uuid4()

class Tenant(Base):
    __tablename__='tenants'
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), primary_key=True, default=uid)
    name: Mapped[str]=mapped_column(String(160)); website: Mapped[str|None]=mapped_column(String(500)); industry: Mapped[str|None]=mapped_column(String(120)); description: Mapped[str|None]=mapped_column(Text)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)

class User(Base):
    __tablename__='users'
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), primary_key=True, default=uid)
    email: Mapped[str]=mapped_column(String(320), unique=True, index=True); password_hash: Mapped[str]=mapped_column(String(255)); name: Mapped[str]=mapped_column(String(160))
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)

class TenantMember(Base):
    __tablename__='tenant_members'; __table_args__=(Index('ix_member_tenant_user','tenant_id','user_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), primary_key=True, default=uid)
    tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id',ondelete='CASCADE')); user_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), ForeignKey('users.id',ondelete='CASCADE')); role: Mapped[str]=mapped_column(String(40), default='TENANT_ADMIN')

class Agent(Base):
    __tablename__='agents'; __table_args__=(Index('ix_agent_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), primary_key=True, default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id',ondelete='CASCADE'))
    name: Mapped[str]=mapped_column(String(160)); description: Mapped[str]=mapped_column(Text, default=''); personality: Mapped[str]=mapped_column(Text, default='Helpful and professional'); tone: Mapped[str]=mapped_column(String(80), default='professional'); language: Mapped[str]=mapped_column(String(20), default='en')
    system_instructions: Mapped[str]=mapped_column(Text, default='Answer only from verified business knowledge.'); welcome_message: Mapped[str]=mapped_column(Text, default='Hi! How can I help?'); fallback_message: Mapped[str]=mapped_column(Text, default="I don't have enough information in the business knowledge base to answer that accurately. Would you like to speak with a support representative?")
    support_hours: Mapped[str]=mapped_column(String(200), default='Mon-Fri 9:00-18:00'); escalation_rules: Mapped[str]=mapped_column(Text, default='Escalate on explicit human request or low confidence.'); temperature: Mapped[float]=mapped_column(Float, default=0.2); top_k: Mapped[int]=mapped_column(Integer, default=5); similarity_threshold: Mapped[float]=mapped_column(Float, default=0.42); max_context_tokens: Mapped[int]=mapped_column(Integer, default=3500); brand_color: Mapped[str]=mapped_column(String(20), default='#2563eb'); avatar_url: Mapped[str|None]=mapped_column(String(500)); human_handoff: Mapped[bool]=mapped_column(Boolean, default=True); active: Mapped[bool]=mapped_column(Boolean, default=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)

class KnowledgeSource(Base):
    __tablename__='knowledge_sources'; __table_args__=(Index('ix_source_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), primary_key=True, default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id',ondelete='CASCADE')); type: Mapped[str]=mapped_column(String(40)); name: Mapped[str]=mapped_column(String(255)); status: Mapped[str]=mapped_column(String(40),default='pending'); metadata_: Mapped[dict]=mapped_column('metadata',JSON,default=dict); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now); updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class Document(Base):
    __tablename__='documents'; __table_args__=(Index('ix_document_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), primary_key=True, default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True), ForeignKey('tenants.id',ondelete='CASCADE')); source_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('knowledge_sources.id',ondelete='CASCADE')); filename: Mapped[str]=mapped_column(String(255)); file_type: Mapped[str]=mapped_column(String(80)); file_size: Mapped[int]=mapped_column(Integer); status: Mapped[str]=mapped_column(String(40),default='processing'); chunks: Mapped[int]=mapped_column(Integer,default=0); error: Mapped[str|None]=mapped_column(Text); classification: Mapped[str|None]=mapped_column(String(80),nullable=True); classification_confidence: Mapped[float]=mapped_column(Float,default=0); extracted_data: Mapped[dict]=mapped_column(JSON,default=dict); ocr_used: Mapped[bool]=mapped_column(Boolean,default=False); verification_status: Mapped[str]=mapped_column(String(30),default='pending'); verification_notes: Mapped[str|None]=mapped_column(Text,nullable=True); storage_key: Mapped[str|None]=mapped_column(String(255),nullable=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class DocumentChunk(Base):
    __tablename__='document_chunks'; __table_args__=(Index('ix_chunk_tenant_document','tenant_id','document_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); document_id: Mapped[uuid.UUID|None]=mapped_column(UUID(as_uuid=True),ForeignKey('documents.id',ondelete='CASCADE'),nullable=True); content: Mapped[str]=mapped_column(Text); embedding: Mapped[list]=mapped_column(Vector(384)); metadata_: Mapped[dict]=mapped_column('metadata',JSON,default=dict); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class WebsitePage(Base):
    __tablename__='website_pages'; __table_args__=(Index('ix_page_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); source_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('knowledge_sources.id',ondelete='CASCADE')); url: Mapped[str]=mapped_column(String(1000)); title: Mapped[str]=mapped_column(String(500),default=''); content: Mapped[str]=mapped_column(Text); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class FAQ(Base):
    __tablename__='faqs'; __table_args__=(Index('ix_faq_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); question: Mapped[str]=mapped_column(Text); answer: Mapped[str]=mapped_column(Text); category: Mapped[str]=mapped_column(String(100),default='General'); tags: Mapped[list]=mapped_column(JSON,default=list); active: Mapped[bool]=mapped_column(Boolean,default=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class Conversation(Base):
    __tablename__='conversations'; __table_args__=(Index('ix_conv_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); agent_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('agents.id',ondelete='CASCADE')); customer_id: Mapped[str]=mapped_column(String(160),default='anonymous'); status: Mapped[str]=mapped_column(String(30),default='ai'); resolved: Mapped[bool]=mapped_column(Boolean,default=False); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now); updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class Message(Base):
    __tablename__='messages'; __table_args__=(Index('ix_message_conv','conversation_id'),Index('ix_message_tenant','tenant_id'))
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); conversation_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('conversations.id',ondelete='CASCADE')); role: Mapped[str]=mapped_column(String(20)); content: Mapped[str]=mapped_column(Text); sources: Mapped[list]=mapped_column(JSON,default=list); metadata_: Mapped[dict]=mapped_column('metadata',JSON,default=dict); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class Feedback(Base):
    __tablename__='feedback'; __table_args__=(Index('ix_feedback_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); message_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('messages.id',ondelete='CASCADE')); rating: Mapped[int]=mapped_column(Integer); text: Mapped[str|None]=mapped_column(Text); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class KnowledgeGap(Base):
    __tablename__='knowledge_gaps'; __table_args__=(Index('ix_gap_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); query: Mapped[str]=mapped_column(Text); reason: Mapped[str]=mapped_column(String(80)); status: Mapped[str]=mapped_column(String(30),default='open'); correction: Mapped[str|None]=mapped_column(Text); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class HumanIntervention(Base):
    __tablename__='human_interventions'; __table_args__=(Index('ix_intervention_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); conversation_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('conversations.id',ondelete='CASCADE')); user_id: Mapped[uuid.UUID|None]=mapped_column(UUID(as_uuid=True),ForeignKey('users.id')); action: Mapped[str]=mapped_column(String(30)); note: Mapped[str|None]=mapped_column(Text); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class AnalyticsEvent(Base):
    __tablename__='analytics_events'; __table_args__=(Index('ix_analytics_tenant_time','tenant_id','created_at'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); event: Mapped[str]=mapped_column(String(80)); value: Mapped[float]=mapped_column(Float,default=1); metadata_: Mapped[dict]=mapped_column('metadata',JSON,default=dict); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class RefreshToken(Base):
    __tablename__='refresh_tokens'; id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); user_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('users.id',ondelete='CASCADE')); token_hash: Mapped[str]=mapped_column(String(64),unique=True); expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True)); revoked: Mapped[bool]=mapped_column(Boolean,default=False)

class APIKey(Base):
    __tablename__='api_keys'; __table_args__=(Index('ix_apikey_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); name: Mapped[str]=mapped_column(String(100)); key_hash: Mapped[str]=mapped_column(String(64)); prefix: Mapped[str]=mapped_column(String(16)); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class Notification(Base):
    __tablename__='notifications'; __table_args__=(Index('ix_notification_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid); tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE')); title: Mapped[str]=mapped_column(String(200)); body: Mapped[str]=mapped_column(Text); read: Mapped[bool]=mapped_column(Boolean,default=False); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)


class BookingSettings(Base):
    __tablename__='booking_settings'; __table_args__=(Index('ix_booking_settings_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid)
    tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE'),unique=True)
    booking_mode: Mapped[str]=mapped_column(String(20),default='free')
    payment_provider: Mapped[str]=mapped_column(String(30),default='demo')
    currency: Mapped[str]=mapped_column(String(10),default='INR')
    slot_duration_minutes: Mapped[int]=mapped_column(Integer,default=30)
    business_timezone: Mapped[str]=mapped_column(String(80),default='Asia/Kolkata')
    opening_hour: Mapped[int]=mapped_column(Integer,default=9)
    closing_hour: Mapped[int]=mapped_column(Integer,default=18)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class ServiceOffering(Base):
    __tablename__='service_offerings'; __table_args__=(Index('ix_service_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid)
    tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE'))
    name: Mapped[str]=mapped_column(String(160))
    description: Mapped[str]=mapped_column(Text,default='')
    duration_minutes: Mapped[int]=mapped_column(Integer,default=30)
    price: Mapped[float]=mapped_column(Float,default=0)
    currency: Mapped[str]=mapped_column(String(10),default='INR')
    active: Mapped[bool]=mapped_column(Boolean,default=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)

class Appointment(Base):
    __tablename__='appointments'; __table_args__=(Index('ix_appointment_tenant_start','tenant_id','start_at'),Index('ix_appointment_tenant_status','tenant_id','status'))
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid)
    tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE'))
    agent_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('agents.id',ondelete='CASCADE'))
    service_id: Mapped[uuid.UUID|None]=mapped_column(UUID(as_uuid=True),ForeignKey('service_offerings.id',ondelete='SET NULL'),nullable=True)
    conversation_id: Mapped[uuid.UUID|None]=mapped_column(UUID(as_uuid=True),ForeignKey('conversations.id',ondelete='SET NULL'),nullable=True)
    customer_name: Mapped[str]=mapped_column(String(160))
    customer_email: Mapped[str]=mapped_column(String(320))
    customer_phone: Mapped[str|None]=mapped_column(String(40),nullable=True)
    service_name: Mapped[str]=mapped_column(String(160))
    start_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    status: Mapped[str]=mapped_column(String(30),default='pending_payment')
    requires_payment: Mapped[bool]=mapped_column(Boolean,default=False)
    amount: Mapped[float]=mapped_column(Float,default=0)
    currency: Mapped[str]=mapped_column(String(10),default='INR')
    payment_status: Mapped[str]=mapped_column(String(30),default='not_required')
    notes: Mapped[str|None]=mapped_column(Text,nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,onupdate=now)

class PaymentSession(Base):
    __tablename__='payment_sessions'; __table_args__=(Index('ix_payment_tenant','tenant_id'),)
    id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),primary_key=True,default=uid)
    tenant_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('tenants.id',ondelete='CASCADE'))
    appointment_id: Mapped[uuid.UUID]=mapped_column(UUID(as_uuid=True),ForeignKey('appointments.id',ondelete='CASCADE'))
    provider: Mapped[str]=mapped_column(String(30),default='demo')
    provider_session_id: Mapped[str]=mapped_column(String(255),unique=True)
    checkout_url: Mapped[str]=mapped_column(String(1000))
    amount: Mapped[float]=mapped_column(Float)
    currency: Mapped[str]=mapped_column(String(10),default='INR')
    status: Mapped[str]=mapped_column(String(30),default='created')
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
    expires_at: Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True)

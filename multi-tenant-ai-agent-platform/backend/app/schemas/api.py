from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional, Any
from datetime import datetime
from uuid import UUID

class RegisterIn(BaseModel): email: EmailStr; password: str=Field(min_length=8); name: str=Field(min_length=2); business_name: str=Field(min_length=2); website: Optional[str]=None; industry: Optional[str]=None; description: Optional[str]=None
class LoginIn(BaseModel): email: EmailStr; password: str
class RefreshIn(BaseModel): refresh_token: str
class AgentIn(BaseModel): name: str; description: str=''; personality: str='Helpful and professional'; tone: str='professional'; language: str='en'; system_instructions: str='Answer only from verified business knowledge.'; welcome_message: str='Hi! How can I help?'; fallback_message: str="I don't have enough information in the business knowledge base to answer that accurately. Would you like to speak with a support representative?"; support_hours: str='Mon-Fri 9:00-18:00'; escalation_rules: str='Escalate on explicit human request or low confidence.'; temperature: float=0.2; top_k: int=5; similarity_threshold: float=0.42; max_context_tokens: int=3500; brand_color: str='#2563eb'; avatar_url: Optional[str]=None; human_handoff: bool=True; active: bool=True
class ChatIn(BaseModel): agent_id: UUID; conversation_id: Optional[UUID]=None; message: str=Field(min_length=1,max_length=4000); customer_id: str='anonymous'
class FeedbackIn(BaseModel): message_id: UUID; rating: int=Field(ge=-1,le=1); text: Optional[str]=None
class FAQIn(BaseModel): question: str; answer: str; category: str='General'; tags: list[str]=[]
class CrawlIn(BaseModel): url: HttpUrl; max_pages: int=25; max_depth: int=2
class TakeoverIn(BaseModel): note: Optional[str]=None
class HumanMessageIn(BaseModel): content: str=Field(min_length=1,max_length=4000)
class CorrectionIn(BaseModel): correction: str=Field(min_length=1)
class TenantIn(BaseModel): name: str; website: Optional[str]=None; industry: Optional[str]=None; description: Optional[str]=None


class BookingSettingsIn(BaseModel):
    booking_mode: str=Field(pattern='^(free|paid)$')
    payment_provider: str=Field(default='demo',pattern='^(demo|stripe)$')
    currency: str='INR'
    slot_duration_minutes: int=Field(default=30,ge=15,le=240)
    business_timezone: str='Asia/Kolkata'
    opening_hour: int=Field(default=9,ge=0,le=23)
    closing_hour: int=Field(default=18,ge=1,le=23)

class ServiceIn(BaseModel):
    name: str=Field(min_length=2,max_length=160)
    description: str=''
    duration_minutes: int=Field(default=30,ge=15,le=240)
    price: float=Field(default=0,ge=0)
    currency: str='INR'
    active: bool=True

class BookAppointmentIn(BaseModel):
    agent_id: UUID
    customer_name: str=Field(min_length=2,max_length=160)
    customer_email: EmailStr
    customer_phone: Optional[str]=None
    service: str=Field(min_length=2,max_length=160)
    start_at: datetime
    requires_payment: bool=False
    conversation_id: Optional[UUID]=None
    notes: Optional[str]=None

class PaymentSessionIn(BaseModel):
    agent_id: UUID
    appointment_id: UUID
    success_url: Optional[str]=None
    cancel_url: Optional[str]=None

class VerificationIn(BaseModel):
    status: str=Field(pattern='^(verified|rejected|pending)$')
    notes: Optional[str]=None

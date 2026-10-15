from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID
import hashlib, secrets
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status
from .config import settings

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
ALG = 'HS256'

def hash_password(password: str) -> str: return pwd_context.hash(password)
def verify_password(password: str, hashed: str) -> bool: return pwd_context.verify(password, hashed)

def _token(payload: dict, secret: str, expires: timedelta):
    data = payload.copy(); data['exp'] = datetime.now(timezone.utc) + expires
    return jwt.encode(data, secret, algorithm=ALG)

def create_access_token(user_id: UUID, tenant_id: UUID, role: str):
    return _token({'sub': str(user_id), 'tenant_id': str(tenant_id), 'role': role, 'type': 'access'}, settings.jwt_secret, timedelta(minutes=settings.access_token_minutes))

def create_refresh_token(user_id: UUID, tenant_id: UUID):
    return _token({'sub': str(user_id), 'tenant_id': str(tenant_id), 'type': 'refresh', 'jti': secrets.token_hex(12)}, settings.jwt_refresh_secret, timedelta(days=settings.refresh_token_days))

def decode_token(token: str, refresh=False):
    try:
        return jwt.decode(token, settings.jwt_refresh_secret if refresh else settings.jwt_secret, algorithms=[ALG])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token')

def hash_api_key(value: str) -> str: return hashlib.sha256(value.encode()).hexdigest()

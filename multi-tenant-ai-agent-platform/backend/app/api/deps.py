from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.core.security import decode_token
from app.models import User, TenantMember, Tenant

def get_current_user(authorization: str=Header(default=''), db: Session=Depends(get_db)):
    if not authorization.startswith('Bearer '): raise HTTPException(401,'Authentication required')
    p=decode_token(authorization[7:]);
    if p.get('type')!='access': raise HTTPException(401,'Invalid access token')
    try: uid=UUID(p['sub']); tid=UUID(p['tenant_id'])
    except Exception: raise HTTPException(401,'Invalid token claims')
    user=db.get(User,uid); member=db.query(TenantMember).filter_by(user_id=uid,tenant_id=tid).first()
    if not user or not member: raise HTTPException(403,'Tenant membership is invalid')
    return {'user':user,'tenant':db.get(Tenant,tid),'role':member.role}

def require_roles(*roles):
    def dep(current=Depends(get_current_user)):
        if current['role'] not in roles: raise HTTPException(403,'Insufficient permissions')
        return current
    return dep

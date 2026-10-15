from app.core.security import hash_password,verify_password

def test_password_hashing():
    p='StrongPassword123!'; h=hash_password(p); assert h!=p; assert verify_password(p,h); assert not verify_password('wrong',h)

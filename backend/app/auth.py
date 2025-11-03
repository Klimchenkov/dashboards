import os
from datetime import datetime, timedelta, timezone
from jose import jwt

SECRET = os.getenv("JWT_SECRET", "dev-secret")
ALGO = "HS256"

def issue_token(user_id: int, role: str, department_ids=None, project_ids=None):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "department_ids": department_ids or [],
        "project_ids": project_ids or [],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=24)).timestamp()),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)

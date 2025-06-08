from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserSession(BaseModel):
    userId: str
    username: str | None
    email : str
    created_at: datetime



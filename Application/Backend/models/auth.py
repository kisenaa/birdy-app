from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class baseResponse(BaseModel):
    error: bool 
    message: str 

class userLoginResponse(baseResponse):
    access_token: str | None = None
    refresh_token: str | None = None

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class userRegisterResponse(baseResponse):
    email: str | None = None
    userId: str | None = None

class TokenPayload(BaseModel):
    sub: str
    exp: int 

class AuthSession(BaseModel):
    userId: str
    email: EmailStr



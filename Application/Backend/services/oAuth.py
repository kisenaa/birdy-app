from typing import Union, Any
from datetime import datetime
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from config import JWT_SECRET_KEY, JWT_REFRESH_SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_MINUTES
from models.auth import TokenPayload, AuthSession
from database.db_schema import User

reuseable_oauth = OAuth2PasswordBearer(
    tokenUrl="/auth/login",
    scheme_name="JWT"
)

async def get_current_user(token: str = Depends(reuseable_oauth)) -> AuthSession:
    """
    Retrieve the current authenticated user based on the provided JWT token.
    This function decodes and validates the JWT token, checks for expiration,
    and retrieves the corresponding user from the database. If the token is invalid,
    expired, or the user does not exist, appropriate HTTP exceptions are raised.
    Args:
        token (str): The JWT token extracted from the request, provided by the OAuth2 dependency.
    Returns:
        AuthSession: An object containing the authenticated user's session information.
    Raises:
        HTTPException: 
            - 401 Unauthorized if the token is expired.
            - 403 Forbidden if the token is invalid or cannot be validated.
            - 404 Not Found if the user does not exist in the database.
    """
    try:
        payload = jwt.decode(
            token, JWT_SECRET_KEY, algorithms=[ALGORITHM]
        )
        
        token_data = TokenPayload(**payload)

        if datetime.fromtimestamp(token_data.exp) < datetime.now():
            raise HTTPException(
                status_code = status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except(JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await User.filter(userId=token_data.sub).first().values("userId", "email")

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find user",
        )

    return AuthSession(**user)
from typing import Any
from fastapi import HTTPException, status
from pydantic import EmailStr, TypeAdapter
from models.auth import UserRegister
from utils.argon2id import hash_password, verify_password
from utils.jwt import create_access_token, create_refresh_token
from ulid import ULID
from database.db_schema import User

email_adapter = TypeAdapter(EmailStr)
def is_email(value: str):
    try:
        email_adapter.validate_python(value)
        return True
    except Exception:
        return False
    
def check_password(value: str) -> None:
    if not (8 <= len(value) <= 128):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be between 8 and 128 characters long")

async def __create_user(data: UserRegister) -> dict[str, Any]:
    """
    Asynchronously creates a new user in the database.
    Args:
        data (UserRegister): The user registration data containing email and password.
    Returns:
        dict[str, Any]: A dictionary containing the newly created user's information (email and userId).
    Raises:
        HTTPException: If a user with the provided email already exists in the database.
    """
    user_data = await User.filter(email=data.email).first().values('userId')
    if user_data is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User already exist in database")
    
    user = {
        'email': data.email,
        'userId': str(ULID()),
    }
    hashed_password = hash_password(data.password)
    await User.create_user(user['userId'], user['email'], hashed_password)
    return user

async def __login_user(username_or_email: str, password: str):
    """
    Authenticate a user by their username or email and password.
    This asynchronous function attempts to find a user by their email or username,
    verifies the provided password, and returns access and refresh tokens upon successful authentication.
    Args:
        username_or_email (str): The user's email address or username.
        password (str): The user's plaintext password.
    Raises:
        HTTPException: If the user is not found or if the password is incorrect.
    Returns:
        dict: A dictionary containing 'access_token' and 'refresh_token' for the authenticated user.
    """
    user_data = None
    if is_email(username_or_email):
        user_data = await User.filter(email=username_or_email).first().only("userId", "hashed_password")  
    if user_data is None and username_or_email:
        user_data = await User.filter(username=username_or_email).first().only("userId", "hashed_password")
    if user_data is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or Username can not be found !")
    
    check_password(password)
    
    if not verify_password(password, user_data.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    return {
        "access_token": create_access_token(user_data.userId),
        "refresh_token": create_refresh_token(user_data.userId),
    }

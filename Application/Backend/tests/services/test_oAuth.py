import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException, status
from jose import JWTError
from datetime import datetime, timedelta
from services.oAuth import get_current_user
from models.auth import  AuthSession

# Dummy values for config and models
DUMMY_SECRET = "secret"
DUMMY_ALGORITHM = "HS256"
DUMMY_USER_ID = "user123"
DUMMY_EMAIL = "user@example.com"
DUMMY_EXP = int((datetime.now() + timedelta(minutes=5)).timestamp())

@pytest.mark.asyncio
@patch("services.oAuth.JWT_SECRET_KEY", DUMMY_SECRET)
@patch("services.oAuth.ALGORITHM", DUMMY_ALGORITHM)
@patch("services.oAuth.User")
@patch("services.oAuth.jwt")
async def test_get_current_user_success(mock_jwt, mock_User):
    # Mock jwt.decode to return a valid payload
    mock_jwt.decode.return_value = {"sub": DUMMY_USER_ID, "exp": DUMMY_EXP}
    # Mock User.filter().first().values() to return a user dict
    user_dict = {"userId": DUMMY_USER_ID, "email": DUMMY_EMAIL}
    mock_User.filter.return_value.first.return_value.values = AsyncMock(return_value=user_dict)

    result = await get_current_user(token="validtoken")
    assert isinstance(result, AuthSession)
    assert result.userId == DUMMY_USER_ID
    assert result.email == DUMMY_EMAIL

@pytest.mark.asyncio
@patch("services.oAuth.JWT_SECRET_KEY", DUMMY_SECRET)
@patch("services.oAuth.ALGORITHM", DUMMY_ALGORITHM)
@patch("services.oAuth.User")
@patch("services.oAuth.jwt")
async def test_get_current_user_expired_token(mock_jwt, mock_User):
    expired_exp = int((datetime.now() - timedelta(minutes=5)).timestamp())
    mock_jwt.decode.return_value = {"sub": DUMMY_USER_ID, "exp": expired_exp}
    with pytest.raises(HTTPException) as exc:
        await get_current_user(token="expiredtoken")
    assert exc.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc.value.detail == "Token expired"

@pytest.mark.asyncio
@patch("services.oAuth.JWT_SECRET_KEY", DUMMY_SECRET)
@patch("services.oAuth.ALGORITHM", DUMMY_ALGORITHM)
@patch("services.oAuth.User")
@patch("services.oAuth.jwt")
async def test_get_current_user_invalid_token(mock_jwt, mock_User):
    mock_jwt.decode.side_effect = JWTError()
    with pytest.raises(HTTPException) as exc:
        await get_current_user(token="invalidtoken")
    assert exc.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc.value.detail == "Could not validate credentials"

@pytest.mark.asyncio
@patch("services.oAuth.JWT_SECRET_KEY", DUMMY_SECRET)
@patch("services.oAuth.ALGORITHM", DUMMY_ALGORITHM)
@patch("services.oAuth.User")
@patch("services.oAuth.jwt")
async def test_get_current_user_validation_error(mock_jwt, mock_User):
   # Simulate a JWT decode return value with missing 'sub' field to trigger ValidationError
    mock_jwt.decode.return_value = {"sub": DUMMY_USER_ID}

    # Mock User.filter().first().values() to return a user dict
    user_dict = {"userId": DUMMY_USER_ID, "email": DUMMY_EMAIL}
    mock_User.filter.return_value.first.return_value = AsyncMock(return_value=user_dict)

    # Simulate the situation where validation fails for the missing "exp" field
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(token="token")

    # Ensure that the HTTPException is raised with the correct status and message
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "Could not validate credentials"

@pytest.mark.asyncio
@patch("services.oAuth.JWT_SECRET_KEY", DUMMY_SECRET)
@patch("services.oAuth.ALGORITHM", DUMMY_ALGORITHM)
@patch("services.oAuth.User")
@patch("services.oAuth.jwt")
async def test_get_current_user_user_not_found(mock_jwt, mock_User):
    mock_jwt.decode.return_value = {"sub": DUMMY_USER_ID, "exp": DUMMY_EXP}
    mock_User.filter.return_value.first.return_value.values = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc:
        await get_current_user(token="validtoken")
    assert exc.value.status_code == status.HTTP_404_NOT_FOUND
    assert exc.value.detail == "Could not find user"
from unittest.mock import AsyncMock
import pytest
from services.auth_service import is_email
from services.auth_service import check_password
from fastapi import HTTPException
from services.auth_service import __create_user as create_user
from models.auth import UserRegister
from services.auth_service import __login_user as login_user

@pytest.mark.parametrize("email", [
    "test@example.com",
    "user.name+tag+sorting@example.com",
    "user_name@example.co.uk",
    "user-name@sub.domain.com",
    "user123@domain.io"
])
def test_is_email_valid(email):
    assert is_email(email) is True

@pytest.mark.parametrize("invalid_email", [
    "plainaddress",
    "@missingusername.com",
    "username@.com",
    "username@com",
    "username@domain..com",
    "",
    None,
    12345,
    "user@domain,com"
])
def test_is_email_invalid(invalid_email):
    assert is_email(invalid_email) is False

@pytest.mark.parametrize("valid_password", [
    "abcdefgh",  # exactly 8 chars
    "a" * 128,   # exactly 128 chars
    "password123",
    "A1b2C3d4E5f6G7h8",
])
def test_check_password_valid(valid_password):
    # Should not raise exception
    assert check_password(valid_password) is None

@pytest.mark.parametrize("invalid_password", [
    "",                 # empty
    "short",            # less than 8
    "a" * 7,            # 7 chars
    "a" * 129,          # 129 chars
])
def test_check_password_invalid(invalid_password):
    with pytest.raises(HTTPException) as exc_info:
        check_password(invalid_password)
    assert exc_info.value.status_code == 400
    assert "Password must be between 8 and 128 characters long" in str(exc_info.value.detail)

@pytest.mark.asyncio
async def test_create_user_success(mocker):
    # Mock User.filter().first().values() to return None (user does not exist)
    mock_user_filter = mocker.patch("database.db_schema.User.filter")
    mock_first = mock_user_filter.return_value.first
    # Use AsyncMock for .values()
    mock_first.return_value.values = AsyncMock(return_value=None)

    # Mock User.create_user to just be a coroutine that does nothing
    mock_create_user = mocker.patch("database.db_schema.User.create_user", new_callable=AsyncMock)

    # Mock hash_password to return a dummy hash
    mocker.patch("utils.argon2id.hash_password", return_value="hashed_pw")

    # Prepare input data
    data = UserRegister(email="newuser@example.com", password="validpassword123")

    result = await create_user(data)
    assert result["email"] == "newuser@example.com"
    assert "userId" in result
    mock_create_user.assert_called_once()
    mock_user_filter.assert_called_once_with(email="newuser@example.com")

@pytest.mark.asyncio
async def test_create_user_already_exists(mocker):
    # Mock User.filter().first().values() to return a dict (user exists)
    mock_user_filter = mocker.patch("database.db_schema.User.filter")
    mock_first = mock_user_filter.return_value.first
    mock_first.return_value.values = AsyncMock(return_value={"userId": "existingid"})

    data = UserRegister(email="existing@example.com", password="validpassword123")

    with pytest.raises(HTTPException) as exc_info:
        await create_user(data)
    assert exc_info.value.status_code == 400
    assert "User already exist in database" in str(exc_info.value.detail)
    
@pytest.mark.asyncio
async def test_login_user_success_email(mocker):
    # Mock is_email to return True
    mocker.patch("services.auth_service.is_email", return_value=True)
    # Mock User.filter(email=...).first().only(...) to return a user object
    mock_user = mocker.Mock()
    mock_user.userId = "testid"
    mock_user.hashed_password = "hashed_pw"
    mock_user_filter = mocker.patch("database.db_schema.User.filter")
    mock_first = mock_user_filter.return_value.first
    mock_first.return_value.only = AsyncMock(return_value=mock_user)

    # Mock check_password to do nothing
    mocker.patch("services.auth_service.check_password", return_value=None)
    # Mock verify_password to return True
    mocker.patch("services.auth_service.verify_password", return_value=True)
    # Mock create_access_token and create_refresh_token
    mocker.patch("services.auth_service.create_access_token", return_value="access")
    mocker.patch("services.auth_service.create_refresh_token", return_value="refresh")

    result = await login_user("test@example.com", "validpassword")
    assert result["access_token"] == "access"
    assert result["refresh_token"] == "refresh"
    mock_user_filter.assert_called_with(email="test@example.com")

@pytest.mark.asyncio
async def test_login_user_success_username(mocker):
    # Mock is_email to return False
    mocker.patch("services.auth_service.is_email", return_value=False)
    # First call returns None, second call returns user
    mock_user = mocker.Mock()
    mock_user.userId = "testid"
    mock_user.hashed_password = "hashed_pw"
    mock_user_filter = mocker.patch("database.db_schema.User.filter")
    mock_first = mock_user_filter.return_value.first
    mock_first.return_value.only.side_effect = AsyncMock(return_value=mock_user)

    # Mock check_password to do nothing
    mocker.patch("services.auth_service.check_password", return_value=None)
    # Mock verify_password to return True
    mocker.patch("services.auth_service.verify_password", return_value=True)
    # Mock create_access_token and create_refresh_token
    mocker.patch("services.auth_service.create_access_token", return_value="access")
    mocker.patch("services.auth_service.create_refresh_token", return_value="refresh")

    result = await login_user("username", "validpassword")
    assert result["access_token"] == "access"
    assert result["refresh_token"] == "refresh"
    mock_user_filter.assert_called_with(username="username")

@pytest.mark.asyncio
async def test_login_user_not_found(mocker):
    # Mock is_email to return True
    mocker.patch("services.auth_service.is_email", return_value=True)
    # Mock User.filter(email=...).first().only(...) to return None
    mock_user_filter = mocker.patch("database.db_schema.User.filter")
    mock_first = mock_user_filter.return_value.first
    mock_first.return_value.only = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await login_user("notfound@example.com", "password")
    assert exc_info.value.status_code == 400
    assert "Email or Username can not be found" in str(exc_info.value.detail)

@pytest.mark.asyncio
async def test_login_user_invalid_password(mocker):
    # Mock is_email to return True
    mocker.patch("services.auth_service.is_email", return_value=True)
    # Mock User.filter(email=...).first().only(...) to return a user object
    mock_user = mocker.Mock()
    mock_user.userId = "testid"
    mock_user.hashed_password = "hashed_pw"
    mock_user_filter = mocker.patch("database.db_schema.User.filter")
    mock_first = mock_user_filter.return_value.first
    mock_first.return_value.only = AsyncMock(return_value=mock_user)

    # Mock check_password to do nothing
    mocker.patch("services.auth_service.check_password", return_value=None)
    # Mock verify_password to return False
    mocker.patch("services.auth_service.verify_password", return_value=False)

    with pytest.raises(HTTPException) as exc_info:
        await login_user("test@example.com", "wrongpassword")
    assert exc_info.value.status_code == 400
    assert "Incorrect email or password" in str(exc_info.value.detail)

@pytest.mark.asyncio
async def test_login_user_invalid_password_format(mocker):
    # Mock is_email to return True
    mocker.patch("services.auth_service.is_email", return_value=True)
    # Mock User.filter(email=...).first().only(...) to return a user object
    mock_user = mocker.Mock()
    mock_user.userId = "testid"
    mock_user.hashed_password = "hashed_pw"
    mock_user_filter = mocker.patch("database.db_schema.User.filter")
    mock_first = mock_user_filter.return_value.first
    mock_first.return_value.only = AsyncMock(return_value=mock_user)

    with pytest.raises(HTTPException) as exc_info:
        await login_user("test@example.com", "short")
    assert exc_info.value.status_code == 400
    assert "Password must be between 8 and 128 characters long" in str(exc_info.value.detail)








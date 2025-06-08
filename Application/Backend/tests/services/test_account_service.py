import pytest
from unittest.mock import AsyncMock, patch
from services.account_service import __get_me
from services.account_service import __get_account_field
from services.account_service import __set_username
from fastapi import HTTPException

@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_get_me_user_found(mock_user):
    # Mock the filter().first().values() chain
    mock_user.filter.return_value.first.return_value.values = AsyncMock(
        return_value={"created_at": "2024-01-01", "username": "testuser"}
    )
    result = await __get_me("some_user_id")
    assert result == {"created_at": "2024-01-01", "username": "testuser"}
    mock_user.filter.assert_called_once_with(userId="some_user_id")

@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_get_me_user_not_found(mock_user):
    # Simulate no user found
    mock_user.filter.return_value.first.return_value.values = AsyncMock(return_value=None)
    result = await __get_me("nonexistent_user_id")
    assert result == {}
    mock_user.filter.assert_called_once_with(userId="nonexistent_user_id")

@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_get_account_field_valid_fields_user_found(mock_user):
    # Mock the filter().first().values() chain
    mock_user.filter.return_value.first.return_value.values = AsyncMock(
        return_value={"userId": "u1", "email": "e@test.com"}
    )
    result = await __get_account_field(["userId", "email"], "u1")
    assert result == {"userId": "u1", "email": "e@test.com"}
    mock_user.filter.assert_called_once_with(userId="u1")
    mock_user.filter.return_value.first.return_value.values.assert_awaited_once_with("userId", "email")

@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_get_account_field_some_invalid_fields(mock_user):
    mock_user.filter.return_value.first.return_value.values = AsyncMock(
        return_value={"username": "userx"}
    )
    result = await __get_account_field(["username", "invalid_field"], "u2")
    assert result == {"username": "userx"}
    mock_user.filter.assert_called_once_with(userId="u2")
    mock_user.filter.return_value.first.return_value.values.assert_awaited_once_with("username")

@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_get_account_field_no_valid_fields(mock_user):
    result = await __get_account_field(["foo", "bar"], "u3")
    assert result == {"detail": "No valid fields requested."}
    mock_user.filter.assert_not_called()

@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_get_account_field_user_not_found(mock_user):
    mock_user.filter.return_value.first.return_value.values = AsyncMock(return_value=None)
    result = await __get_account_field(["userId"], "u4")
    assert result == {}
    mock_user.filter.assert_called_once_with(userId="u4")
    mock_user.filter.return_value.first.return_value.values.assert_awaited_once_with("userId")
    
@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_set_username_success(mock_user):
    # Username is not taken
    mock_user.filter.return_value.exists = AsyncMock(return_value=False)
    # Update returns 1 (success)
    mock_user.filter.return_value.limit.return_value.update = AsyncMock(return_value=1)
    result = await __set_username("newuser", "user123")
    assert result is True
    mock_user.filter.assert_any_call(username="newuser")
    mock_user.filter.assert_any_call(userId="user123")
    mock_user.filter.return_value.limit.return_value.update.assert_awaited_once_with(username="newuser")

@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_set_username_already_taken(mock_user):
    # Username is already taken
    mock_user.filter.return_value.exists = AsyncMock(return_value=True)
    with pytest.raises(HTTPException) as exc_info:
        await __set_username("takenuser", "user123")
    assert exc_info.value.status_code == 400
    assert "already taken" in exc_info.value.detail
    mock_user.filter.assert_called_once_with(username="takenuser")
    # Should not attempt update if username is taken

@pytest.mark.asyncio
@patch("services.account_service.User")
async def test_set_username_user_not_found_or_update_failed(mock_user):
    # Username is not taken
    mock_user.filter.return_value.exists = AsyncMock(return_value=False)
    # Update returns 0 (failure)
    mock_user.filter.return_value.limit.return_value.update = AsyncMock(return_value=0)
    with pytest.raises(HTTPException) as exc_info:
        await __set_username("newuser", "user123")
    assert exc_info.value.status_code == 400
    assert "not found" in exc_info.value.detail or "update username failed" in exc_info.value.detail
    mock_user.filter.assert_any_call(username="newuser")
    mock_user.filter.assert_any_call(userId="user123")
    mock_user.filter.return_value.limit.return_value.update.assert_awaited_once_with(username="newuser")




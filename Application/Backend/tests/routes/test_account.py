import pytest
from fastapi import status
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from routes.account import router, get_current_user
from models.auth import AuthSession
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)

@pytest.fixture(autouse=True)
def override_auth(fake_auth_session):
    # apply to all tests that run in this module
    app.dependency_overrides[get_current_user] = lambda: fake_auth_session
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def fake_auth_session():
    return AuthSession(userId="123", email="test@example.com")

@pytest.fixture
def fake_user_session_dict():
    return {
        "userId": "123",
        "email": "test@example.com",
        "username": "testuser",
        "created_at": "2024-01-01T00:00:00",
    }

@patch("routes.account.__get_me", new_callable=AsyncMock)
def test_get_me_success(mock_get_me, client, fake_user_session_dict):
    # Only return the fields that live in extra_data:
    extra = {
        k: v
        for k, v in fake_user_session_dict.items()
        if k not in ("userId", "email")
    }
    mock_get_me.return_value = extra

    response = client.get("/account/me")
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data == fake_user_session_dict

@patch("routes.account.__get_me", new_callable=AsyncMock)
def test_get_me_exception(mock_get_me, client):
    mock_get_me.side_effect = Exception("Test error")
    response = client.get("/account/me")
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert response.json()["error"] is True
    assert "Test error" in response.json()["message"]

@patch("routes.account.__get_account_field", new_callable=AsyncMock)
def test_get_account_field_success(mock_get_field, client):
    mock_get_field.return_value = {
        "userId": "123",
        "email": "test@example.com",
        "username": "testuser"
    }
    response = client.get("/account/get_account_field?fields=userId&fields=email&fields=username")
    assert response.status_code == status.HTTP_200_OK
    resp = response.json()
    assert resp["userId"] == "123"
    assert resp["email"] == "test@example.com"
    assert resp["username"] == "testuser"

def test_get_account_field_no_valid_fields(client):
    response = client.get("/account/get_account_field?fields=foo&fields=bar")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["message"] == "No valid fields requested."

@patch("routes.account.__get_account_field", new_callable=AsyncMock)
def test_get_account_field_exception(mock_get_field, client):
    mock_get_field.side_effect = Exception("oops")
    response = client.get("/account/get_account_field?fields=userId")
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "oops" in response.json()["message"]

@patch("routes.account.__set_username", new_callable=AsyncMock)
def test_set_username_success(mock_set_username, client):
    mock_set_username.return_value = True
    response = client.post("/account/set_username", json={"username": "newuser"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["error"] is False
    assert data["username"] == "newuser"

@patch("routes.account.__set_username", new_callable=AsyncMock)
def test_set_username_failure(mock_set_username, client):
    mock_set_username.return_value = False
    response = client.post("/account/set_username", json={"username": "failuser"})
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["error"] is True

@patch("routes.account.__set_username", new_callable=AsyncMock)
def test_set_username_exception(mock_set_username, client):
    mock_set_username.side_effect = Exception("fail")
    response = client.post("/account/set_username", json={"username": "erroruser"})
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "fail" in response.json()["message"]

def test_set_username_validation_error(client):
    # empty
    assert client.post("/account/set_username", json={"username": ""}).status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    # too long
    assert client.post("/account/set_username", json={"username": "a"*65}).status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    # missing
    assert client.post("/account/set_username", json={}).status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

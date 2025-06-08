import pytest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient
from routes.auth import router

app = FastAPI()
app.include_router(router)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def login_form_data():
    return {
        "username": "testuser@example.com",
        "password": "testpassword123"
    }

@pytest.fixture
def mock_tokens():
    return {
        "access_token": "mock_access_token_123",
        "refresh_token": "mock_refresh_token_456"
    }

class TestLoginEndpoint:

    @patch('routes.auth.__login_user', new_callable=AsyncMock)
    def test_login_success(self, mock_login_user, client, login_form_data, mock_tokens):
        """Test successful login"""
        # Arrange
        mock_login_user.return_value = mock_tokens

        # Act
        response = client.post("/auth/login", data=login_form_data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert response_data["access_token"] == mock_tokens["access_token"]
        assert response_data["refresh_token"] == mock_tokens["refresh_token"]
        assert response_data["error"] is False
        assert response_data["message"] == "success"
        mock_login_user.assert_awaited_once_with(
            login_form_data["username"],
            login_form_data["password"]
        )

    @patch('routes.auth.__login_user', new_callable=AsyncMock)
    def test_login_http_exception(self, mock_login_user, client, login_form_data):
        """Test login with HTTPException (e.g., invalid credentials)"""
        # Arrange
        mock_login_user.side_effect = HTTPException(
            status_code= status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

        # Act
        response = client.post("/auth/login", data=login_form_data)

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        response_data = response.json()
        assert response_data["message"] == "Invalid credentials"
        assert response_data["error"] is True
        mock_login_user.assert_awaited_once_with(
            login_form_data["username"],
            login_form_data["password"]
        )

    @patch('routes.auth.__login_user', new_callable=AsyncMock)
    def test_login_general_exception(self, mock_login_user, client, login_form_data):
        """Test login with general exception"""
        # Arrange
        error_message = "Database connection failed"
        mock_login_user.side_effect = Exception(error_message)

        # Act
        response = client.post("/auth/login", data=login_form_data)

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR  # Your code returns 200 even for exceptions
        response_data = response.json()
        assert response_data["error"] is True
        assert response_data["message"] == error_message
        mock_login_user.assert_awaited_once_with(
            login_form_data["username"],
            login_form_data["password"]
        )

    def test_login_missing_username(self, client):
        """Test login with missing username"""
        form_data = {"password": "testpassword123"}

        response = client.post("/auth/login", data=form_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY  # Validation error

    def test_login_missing_password(self, client):
        """Test login with missing password"""
        form_data = {"username": "testuser@example.com"}

        response = client.post("/auth/login", data=form_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY  # Validation error

    def test_login_empty_credentials(self, client):
        """Test login with empty credentials"""
        form_data = {"username": "", "password": ""}

        response = client.post("/auth/login", data=form_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST  # Validation error

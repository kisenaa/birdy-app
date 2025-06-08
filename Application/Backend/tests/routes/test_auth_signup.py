import pytest
from unittest.mock import AsyncMock, patch, ANY
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from routes.auth import router
from models.auth import userRegisterResponse  # Assuming you have this model

from fastapi import FastAPI

app = FastAPI()
app.include_router(router)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def signup_data():
    return {
        "email": "testuser@example.com",
        "password": "securepassword123"
    }

class TestSignupEndpoint:

    @patch('routes.auth.__create_user', new_callable=AsyncMock)
    def test_signup_success(self, mock_create_user, client, signup_data):
        """Test successful user signup"""
        # Arrange
        mock_create_user.return_value = {"userId": "abc123"}

        # Act
        response = client.post("/auth/signup", json=signup_data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["userId"] == "abc123"
        assert data["message"] == "success creating account !"
        assert data["error"] is False
        mock_create_user.assert_awaited_once_with(ANY)  # called with a UserRegister instance

    @patch('routes.auth.__create_user', new_callable=AsyncMock)
    def test_signup_http_exception(self, mock_create_user, client, signup_data):
        """Test signup when HTTPException is raised (e.g., user exists)"""
        # Arrange
        mock_create_user.side_effect = HTTPException(status_code=400, detail="User already exist in database")

        # Act
        response = client.post("/auth/signup", json=signup_data)

        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data["message"] == "User already exist in database"
        assert data["error"] is True
        mock_create_user.assert_awaited_once_with(ANY)

    @patch('routes.auth.__create_user', new_callable=AsyncMock)
    def test_signup_general_exception(self, mock_create_user, client, signup_data):
        """Test signup when a generic exception occurs"""
        error_msg = "Database error"
        mock_create_user.side_effect = Exception(error_msg)

        # Act
        response = client.post("/auth/signup", json=signup_data)

        # Assert
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR 
        data = response.json()
        assert data["error"] is True
        assert data["message"] == error_msg
        mock_create_user.assert_awaited_once_with(ANY)

    def test_signup_validation_error(self, client):
        """Test signup with missing fields resulting in validation error"""
        invalid_data = {"email": "invalid@example.com"}  # missing password

        response = client.post("/auth/signup", json=invalid_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        invalid_data = {"password": "securepassword123"}  # missing email
        response = client.post("/auth/signup", json=invalid_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

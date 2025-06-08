from datetime import timedelta, datetime, timezone
from jose import jwt as jose_jwt
from utils.jwt import create_refresh_token, create_access_token
import config

def test_create_refresh_token_default_expiry():
    """
    Test that `create_refresh_token` generates a refresh token with the default expiry.
    - Verifies that the token's subject matches the provided subject.
    - Checks that the expiry time is approximately 7 days from now (with a margin for timing).
    """
    subject = "user123"
    token = create_refresh_token(subject)
    decoded = jose_jwt.decode(
        token,
        config.JWT_REFRESH_SECRET_KEY,
        algorithms=[config.ALGORITHM],
        options={"verify_aud": False}
    )
    assert decoded["sub"] == subject
    exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    # Should expire in about 7 days
    assert timedelta(minutes=59) < (exp - now) <= timedelta(minutes=config.REFRESH_TOKEN_EXPIRE_MINUTES + 1)

def test_create_refresh_token_custom_expiry():
    """
    Test that `create_refresh_token` generates a refresh token with a custom expiry.
    - Verifies that the token's subject matches the provided subject.
    - Checks that the expiry time is approximately equal to the custom timedelta provided.
    """
    subject = "user456"
    expires_delta = timedelta(minutes=10)
    token = create_refresh_token(subject, expires_delta=expires_delta)
    decoded = jose_jwt.decode(
        token,
        config.JWT_REFRESH_SECRET_KEY,
        algorithms=[config.ALGORITHM],
        options={"verify_aud": False}
    )
    assert decoded["sub"] == subject
    exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    # Should expire in about 10 minutes
    assert timedelta(minutes=9) < (exp - now) <= timedelta(minutes=10)

def test_create_refresh_token_subject_is_not_string():
    """
    Test that `create_refresh_token` correctly handles non-string subjects.
    - Ensures that the subject is converted to a string in the token payload.
    """
    subject = 789 
    token = create_refresh_token(subject)
    decoded = jose_jwt.decode(
        token,
        config.JWT_REFRESH_SECRET_KEY,
        algorithms=[config.ALGORITHM],
        options={"verify_aud": False}
    )
    assert decoded["sub"] == str(subject)

def test_create_access_token_default_expiry():
    """
    Test that `create_access_token` generates an access token with the default expiry.
    - Verifies that the token's subject matches the provided subject.
    - Checks that the expiry time is approximately equal to the configured default.
    """
    subject = "accessuser123"
    token = create_access_token(subject)
    decoded = jose_jwt.decode(
        token,
        config.JWT_SECRET_KEY,
        algorithms=[config.ALGORITHM],
        options={"verify_aud": False}
    )
    assert decoded["sub"] == subject
    exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    # Should expire in about ACCESS_TOKEN_EXPIRE_MINUTES (usually 60)
    assert timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES - 1) < (exp - now) <= timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES + 1)

def test_create_access_token_custom_expiry():
    """
    Test that `create_access_token` generates an access token with a custom expiry.
    - Verifies that the token's subject matches the provided subject.
    - Checks that the expiry time is approximately equal to the custom timedelta provided.
    """
    subject = "accessuser456"
    expires_delta = timedelta(minutes=15)
    token = create_access_token(subject, expires_delta=expires_delta)
    decoded = jose_jwt.decode(
        token,
        config.JWT_SECRET_KEY,
        algorithms=[config.ALGORITHM],
        options={"verify_aud": False}
    )
    assert decoded["sub"] == subject
    exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
    now = datetime.now(timezone.utc)
    # Should expire in about 15 minutes
    assert timedelta(minutes=14) < (exp - now) <= timedelta(minutes=15)

def test_create_access_token_subject_is_not_string():
    """
    Test that `create_access_token` correctly handles non-string subjects.
    - Ensures that the subject is converted to a string in the token payload.
    """
    subject = 789
    token = create_access_token(subject)
    decoded = jose_jwt.decode(
        token,
        config.JWT_SECRET_KEY,
        algorithms=[config.ALGORITHM],
        options={"verify_aud": False}
    )
    assert decoded["sub"] == str(subject)
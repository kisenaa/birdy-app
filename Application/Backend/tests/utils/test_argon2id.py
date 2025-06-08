from utils.argon2id import hash_password, verify_password

def test_hash_password_returns_valid_hash():
    """
    Tests that the hash_password function returns a valid Argon2id hash string for a given password.

    This test verifies:
    - The returned value is a string.
    - The hash string starts with the expected Argon2id prefix.
    """
    password = "mysecretpassword"
    hash_str = hash_password(password)
    assert isinstance(hash_str, str)
    assert hash_str.startswith("$argon2id$")

def test_verify_password_correct_password():
    """
    Test that verify_password returns True when provided with the correct password and its corresponding hash.
    """
    password = "anothersecret"
    hash_str = hash_password(password)
    assert verify_password(password, hash_str) is True

def test_verify_password_incorrect_password():
    """
    Test that verify_password returns False when an incorrect password is provided.

    This test hashes a known password and then attempts to verify a different, incorrect password
    against the generated hash. The expected behavior is that the verification function returns False,
    indicating the password does not match the hash.
    """
    password = "rightpassword"
    wrong_password = "wrongpassword"
    hash_str = hash_password(password)
    assert verify_password(wrong_password, hash_str) is False

def test_verify_password_with_modified_hash():
    """
    Test that verify_password returns False when the password hash has been tampered with.

    This test generates a valid password hash, deliberately corrupts it by altering the last character,
    and asserts that verification fails when using the original password with the corrupted hash.
    """
    password = "testpassword"
    hash_str = hash_password(password)
    # Modify the hash slightly (corrupt it)
    corrupted_hash = hash_str[:-1] + ("a" if hash_str[-1] != "a" else "b")
    assert verify_password(password, corrupted_hash) is False

def test_verify_password_with_empty_password():
    """
    Tests the password hashing and verification functions with an empty password.

    This test ensures that:
    - An empty password can be hashed and successfully verified against its hash.
    - A non-empty password does not verify against the hash of an empty password.
    """
    password = ""
    hash_str = hash_password(password)
    assert verify_password(password, hash_str) is True
    assert verify_password("notempty", hash_str) is False
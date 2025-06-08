from argon2.low_level import hash_secret, Type, verify_secret
from base64 import b64decode
import os

# ========================
# Argon2ID Configuration
# ========================
TIME_COST = 4
MEMORY_COST = 65536  # in KiB (64 MiB)
PARALLELISM = 2
HASH_LEN = 32
SALT_LEN = 16
ARGON2_TYPE = Type.ID 

def hash_password(password: str) -> str:
    salt = os.urandom(SALT_LEN)
    password_bytes = password.encode("utf-8")
    argon2_hash = hash_secret(secret=password_bytes, salt=salt, time_cost=TIME_COST, memory_cost=MEMORY_COST, parallelism=PARALLELISM, hash_len=HASH_LEN, type=ARGON2_TYPE)

    return argon2_hash.decode("utf-8")


def verify_password(input_password: str, full_hash_str: str) -> bool:
    try:
        return verify_secret(
            full_hash_str.encode("utf-8"),
            input_password.encode("utf-8"),
            ARGON2_TYPE                             
        )
    except Exception as e:
        print("Error:", e)
        return False
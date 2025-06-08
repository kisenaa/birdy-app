from typing import List

from fastapi import HTTPException, status
from database.db_schema import User

async def __get_me(userId: str):
    """
    Asynchronously retrieves the 'created_at' and 'username' fields for a user with the specified userId.

    Args:
        userId (str): The unique identifier of the user.

    Returns:
        dict: A dictionary containing the 'created_at' and 'username' of the user if found; otherwise, an empty dictionary.
    """
    user = await User.filter(userId=userId).first().values("created_at", "username")
    return user if user else {}

async def __get_account_field(fields: List[str], userId: str):
    """
    Asynchronously retrieves specified fields for a user account.
    Args:
        fields (List[str]): A list of field names to retrieve from the user account.
        userId (str): The unique identifier of the user.
    Returns:
        dict: A dictionary containing the requested user fields if found, 
              an empty dictionary if the user does not exist, 
              or a dictionary with a 'detail' key if no valid fields are requested.
    Notes:
        Only the following fields are allowed to be retrieved: 
        'userId', 'email', 'username', 'created_at', 'hashed_password'.
    """
    allowed_fields = {"userId", "email", "username", "created_at", "hashed_password"}
    selected_fields = [f for f in fields if f in allowed_fields]

    if not selected_fields:
        return {"detail": "No valid fields requested."}

    user_data = await User.filter(userId=userId).first().values(*selected_fields)
    return user_data if user_data else {}

async def __set_username(username:str, userId: str):
    """
    Asynchronously sets a new username for a user if the username is not already taken.
    Args:
        username (str): The desired new username to assign to the user.
        userId (str): The unique identifier of the user whose username is to be updated.
    Raises:
        HTTPException: If the username is already taken (400 Bad Request).
        HTTPException: If the user is not found or the update fails (400 Bad Request).
    Returns:
        bool: True if the username was successfully updated.
    """
    if await User.filter(username=username).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken."
        )
    
    # Update the user's username
    updated_count = await User.filter(userId=userId).limit(1).update(username=username)
    if updated_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or update username failed"
        )

    return True

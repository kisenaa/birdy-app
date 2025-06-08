from typing import Annotated, List
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from services.oAuth import get_current_user
from services.account_service import __get_me, __get_account_field, __set_username
from models.user import UserSession
from models.auth import AuthSession
router = APIRouter(prefix="/account", tags=["account"])

@router.get('/me', summary='Get details of currently logged in user', response_model=UserSession)
async def get_me(user_auth: Annotated[AuthSession, Depends(get_current_user)]):
    try:
        # Get additional user data
        extra_data = await __get_me(user_auth.userId)

        # Merge and return
        return UserSession(**user_auth.model_dump(), **extra_data)
    except Exception as e:
        print(f"error at get_me: {e}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={'message': str(e), 'error': True})

@router.get('/get_account_field', summary='Get selected attributes of the current user')
async def get_account_field(user_auth: Annotated[AuthSession, Depends(get_current_user)], fields: List[str] = Query(default=["userId", "email", "created_at", "username"]),):
    try:
        allowed_fields = {"userId", "email", "username", "created_at", "hashed_password"}
        selected_fields = [f for f in fields if f in allowed_fields]

        if not selected_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields requested."
            )
        return await __get_account_field(selected_fields, user_auth.userId)
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={'message': e.detail, 'error': True})
    except Exception as e:
        print(f"error at get_account_field: {e}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={'message': str(e), 'error': True})
    
@router.post('/set_username', summary='set username of currently logged in user')
async def set_username(user_auth: Annotated[AuthSession, Depends(get_current_user)], username: str = Body(..., embed=True, min_length=1, max_length=64)):
    try:
        # Get additional user data
        res = await __set_username(username, user_auth.userId)
        if res:
            return {"error": False, "message": "updated", "username": username}
        else:
            return {"error": True, "message": "something went wrong !", "username": username}
    except Exception as e:
        print(f"error at get_me: {e}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={'message': str(e), 'error': True})
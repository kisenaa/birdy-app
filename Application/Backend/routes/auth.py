from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from models.auth import  userLoginResponse, UserRegister, userRegisterResponse
from services.auth_service import __create_user, __login_user
from services.oAuth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=userLoginResponse)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    try:
        tokens = await __login_user(form_data.username, form_data.password)
        return {'access_token': tokens['access_token'], 'refresh_token': tokens['refresh_token'], 'error': False, 'message': 'success' }
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={'message': e.detail, 'error': True})
    except Exception as e:
        print(f"error at login: {e}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={'message': str(e), 'error': True})

@router.post('/signup', summary="Create new user", response_model=userRegisterResponse)
async def create_user(data: UserRegister):
    try:
        user = await __create_user(data)
        user['message'] = 'success creating account !'
        user['error'] = False
        return user
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={'message': e.detail, 'error': True})
    except Exception as e:
        print(f"error at create_user: {e}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={'message': str(e), 'error': True})
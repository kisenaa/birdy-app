import os
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from models.auth import userLoginResponse, UserRegister, userRegisterResponse
from services.auth_service import __create_user, __login_user
from services.oAuth import get_current_user
from google import generativeai as genai

# Initialize Gemini
gemini_api_key = os.environ["GEMINI_API_KEY"]
genai.configure(api_key=gemini_api_key)  # Replace with your actual key
model = genai.GenerativeModel("gemini-2.0-flash")

router = APIRouter(prefix="/core", tags=["core"])

# Request and Response models
class ChatbotRequest(BaseModel):
    prompt: str

class ChatbotResponse(BaseModel):
    result: str

@router.post("/chatbot", response_model=ChatbotResponse)
async def chatbot(request: ChatbotRequest):
    try:
        full_prompt = (
            f"{request.prompt.strip()}.\n\n"
            "Return a short explanation in multiple paragraphs using \\n for line breaks.\n\n"
            "Just write the paragraphs without any additional text.\n\n"
            "Paragraph 1: Physical description of the bird.\n"
            "Paragraph 2: Its natural habitat.\n"
            "Paragraph 3: What the bird eats.\n"
            "Paragraph 4: Suggestions for conservation or how to improve the ecosystem support.\n"
        )

        response = model.generate_content(full_prompt)
        result = response.text.strip().replace("\n", "\\n")  # Ensure literal \n in string
        return ChatbotResponse(result=result)

    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={'message': e.detail, 'error': True}
        )
    except Exception as e:
        print(f"error at chatbot: {e}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'message': str(e), 'error': True}
        )

import asyncio
from contextlib import asynccontextmanager
import os
import platform
import sys
import logging
from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
from routes import auth, account
from tortoise import Tortoise, connections
from config import TORTOISE_ORM

def create_app():
    # Configure Databases
    @asynccontextmanager
    async def db_lifespan(app: FastAPI):
        await Tortoise.init(config=TORTOISE_ORM)
        formatter = logging.Formatter("%(asctime)s - %(name)s:%(lineno)d - %(levelname)s - %(message)s")
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        tortoise_logger = logging.getLogger("tortoise")
        tortoise_logger.addHandler(handler)
        tortoise_logger.setLevel(logging.DEBUG)
        yield
        await connections.close_all()

    app = FastAPI(title="Bird API", description="Birdy Backend for Birdy App", version="1.0.0", lifespan=db_lifespan)

    @app.get("/")
    async def read_root():
        return {"Hello": "World"}

    app.include_router(auth.router)
    app.include_router(account.router)

    return app

if 'hypercorn' not in os.environ:
    app = create_app()
import os, asyncpg
from fastapi import Depends

async def get_db():
    return await asyncpg.connect(os.getenv("DATABASE_URL"))

import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import find_dotenv, load_dotenv


load_dotenv(find_dotenv(usecwd=True))


@dataclass(frozen=True)
class Settings:
    app_name: str = "Accounting System API"
    app_env: str = "development"
    database_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "Accounting System API"),
        app_env=os.getenv("APP_ENV", "development"),
        database_url=os.getenv("DATABASE_URL", ""),
    )

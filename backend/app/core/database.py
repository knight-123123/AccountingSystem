from collections.abc import Generator

from sqlalchemy import MetaData, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


SessionLocal = sessionmaker(autocommit=False, autoflush=False)
_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine

    if _engine is None:
        database_url = get_settings().database_url
        if not database_url:
            raise RuntimeError("DATABASE_URL is not configured.")

        _engine = create_engine(database_url, pool_pre_ping=True)
        SessionLocal.configure(bind=_engine)

    return _engine


def get_db() -> Generator[Session, None, None]:
    get_engine()
    with SessionLocal() as db:
        yield db

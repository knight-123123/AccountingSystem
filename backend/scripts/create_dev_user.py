from pathlib import Path
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

sys.path.append(str(Path(__file__).resolve().parents[1]))

import app.models  # noqa: F401
from app.core.database import get_engine
from app.models.user import User


DEFAULT_EMAIL = "dev@example.local"
DEFAULT_USERNAME = "dev"


def main() -> None:
    with Session(get_engine()) as db:
        user = db.scalar(select(User).where(User.username == DEFAULT_USERNAME))
        if user is None:
            user = User(
                username=DEFAULT_USERNAME,
                email=DEFAULT_EMAIL,
                password_hash=None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        print(f"dev user id: {user.id}")


if __name__ == "__main__":
    main()

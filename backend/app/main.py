from fastapi import FastAPI

from app.api.routes.accounts import router as accounts_router
from app.api.routes.categories import router as categories_router
from app.api.routes.reports import router as reports_router
from app.api.routes.transactions import router as transactions_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.include_router(accounts_router)
app.include_router(categories_router)
app.include_router(transactions_router)
app.include_router(reports_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

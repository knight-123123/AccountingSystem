import csv
from datetime import date
from decimal import Decimal
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction, TransactionEntry
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionRead

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionRead])
def list_transactions(
    start_date: date | None = None,
    end_date: date | None = None,
    kind: str | None = None,
    account_id: int | None = None,
    category_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[Transaction]:
    stmt = select(Transaction).options(selectinload(Transaction.entries))
    stmt = apply_transaction_filters(stmt, start_date, end_date, kind, account_id, category_id)
    stmt = stmt.order_by(Transaction.occurred_on.desc(), Transaction.id.desc())
    return list(db.scalars(stmt).all())


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
) -> Transaction:
    validate_transaction_refs(payload, db)

    transaction = Transaction(
        user_id=payload.user_id,
        kind=payload.kind,
        category_id=payload.category_id,
        occurred_on=payload.occurred_on,
        merchant=payload.merchant,
        note=payload.note,
    )
    transaction.entries = build_entries(payload)
    db.add(transaction)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction data.",
        ) from exc

    return get_transaction_or_404(transaction.id, db)


@router.get("/export.csv")
def export_transactions_csv(db: Session = Depends(get_db)) -> Response:
    rows = db.execute(
        select(
            Transaction.id,
            Transaction.kind,
            Transaction.occurred_on,
            Transaction.merchant,
            Transaction.note,
            Category.name,
            Account.name,
            TransactionEntry.amount,
            TransactionEntry.currency,
        )
        .join(TransactionEntry, TransactionEntry.transaction_id == Transaction.id)
        .join(Account, Account.id == TransactionEntry.account_id)
        .outerjoin(Category, Category.id == Transaction.category_id)
        .order_by(Transaction.occurred_on.desc(), Transaction.id.desc(), TransactionEntry.id)
    ).all()

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "transaction_id",
            "kind",
            "occurred_on",
            "merchant",
            "note",
            "category",
            "account",
            "amount",
            "currency",
        ]
    )
    for row in rows:
        writer.writerow(row)

    headers = {"Content-Disposition": 'attachment; filename="transactions.csv"'}
    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers=headers,
    )


@router.get("/{transaction_id}", response_model=TransactionRead)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)) -> Transaction:
    return get_transaction_or_404(transaction_id, db)


@router.patch("/{transaction_id}", response_model=TransactionRead)
def update_transaction(
    transaction_id: int,
    payload: TransactionCreate,
    db: Session = Depends(get_db),
) -> Transaction:
    transaction = get_transaction_or_404(transaction_id, db)
    validate_transaction_refs(payload, db)

    transaction.user_id = payload.user_id
    transaction.kind = payload.kind
    transaction.category_id = payload.category_id
    transaction.occurred_on = payload.occurred_on
    transaction.merchant = payload.merchant
    transaction.note = payload.note

    for entry in list(transaction.entries):
        db.delete(entry)
    db.flush()
    transaction.entries = build_entries(payload)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid transaction data.",
        ) from exc

    return get_transaction_or_404(transaction.id, db)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)) -> None:
    transaction = get_transaction_or_404(transaction_id, db)

    for entry in transaction.entries:
        db.delete(entry)
    db.delete(transaction)
    db.commit()


def validate_transaction_refs(payload: TransactionCreate, db: Session) -> None:
    if db.get(User, payload.user_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found.")

    if payload.category_id is not None:
        category = db.get(Category, payload.category_id)
        if category is None or category.user_id != payload.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found.",
            )

    account_ids = {
        account_id
        for account_id in [
            payload.account_id,
            payload.from_account_id,
            payload.to_account_id,
        ]
        if account_id is not None
    }
    accounts = db.scalars(select(Account).where(Account.id.in_(account_ids))).all()
    valid_account_ids = {account.id for account in accounts if account.user_id == payload.user_id}

    if account_ids != valid_account_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account not found.",
        )


def build_entries(payload: TransactionCreate) -> list[TransactionEntry]:
    if payload.kind == "income":
        return [
            TransactionEntry(
                account_id=payload.account_id,
                amount=payload.amount,
                currency=payload.currency,
            )
        ]

    if payload.kind == "expense":
        return [
            TransactionEntry(
                account_id=payload.account_id,
                amount=-payload.amount,
                currency=payload.currency,
            )
        ]

    transfer_amount = Decimal(payload.amount)
    return [
        TransactionEntry(
            account_id=payload.from_account_id,
            amount=-transfer_amount,
            currency=payload.currency,
        ),
        TransactionEntry(
            account_id=payload.to_account_id,
            amount=transfer_amount,
            currency=payload.currency,
        ),
    ]


def get_transaction_or_404(transaction_id: int, db: Session) -> Transaction:
    stmt = (
        select(Transaction)
        .options(selectinload(Transaction.entries))
        .where(Transaction.id == transaction_id)
    )
    transaction = db.scalar(stmt)
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found.",
        )
    return transaction


def apply_transaction_filters(
    stmt,
    start_date: date | None,
    end_date: date | None,
    kind: str | None,
    account_id: int | None,
    category_id: int | None,
):
    if start_date is not None:
        stmt = stmt.where(Transaction.occurred_on >= start_date)
    if end_date is not None:
        stmt = stmt.where(Transaction.occurred_on <= end_date)
    if kind:
        stmt = stmt.where(Transaction.kind == kind)
    if category_id is not None:
        stmt = stmt.where(Transaction.category_id == category_id)
    if account_id is not None:
        stmt = stmt.join(TransactionEntry).where(TransactionEntry.account_id == account_id)
    return stmt

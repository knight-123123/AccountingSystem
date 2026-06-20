import argparse
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "http://127.0.0.1:8000"


def request_text(base_url: str, path: str) -> tuple[int, dict[str, str], str]:
    request = Request(f"{base_url.rstrip('/')}{path}", method="GET")
    try:
        with urlopen(request, timeout=10) as response:
            headers = {key.lower(): value for key, value in response.headers.items()}
            body = response.read().decode("utf-8-sig")
            return response.status, headers, body
    except HTTPError as exc:
        body = exc.read().decode("utf-8-sig", errors="replace")
        raise RuntimeError(f"GET {path} failed with HTTP {exc.code}: {body}") from exc
    except URLError as exc:
        raise RuntimeError(f"GET {path} failed: {exc.reason}") from exc


def request_json(base_url: str, path: str) -> Any:
    status, _, body = request_text(base_url, path)
    if status != 200:
        raise RuntimeError(f"GET {path} expected HTTP 200, got {status}")
    return json.loads(body)


def assert_list(value: Any, path: str) -> None:
    if not isinstance(value, list):
        raise RuntimeError(f"GET {path} expected a JSON list")


def check_health(base_url: str) -> None:
    data = request_json(base_url, "/health")
    if data != {"status": "ok"}:
        raise RuntimeError(f"GET /health returned unexpected body: {data}")
    print("ok /health")


def check_json_list(base_url: str, path: str) -> None:
    data = request_json(base_url, path)
    assert_list(data, path)
    print(f"ok {path} ({len(data)} rows)")


def check_csv(base_url: str) -> None:
    status, headers, body = request_text(base_url, "/transactions/export.csv")
    if status != 200:
        raise RuntimeError(f"GET /transactions/export.csv expected HTTP 200, got {status}")

    content_type = headers.get("content-type", "")
    if "text/csv" not in content_type:
        raise RuntimeError("CSV export did not return text/csv")

    first_line = body.splitlines()[0] if body else ""
    expected_columns = "transaction_id,kind,occurred_on,merchant,note,category,account,amount,currency"
    if first_line != expected_columns:
        raise RuntimeError(f"CSV header mismatch: {first_line}")

    print("ok /transactions/export.csv")


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test the accounting API.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    args = parser.parse_args()

    check_health(args.base_url)
    for path in [
        "/accounts",
        "/categories",
        "/transactions",
        "/reports/accounts",
        "/reports/monthly",
        "/reports/categories",
    ]:
        check_json_list(args.base_url, path)
    check_csv(args.base_url)
    print("smoke test passed")


if __name__ == "__main__":
    main()

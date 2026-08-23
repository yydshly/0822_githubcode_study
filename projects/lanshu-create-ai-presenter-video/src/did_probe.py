#!/usr/bin/env python3
"""Safely test D-ID API authentication and credits without creating a video."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


API_URL = "https://api.d-id.com/credits"


def parse_env_file(path: Path | None) -> dict[str, str]:
    if path is None or not path.is_file():
        return {}
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        values[name.strip()] = value.strip().strip("'\"")
    return values


def request_credits(api_key: str, timeout: float) -> tuple[int, Any]:
    encoded = base64.b64encode(api_key.encode("utf-8")).decode("ascii")
    request = urllib.request.Request(
        API_URL,
        headers={
            "Authorization": f"Basic {encoded}",
            "Accept": "application/json",
            "User-Agent": "lanshu-presenter-capability-probe/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return response.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        try:
            payload: Any = json.loads(body) if body else {}
        except json.JSONDecodeError:
            payload = {"message": body[:500]}
        return error.code, payload


def summarize(status: int, payload: Any) -> dict[str, Any]:
    result: dict[str, Any] = {
        "endpoint": API_URL,
        "network_reachable": True,
        "http_status": status,
        "authenticated": status == 200,
        "billable_operation": False,
        "secret_printed": False,
    }
    if status == 200:
        result["credits"] = payload
    else:
        result["response"] = payload
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, help="Optional .env containing DID_API_KEY")
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Perform the read-only /credits request; this does not generate video or consume credits",
    )
    args = parser.parse_args()

    values = parse_env_file(args.env_file.expanduser().resolve() if args.env_file else None)
    api_key = os.environ.get("DID_API_KEY") or values.get("DID_API_KEY", "")
    configured = bool(api_key.strip())

    if not args.execute:
        print(json.dumps({
            "network_request_made": False,
            "did_api_key_configured": configured,
            "next_step": "Run again with --execute to query credits without consuming them.",
        }, ensure_ascii=False, indent=2))
        return 0

    if not configured:
        print(json.dumps({
            "network_request_made": False,
            "did_api_key_configured": False,
            "error": "Set DID_API_KEY or pass --env-file first.",
        }, ensure_ascii=False, indent=2))
        return 2

    if ":" not in api_key:
        print(json.dumps({
            "network_request_made": False,
            "did_api_key_configured": True,
            "error": "DID_API_KEY must use the API_USERNAME:API_PASSWORD format shown by D-ID Studio.",
        }, ensure_ascii=False, indent=2))
        return 2

    try:
        status, payload = request_credits(api_key.strip(), args.timeout)
        print(json.dumps(summarize(status, payload), ensure_ascii=False, indent=2))
        return 0 if status == 200 else 1
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        print(json.dumps({
            "endpoint": API_URL,
            "network_reachable": False,
            "billable_operation": False,
            "error_type": type(error).__name__,
            "message": str(error),
        }, ensure_ascii=False, indent=2))
        return 3


if __name__ == "__main__":
    sys.exit(main())

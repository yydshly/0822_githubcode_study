#!/usr/bin/env python3
"""Create a D-ID photo-avatar talk from local image/audio with an explicit billing gate."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

from did_probe import parse_env_file, request_credits


API_BASE = "https://api.d-id.com"
TERMINAL_STATES = {"done", "error", "rejected"}


def auth_headers(api_key: str) -> dict[str, str]:
    encoded = base64.b64encode(api_key.encode("utf-8")).decode("ascii")
    return {
        "Authorization": f"Basic {encoded}",
        "Accept": "application/json",
        "User-Agent": "lanshu-presenter-did-adapter/1.0",
    }


def decode_json(raw: bytes) -> Any:
    text = raw.decode("utf-8", errors="replace")
    return json.loads(text) if text else {}


def call(request: urllib.request.Request, timeout: float) -> tuple[int, Any]:
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, decode_json(response.read())
    except urllib.error.HTTPError as error:
        return error.code, decode_json(error.read())


def multipart_file(field: str, path: Path) -> tuple[bytes, str]:
    boundary = f"----codex-did-{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    parts = [
        f"--{boundary}\r\n".encode("ascii"),
        (
            f'Content-Disposition: form-data; name="{field}"; filename="{path.name}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8"),
        path.read_bytes(),
        f"\r\n--{boundary}--\r\n".encode("ascii"),
    ]
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def find_url(value: Any) -> str:
    if isinstance(value, dict):
        for key in ("url", "source_url", "audio_url", "image_url", "path", "location"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.startswith(("https://", "s3://")):
                return candidate
        for nested in value.values():
            if isinstance(nested, str) and nested.startswith(("https://", "s3://")):
                return nested
            candidate = find_url(nested)
            if candidate:
                return candidate
    elif isinstance(value, list):
        for nested in value:
            candidate = find_url(nested)
            if candidate:
                return candidate
    return ""


def error_summary(status: int, payload: Any) -> str:
    if isinstance(payload, dict):
        message = payload.get("description") or payload.get("message") or payload.get("kind")
        if message:
            return f"D-ID HTTP {status}: {message}"
    return f"D-ID HTTP {status}"


def upload(api_key: str, field: str, path: Path, timeout: float) -> str:
    body, content_type = multipart_file(field, path)
    endpoint = f"{API_BASE}/{'images' if field == 'image' else 'audios'}"
    headers = auth_headers(api_key)
    headers["Content-Type"] = content_type
    request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
    status, payload = call(request, timeout)
    if status != 201:
        raise RuntimeError(error_summary(status, payload))
    result = find_url(payload)
    if not result:
        raise RuntimeError(f"D-ID upload succeeded but returned no usable URL (HTTP {status})")
    return result


def create_talk(api_key: str, image_url: str, audio_url: str, name: str, timeout: float) -> str:
    payload = {
        "source_url": image_url,
        "script": {"type": "audio", "audio_url": audio_url},
        "name": name,
        "config": {"stitch": True},
        "user_data": "lanshu-did-meaningful-baseline",
    }
    headers = auth_headers(api_key)
    headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        f"{API_BASE}/talks",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    status, response = call(request, timeout)
    if status != 201 or not isinstance(response, dict) or not response.get("id"):
        raise RuntimeError(error_summary(status, response))
    return str(response["id"])


def get_talk(api_key: str, talk_id: str, timeout: float) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{API_BASE}/talks/{urllib.parse.quote(talk_id)}",
        headers=auth_headers(api_key),
    )
    status, response = call(request, timeout)
    if status != 200 or not isinstance(response, dict):
        raise RuntimeError(error_summary(status, response))
    return response


def credit_remaining(payload: Any) -> float | None:
    if isinstance(payload, dict):
        remaining = payload.get("remaining")
        if isinstance(remaining, (int, float)):
            return float(remaining)
    return None


def download(url: str, output: Path, timeout: float) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "lanshu-presenter-did-adapter/1.0"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(response.read())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument("--name", default="D-ID meaningful baseline")
    parser.add_argument("--timeout", type=float, default=60.0)
    parser.add_argument("--poll-interval", type=float, default=3.0)
    parser.add_argument("--max-wait", type=float, default=300.0)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm-billable", action="store_true")
    args = parser.parse_args()

    image = args.image.expanduser().resolve()
    audio = args.audio.expanduser().resolve()
    output = args.output.expanduser().resolve()
    env_file = parse_env_file(args.env_file.expanduser().resolve())
    api_key = os.environ.get("DID_API_KEY") or env_file.get("DID_API_KEY", "")
    plan = {
        "mode": "execute" if args.execute else "dry_run",
        "image": str(image),
        "audio": str(audio),
        "output": str(output),
        "credential_configured": bool(api_key),
        "estimated_did_credits": 1,
        "operations": ["query credits", "upload image", "upload audio", "create talk", "poll", "download"],
    }
    if not args.execute:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return 0
    if not args.confirm_billable:
        parser.error("--execute also requires --confirm-billable")
    if not image.is_file() or not audio.is_file():
        parser.error("image and audio must be existing local files")
    if not api_key or ":" not in api_key:
        parser.error("DID_API_KEY is missing or invalid")

    started = time.monotonic()
    status, before_payload = request_credits(api_key.strip(), args.timeout)
    if status != 200:
        raise SystemExit(error_summary(status, before_payload))
    before = credit_remaining(before_payload)
    image_url = upload(api_key.strip(), "image", image, args.timeout)
    audio_url = upload(api_key.strip(), "audio", audio, args.timeout)
    talk_id = create_talk(api_key.strip(), image_url, audio_url, args.name, args.timeout)

    deadline = time.monotonic() + args.max_wait
    talk: dict[str, Any] = {}
    while time.monotonic() < deadline:
        talk = get_talk(api_key.strip(), talk_id, args.timeout)
        state = str(talk.get("status", "")).lower()
        if state in TERMINAL_STATES:
            break
        time.sleep(max(0.5, args.poll_interval))
    state = str(talk.get("status", "")).lower()
    if state != "done":
        raise SystemExit(f"D-ID talk {talk_id} ended with status={state or 'timeout'}")
    result_url = str(talk.get("result_url", ""))
    if not result_url.startswith("https://"):
        raise SystemExit(f"D-ID talk {talk_id} returned no downloadable result")
    download(result_url, output, args.timeout)

    after_status, after_payload = request_credits(api_key.strip(), args.timeout)
    after = credit_remaining(after_payload) if after_status == 200 else None
    metadata = talk.get("metadata") if isinstance(talk.get("metadata"), dict) else {}
    manifest = {
        **plan,
        "talk_id": talk_id,
        "status": state,
        "elapsed_seconds": round(time.monotonic() - started, 2),
        "credits_before": before,
        "credits_after": after,
        "credits_consumed": round(before - after, 3) if before is not None and after is not None else None,
        "output_size_bytes": output.stat().st_size,
        "metadata": metadata,
        "temporary_source_urls_redacted": True,
        "result_url_redacted": True,
    }
    manifest_path = output.with_suffix(".generation.json")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

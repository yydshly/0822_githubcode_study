#!/usr/bin/env python3
"""MiniMax T2A v2 adapter with word timestamps and an explicit billable gate."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def parse_env(path: Path | None) -> dict[str, str]:
    if not path or not path.is_file():
        return {}
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        values[name.strip()] = value.strip().strip("'\"")
    return values


def setting(name: str, env_file: dict[str, str], fallback: str = "") -> str:
    return os.environ.get(name) or env_file.get(name) or fallback


def request_json(url: str, payload: dict[str, Any], api_key: str, timeout: int = 120) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"MiniMax HTTP {exc.code}: {detail}") from exc


def srt_time(milliseconds: int) -> str:
    hours, remainder = divmod(max(0, milliseconds), 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"


def save_subtitles(url: str, output: Path) -> dict[str, Any]:
    with urllib.request.urlopen(url, timeout=60) as response:
        source = json.loads(response.read().decode("utf-8"))
    if not isinstance(source, list):
        raise SystemExit("MiniMax subtitle response is not a flat array")

    raw_path = output.with_suffix(".minimax-subtitles.json")
    raw_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    segments = []
    srt_lines: list[str] = []
    for index, item in enumerate(source, start=1):
        start_ms = int(item.get("time_begin", 0))
        end_ms = int(item.get("time_end", start_ms))
        text = str(item.get("text", ""))
        segments.append(
            {
                "start": round(start_ms / 1000, 3),
                "end": round(end_ms / 1000, 3),
                "text": text,
                "words": [{"start": round(start_ms / 1000, 3), "end": round(end_ms / 1000, 3), "text": text}],
            }
        )
        srt_lines.extend([str(index), f"{srt_time(start_ms)} --> {srt_time(end_ms)}", text, ""])

    caption_path = output.with_suffix(".captions.json")
    caption_path.write_text(
        json.dumps(
            {"schema_version": 1, "provider": "minimax-t2a-word-timestamps", "segments": segments},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    srt_path = output.with_suffix(".srt")
    srt_path.write_text("\n".join(srt_lines), encoding="utf-8-sig")
    return {"raw": str(raw_path), "captions": str(caption_path), "srt": str(srt_path), "items": len(source)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    text_group = parser.add_mutually_exclusive_group(required=True)
    text_group.add_argument("--text")
    text_group.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--model", default="speech-2.8-hd")
    parser.add_argument("--voice", default="female-chengshu")
    parser.add_argument("--emotion", default="calm")
    parser.add_argument("--speed", type=float, default=0.92)
    parser.add_argument("--execute", action="store_true", help="Actually call MiniMax")
    parser.add_argument("--confirm-billable", action="store_true", help="Required together with --execute")
    args = parser.parse_args()

    text = args.text if args.text is not None else args.input.expanduser().resolve().read_text(encoding="utf-8")
    text = text.strip()
    if not text:
        parser.error("text is empty")
    if len(text) >= 10_000:
        parser.error("synchronous T2A input must be shorter than 10,000 characters")
    if not 0.5 <= args.speed <= 2:
        parser.error("speed must be between 0.5 and 2")

    env_file = parse_env(args.env_file.expanduser().resolve() if args.env_file else None)
    api_base = setting("MINIMAX_API_BASE", env_file, "https://api.minimaxi.com").rstrip("/")
    if not api_base.startswith("https://"):
        parser.error("MINIMAX_API_BASE must use HTTPS")
    api_key = setting("MINIMAX_API_KEY", env_file) or setting("MINIMAX_TOKEN_PLAN_KEY", env_file)

    payload = {
        "model": args.model,
        "text": text,
        "stream": False,
        "language_boost": "Chinese",
        "output_format": "hex",
        "subtitle_enable": True,
        "subtitle_type": "word",
        "voice_setting": {
            "voice_id": args.voice,
            "speed": args.speed,
            "vol": 1,
            "pitch": 0,
            "emotion": args.emotion,
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "wav",
            "channel": 1,
        },
    }

    plan = {
        "mode": "execute" if args.execute else "dry_run",
        "network_request": bool(args.execute),
        "endpoint": f"{api_base}/v1/t2a_v2",
        "model": args.model,
        "voice": args.voice,
        "subtitle_type": "word",
        "characters": len(text),
        "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "credential_configured": bool(api_key),
        "estimated_paygo_list_price_usd": round(len(text) * 100 / 1_000_000, 6),
        "note": "Token Plan coverage may differ; this estimate uses the official speech-2.8-hd pay-go list price.",
    }
    if not args.execute:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return 0
    if not args.confirm_billable:
        parser.error("--execute also requires --confirm-billable")
    if not api_key:
        parser.error("MINIMAX_API_KEY or MINIMAX_TOKEN_PLAN_KEY is missing")

    result = request_json(plan["endpoint"], payload, api_key)
    status = result.get("base_resp", {}).get("status_code")
    if status != 0 or not result.get("data", {}).get("audio"):
        raise SystemExit(
            f"MiniMax TTS failed ({status}): {result.get('base_resp', {}).get('status_msg', 'no audio')}"
        )

    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(bytes.fromhex(result["data"]["audio"]))
    subtitle_url = result.get("data", {}).get("subtitle_file", "")
    subtitle_result = save_subtitles(subtitle_url, output) if subtitle_url else {"warning": "subtitle_file not returned"}
    manifest = {
        **plan,
        "audio": str(output),
        "audio_length_ms": result.get("extra_info", {}).get("audio_length"),
        "usage_characters": result.get("extra_info", {}).get("usage_characters"),
        "trace_id": result.get("trace_id"),
        "subtitles": subtitle_result,
    }
    output.with_suffix(".generation.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

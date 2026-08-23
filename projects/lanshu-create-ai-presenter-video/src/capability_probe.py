#!/usr/bin/env python3
"""Inspect local presenter-video capabilities without making network requests."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
from pathlib import Path
from typing import Any


PLACEHOLDERS = ("replace", "your-key", "your_key", "填入", "changeme")


def package_available(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def command_info(name: str) -> dict[str, Any]:
    resolved = shutil.which(name)
    return {"ready": resolved is not None, "path": resolved or ""}


def parse_env_file(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        values[name.strip()] = value.strip().strip("'\"")
    return values


def configured_secret(name: str, env_file: dict[str, str]) -> bool:
    value = os.environ.get(name) or env_file.get(name, "")
    normalized = value.strip().lower()
    return bool(normalized) and not any(item in normalized for item in PLACEHOLDERS)


def cached_whisper_models() -> list[str]:
    configured_home = os.environ.get("HF_HOME")
    roots = []
    if configured_home:
        roots.append(Path(configured_home) / "hub")
    roots.append(Path.home() / ".cache" / "huggingface" / "hub")
    found: set[str] = set()
    for root in roots:
        if not root.is_dir():
            continue
        for model in root.glob("models--Systran--faster-whisper-*"):
            found.add(model.name.removeprefix("models--Systran--faster-whisper-"))
    return sorted(found)


def existing_path(value: str | None) -> bool:
    return bool(value and Path(value).expanduser().exists())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, help="Optional .env file; values are never printed")
    parser.add_argument("--output", type=Path, help="Optional JSON report path")
    args = parser.parse_args()

    env_file = parse_env_file(args.env_file.expanduser().resolve()) if args.env_file else {}
    commands = {name: command_info(name) for name in ("python", "ffmpeg", "ffprobe", "node", "bash", "jq")}
    packages = {
        name: package_available(name)
        for name in ("PIL", "numpy", "faster_whisper", "whisper", "whisperx", "musetalk")
    }
    models = cached_whisper_models()
    minimax_key = configured_secret("MINIMAX_API_KEY", env_file) or configured_secret(
        "MINIMAX_TOKEN_PLAN_KEY", env_file
    )
    did_key = configured_secret("DID_API_KEY", env_file)
    h3_opt_in = os.environ.get("MINIMAX_H3_ENABLED", "").strip().lower() in ("1", "true", "yes")
    musetalk_home = os.environ.get("MUSETALK_HOME")

    report = {
        "network_requests_made": False,
        "commands": commands,
        "python_packages": packages,
        "cached_faster_whisper_models": models,
        "credentials": {
            "minimax_key_configured": minimax_key,
            "did_key_configured": did_key,
            "values_redacted": True,
        },
        "capabilities": {
            "voice_generation": {
                "status": "configured_not_called" if minimax_key else "missing_credentials",
                "provider": "MiniMax T2A v2",
            },
            "main_presenter": {
                "status": "configured_not_called" if did_key else (
                    "explicitly_enabled_not_called" if minimax_key and h3_opt_in else "not_configured"
                ),
                "provider": "D-ID Talks API" if did_key else "MiniMax H3",
                "note": (
                    "Use src/did_probe.py for a read-only credit check."
                    if did_key
                    else "H3 requires pay-as-you-go and is never enabled by this probe."
                ),
            },
            "mock_presenter": {
                "status": "ready" if packages["PIL"] and commands["ffmpeg"]["ready"] else "missing_dependency",
                "provider": "local procedural proxy",
                "note": "Pipeline probe only; not neural lip sync.",
            },
            "lipsync_repair": {
                "status": "ready" if packages["musetalk"] or existing_path(musetalk_home) else "missing",
                "provider": "MuseTalk-compatible local adapter",
            },
            "word_timestamp_asr": {
                "status": "ready" if packages["faster_whisper"] and models else "missing_model_or_package",
                "provider": "faster-whisper",
                "cached_models": models,
            },
            "timeline_compositor": {
                "status": "ready" if commands["ffmpeg"]["ready"] else "missing",
                "provider": "FFmpeg",
            },
            "encoder_qa": {
                "status": "core_ready" if commands["ffmpeg"]["ready"] and commands["ffprobe"]["ready"] else "missing",
                "upstream_delivery_script_ready": all(commands[name]["ready"] for name in ("ffmpeg", "ffprobe", "bash", "jq")),
            },
        },
    }

    if report["capabilities"]["lipsync_repair"]["status"] == "ready":
        route = "tts -> local lipsync -> faster-whisper -> ffmpeg"
    else:
        route = "tts -> mock presenter (pipeline probe) -> faster-whisper -> ffmpeg"
    report["recommended_non_paid_probe_route"] = route

    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = args.output.expanduser().resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

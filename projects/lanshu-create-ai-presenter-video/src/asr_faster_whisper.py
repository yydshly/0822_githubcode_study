#!/usr/bin/env python3
"""Create word-timestamp caption JSON and SRT with a local faster-whisper model."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def srt_time(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path, required=True, help="Caption JSON output")
    parser.add_argument("--model", default="base", help="Cached faster-whisper model name or local path")
    parser.add_argument("--language", default="zh")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument("--allow-download", action="store_true")
    args = parser.parse_args()

    source = args.input.expanduser().resolve()
    if not source.is_file():
        parser.error(f"input does not exist: {source}")

    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise SystemExit("faster-whisper is not installed") from exc

    model = WhisperModel(
        args.model,
        device=args.device,
        compute_type=args.compute_type,
        local_files_only=not args.allow_download,
    )
    segment_iterator, info = model.transcribe(
        str(source),
        language=args.language or None,
        word_timestamps=True,
        vad_filter=True,
        beam_size=5,
    )

    segments: list[dict[str, Any]] = []
    for segment in segment_iterator:
        words = [
            {
                "start": round(float(word.start or segment.start), 3),
                "end": round(float(word.end or segment.end), 3),
                "text": word.word,
                "probability": round(float(word.probability), 4),
            }
            for word in (segment.words or [])
        ]
        segments.append(
            {
                "start": round(float(segment.start), 3),
                "end": round(float(segment.end), 3),
                "text": segment.text.strip(),
                "words": words,
            }
        )

    result = {
        "schema_version": 1,
        "provider": "faster-whisper-local",
        "model": args.model,
        "source": str(source),
        "language": info.language,
        "language_probability": round(float(info.language_probability), 4),
        "duration": round(float(info.duration), 3),
        "segments": segments,
    }

    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    srt_lines: list[str] = []
    for index, segment in enumerate(segments, start=1):
        srt_lines.extend(
            [
                str(index),
                f"{srt_time(segment['start'])} --> {srt_time(segment['end'])}",
                segment["text"],
                "",
            ]
        )
    srt_path = output.with_suffix(".srt")
    srt_path.write_text("\n".join(srt_lines), encoding="utf-8-sig")
    print(
        json.dumps(
            {
                "caption_json": str(output),
                "srt": str(srt_path),
                "segments": len(segments),
                "words": sum(len(segment["words"]) for segment in segments),
                "duration": result["duration"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

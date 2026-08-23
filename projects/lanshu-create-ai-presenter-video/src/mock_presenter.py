#!/usr/bin/env python3
"""Render a procedural presenter proxy driven by audio amplitude.

This validates audio, caption and video plumbing. It is deliberately not
described as neural lip sync and should not be used for quality evaluation.
"""

from __future__ import annotations

import argparse
import audioop
import json
import math
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


WIDTH = 540
HEIGHT = 960
FPS = 24


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.ImageFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for character in text:
        candidate = current + character
        if current and draw.textbbox((0, 0), candidate, font=text_font)[2] > max_width:
            lines.append(current)
            current = character
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines[-2:]


def load_segments(path: Path | None) -> list[dict[str, Any]]:
    if not path:
        return []
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    return list(data.get("segments", []))


def active_caption(segments: list[dict[str, Any]], timestamp: float) -> str:
    for segment in segments:
        if float(segment["start"]) <= timestamp < float(segment["end"]):
            return str(segment.get("text", "")).strip()
    return ""


def pcm_amplitudes(path: Path, fps: int) -> tuple[list[float], float]:
    with wave.open(str(path), "rb") as source:
        channels = source.getnchannels()
        sample_width = source.getsampwidth()
        sample_rate = source.getframerate()
        frame_count = source.getnframes()
        raw = source.readframes(frame_count)
    if channels > 1:
        raw = audioop.tomono(raw, sample_width, 0.5, 0.5)
    samples_per_frame = max(1, round(sample_rate / fps))
    bytes_per_frame = samples_per_frame * sample_width
    values = []
    for offset in range(0, len(raw), bytes_per_frame):
        chunk = raw[offset : offset + bytes_per_frame]
        rms = audioop.rms(chunk, sample_width) if chunk else 0
        maximum = float((1 << (8 * sample_width - 1)) - 1)
        values.append(min(1.0, rms / maximum * 8.0))
    return values, frame_count / sample_rate


def make_frame(amplitude: float, timestamp: float, caption: str) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#dcecff")
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        color = (round(220 - 26 * ratio), round(236 - 18 * ratio), round(255 - 4 * ratio))
        draw.line((0, y, WIDTH, y), fill=color)

    draw.rounded_rectangle((30, 32, 510, 112), radius=22, fill="#ffffff", outline="#b9d4ef", width=2)
    draw.text((56, 52), "LOCAL PRESENTER PROBE", font=font(24), fill="#24415e")

    bob = round(math.sin(timestamp * 2.1) * 2)
    head_box = (150, 180 + bob, 390, 420 + bob)
    draw.ellipse(head_box, fill="#f0bd98", outline="#744b3d", width=3)
    draw.pieslice((145, 155 + bob, 395, 360 + bob), 180, 360, fill="#343a52")
    draw.rounded_rectangle((108, 400 + bob, 432, 790), radius=90, fill="#355a83")
    draw.polygon(((210, 420 + bob), (270, 515 + bob), (330, 420 + bob)), fill="#f5f8fb")

    blink_phase = timestamp % 3.7
    blinking = 0.0 <= blink_phase <= 0.11
    eye_y = 303 + bob
    if blinking:
        draw.line((205, eye_y, 238, eye_y), fill="#352d2b", width=4)
        draw.line((302, eye_y, 335, eye_y), fill="#352d2b", width=4)
    else:
        draw.ellipse((204, eye_y - 10, 238, eye_y + 10), fill="#ffffff", outline="#352d2b", width=2)
        draw.ellipse((302, eye_y - 10, 336, eye_y + 10), fill="#ffffff", outline="#352d2b", width=2)
        draw.ellipse((218, eye_y - 5, 228, eye_y + 5), fill="#253047")
        draw.ellipse((316, eye_y - 5, 326, eye_y + 5), fill="#253047")

    mouth_height = 5 + round(34 * amplitude)
    mouth_y = 363 + bob
    draw.ellipse((235, mouth_y - mouth_height // 2, 305, mouth_y + mouth_height // 2), fill="#6e2732", outline="#4d1a23", width=2)
    if mouth_height > 18:
        draw.ellipse((249, mouth_y + 2, 291, mouth_y + mouth_height // 2 - 2), fill="#d66d7a")

    draw.rounded_rectangle((36, 805, 504, 925), radius=24, fill="#10263d")
    caption_font = font(28)
    lines = wrap_text(draw, caption or "本地管线占位数字人 · 非真实口型同步", caption_font, 420)
    top = 831 if len(lines) == 1 else 816
    for index, line in enumerate(lines):
        bounds = draw.textbbox((0, 0), line, font=caption_font)
        x = (WIDTH - (bounds[2] - bounds[0])) // 2
        draw.text((x, top + index * 42), line, font=caption_font, fill="#ffffff")
    return image


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--captions", type=Path)
    parser.add_argument("--width", type=int, default=WIDTH)
    parser.add_argument("--height", type=int, default=HEIGHT)
    parser.add_argument("--fps", type=int, default=FPS)
    args = parser.parse_args()

    if (args.width, args.height) != (WIDTH, HEIGHT):
        parser.error(f"prototype currently renders only {WIDTH}x{HEIGHT}")
    if not shutil.which("ffmpeg"):
        parser.error("ffmpeg is required")

    audio = args.audio.expanduser().resolve()
    if not audio.is_file():
        parser.error(f"audio does not exist: {audio}")
    output = args.output.expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    captions = load_segments(args.captions.expanduser().resolve() if args.captions else None)

    with tempfile.TemporaryDirectory(prefix="lanshu-presenter-") as temporary:
        pcm = Path(temporary) / "audio.wav"
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(audio), "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(pcm)],
            check=True,
        )
        amplitudes, duration = pcm_amplitudes(pcm, args.fps)
        command = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(args.fps), "-i", "pipe:0",
            "-i", str(audio), "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-shortest", str(output),
        ]
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        assert process.stdin is not None
        try:
            for index, amplitude in enumerate(amplitudes):
                timestamp = index / args.fps
                frame = make_frame(amplitude, timestamp, active_caption(captions, timestamp))
                process.stdin.write(frame.tobytes())
            process.stdin.close()
            error_output = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
            exit_code = process.wait()
        except BrokenPipeError:
            error_output = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
            process.wait()
            raise SystemExit(f"ffmpeg pipeline failed: {error_output}")
        if exit_code != 0:
            raise SystemExit(f"ffmpeg pipeline failed ({exit_code}): {error_output}")

    print(json.dumps({"output": str(output), "duration": round(duration, 3), "fps": args.fps, "mode": "procedural_proxy_not_neural_lipsync"}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

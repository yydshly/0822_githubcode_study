from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PACK = ROOT / "storyboard-full-pack"
OUT = ROOT / "offline-production" / "qc-contact-sheets"
OUT.mkdir(parents=True, exist_ok=True)

font_candidates = [
    Path("C:/Windows/Fonts/msyh.ttc"),
    Path("C:/Windows/Fonts/simhei.ttf"),
]
font_path = next((path for path in font_candidates if path.exists()), None)
font = ImageFont.truetype(str(font_path), 20) if font_path else ImageFont.load_default(size=20)
small = ImageFont.truetype(str(font_path), 16) if font_path else ImageFont.load_default(size=16)


def frame_images(segment_dir: Path) -> list[Path]:
    return sorted(
        (path for path in segment_dir.glob("f*.png") if path.stem[1:].isdigit()),
        key=lambda path: int(path.stem[1:]),
    )


def tile(image_path: Path, label: str, width: int, height: int) -> Image.Image:
    image = Image.open(image_path).convert("RGB")
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (width, height + 34), "#111821")
    x = (width - image.width) // 2
    y = (height - image.height) // 2
    canvas.paste(image, (x, y))
    draw = ImageDraw.Draw(canvas)
    draw.text((10, height + 7), label, fill="#ecf4f7", font=small)
    return canvas


def build_overview(episode: int) -> None:
    items = []
    for segment_dir in sorted(PACK.glob(f"E{episode:02d}-*")):
        for image_path in frame_images(segment_dir):
            items.append((image_path, f"{segment_dir.name}/{image_path.stem}"))
    columns, width, height = 5, 360, 203
    rows = (len(items) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * width, 54 + rows * (height + 34)), "#0a0e13")
    ImageDraw.Draw(sheet).text((18, 15), f"《潮痕》E{episode:02d} · 历史关键帧 QC 总览", fill="#55d9df", font=font)
    for index, (image_path, label) in enumerate(items):
        x = index % columns * width
        y = 54 + index // columns * (height + 34)
        sheet.paste(tile(image_path, label, width, height), (x, y))
    sheet.save(OUT / f"E{episode:02d}-overview.jpg", quality=92, subsampling=0)


def build_segments(episode: int) -> None:
    for segment_dir in sorted(PACK.glob(f"E{episode:02d}-*")):
        images = frame_images(segment_dir)
        if not images:
            continue
        columns, width, height = 2, 640, 360
        rows = (len(images) + columns - 1) // columns
        sheet = Image.new("RGB", (columns * width, 54 + rows * (height + 34)), "#0a0e13")
        ImageDraw.Draw(sheet).text((18, 15), f"{segment_dir.name} · 语义与连续性 QC", fill="#55d9df", font=font)
        for index, image_path in enumerate(images):
            x = index % columns * width
            y = 54 + index // columns * (height + 34)
            sheet.paste(tile(image_path, f"{segment_dir.name}/{image_path.stem}", width, height), (x, y))
        sheet.save(OUT / f"{segment_dir.name}.jpg", quality=94, subsampling=0)


def build_repair_comparison(episode: int) -> None:
    archive = PACK / "rejected-originals" / "2026-08-24"
    pattern = re.compile(rf"^(E{episode:02d}-\d{{2}})-(f\d+)\.png$")
    pairs = []
    for original in sorted(archive.glob(f"E{episode:02d}-*-f*.png")):
        match = pattern.match(original.name)
        if not match:
            continue
        segment, frame = match.groups()
        repaired = PACK / segment / f"{frame}.png"
        if repaired.exists():
            pairs.append((f"{segment}/{frame}", original, repaired))
    if not pairs:
        return
    width, height = 640, 360
    sheet = Image.new("RGB", (width * 2, 54 + len(pairs) * (height + 34)), "#0a0e13")
    ImageDraw.Draw(sheet).text(
        (18, 15),
        f"《潮痕》E{episode:02d} · 返工前后候选对照（左旧 / 右新）",
        fill="#55d9df",
        font=font,
    )
    for row, (label, original, candidate) in enumerate(pairs):
        y = 54 + row * (height + 34)
        sheet.paste(tile(original, f"{label} · 归档旧图", width, height), (0, y))
        sheet.paste(tile(candidate, f"{label} · 正式修复图", width, height), (width, y))
    sheet.save(OUT / f"E{episode:02d}-repair-candidates.jpg", quality=94, subsampling=0)


def build_pending_candidate_comparisons(episode: int, chunk_size: int = 7) -> None:
    pairs = []
    archive = PACK / "rejected-originals" / "2026-08-24"
    for segment_dir in sorted(PACK.glob(f"E{episode:02d}-*")):
        for original in frame_images(segment_dir):
            candidates = list(segment_dir.glob(f"{original.stem}-*.png"))
            if not candidates:
                continue

            def candidate_rank(path: Path) -> tuple[int, float]:
                version = re.search(r"(?:^|-)v(\d+)(?:-|$)", path.stem, re.IGNORECASE)
                return (int(version.group(1)) if version else 0, path.stat().st_mtime)

            candidate = max(candidates, key=candidate_rank)
            archived = archive / f"{segment_dir.name}-{original.name}"
            comparison_source = archived if archived.exists() else original
            source_label = "归档旧图" if archived.exists() else "当前正式图"
            pairs.append(
                (f"{segment_dir.name}/{original.stem}", comparison_source, source_label, candidate)
            )

    for chunk_index in range(0, len(pairs), chunk_size):
        chunk = pairs[chunk_index : chunk_index + chunk_size]
        width, height = 640, 360
        sheet = Image.new("RGB", (width * 2, 54 + len(chunk) * (height + 34)), "#0a0e13")
        page = chunk_index // chunk_size + 1
        ImageDraw.Draw(sheet).text(
            (18, 15),
            f"《潮痕》E{episode:02d} · 待审候选对照 {page}（左正式旧图 / 右候选）",
            fill="#55d9df",
            font=font,
        )
        for row, (label, original, source_label, candidate) in enumerate(chunk):
            y = 54 + row * (height + 34)
            sheet.paste(tile(original, f"{label} · {source_label}", width, height), (0, y))
            sheet.paste(tile(candidate, f"{label} · {candidate.name}", width, height), (width, y))
        sheet.save(
            OUT / f"E{episode:02d}-pending-candidates-{page:02d}.jpg",
            quality=94,
            subsampling=0,
        )


def build_initial_generation_candidates(episode: int, chunk_size: int = 10) -> None:
    """Build review sheets for missing frames before they are promoted to fN.png."""
    candidate_pattern = re.compile(r"^f(\d+)-v(\d+)\.png$", re.IGNORECASE)
    items = []
    for segment_dir in sorted(PACK.glob(f"E{episode:02d}-*")):
        candidate_dir = segment_dir / "actual-generation" / "candidates-2026-08-24"
        if not candidate_dir.exists():
            continue
        latest_by_frame: dict[int, tuple[int, Path]] = {}
        for candidate in candidate_dir.glob("f*-v*.png"):
            match = candidate_pattern.match(candidate.name)
            if not match:
                continue
            frame_number, version = map(int, match.groups())
            current = latest_by_frame.get(frame_number)
            if current is None or version > current[0]:
                latest_by_frame[frame_number] = (version, candidate)
        for frame_number, (_, candidate) in sorted(latest_by_frame.items()):
            items.append((candidate, f"{segment_dir.name}/f{frame_number} · {candidate.name}"))

    for chunk_index in range(0, len(items), chunk_size):
        chunk = items[chunk_index : chunk_index + chunk_size]
        columns, width, height = 3, 520, 293
        rows = (len(chunk) + columns - 1) // columns
        sheet = Image.new("RGB", (columns * width, 54 + rows * (height + 34)), "#0a0e13")
        page = chunk_index // chunk_size + 1
        ImageDraw.Draw(sheet).text(
            (18, 15),
            f"《潮痕》E{episode:02d} · 缺图首轮候选 QC {page}",
            fill="#55d9df",
            font=font,
        )
        for index, (candidate, label) in enumerate(chunk):
            x = index % columns * width
            y = 54 + index // columns * (height + 34)
            sheet.paste(tile(candidate, label, width, height), (x, y))
        sheet.save(
            OUT / f"E{episode:02d}-generation-candidates-{page:02d}.jpg",
            quality=94,
            subsampling=0,
        )


for ep in range(1, 7):
    build_overview(ep)
    build_segments(ep)

for ep in (1, 2):
    build_repair_comparison(ep)
    build_pending_candidate_comparisons(ep)

for ep in range(1, 7):
    build_initial_generation_candidates(ep)

print(f"contact sheets: {OUT}")

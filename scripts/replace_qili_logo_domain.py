from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
IMAGE_PATH = ROOT / "images" / "qili-logo-white.jpg"
SOURCE_IMAGE_PATH = ROOT / "images" / "qili-logo-white - Copy.jpg"
WINDOWS_FONT_DIR = Path("C:/Windows/Fonts")
ORIGINAL_TEXT = "QILITRADING.COM"
NEW_TEXT = "WWW.QILI.LTD"

# This band isolates the right-side bottom line while leaving the logo and
# firm name untouched.
ROI_X0 = 125
ROI_Y0 = 90
ROI_X1 = 332
ROI_Y1 = 111
THRESHOLD = 180


@dataclass(order=True)
class MatchResult:
    score: float
    font_name: str
    font_path: Path
    size: int
    x: int
    y: int
    width: int
    height: int


def load_mask(image_path: Path) -> tuple[Image.Image, np.ndarray, np.ndarray]:
    image = Image.open(image_path).convert("RGB")
    grayscale = np.array(image.convert("L"))
    roi = grayscale[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1]
    mask = roi < THRESHOLD
    return image, grayscale, mask


def render_text_mask(
    text: str,
    font_path: Path,
    size: int,
    canvas_size: tuple[int, int],
    x: int,
    y: int,
    tracking: int = 0,
) -> tuple[np.ndarray, int, int]:
    canvas = Image.new("L", canvas_size, 255)
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(font_path), size=size)

    cursor_x = x
    max_right = x
    max_bottom = y
    for index, char in enumerate(text):
        bbox = draw.textbbox((cursor_x, y), char, font=font)
        draw.text((cursor_x, y), char, font=font, fill=0)
        cursor_x = bbox[2] + (tracking if index < len(text) - 1 else 0)
        max_right = max(max_right, bbox[2])
        max_bottom = max(max_bottom, bbox[3])

    rendered = np.array(canvas) < THRESHOLD
    return rendered, max_right - x, max_bottom - y


def get_font_candidates() -> list[tuple[str, Path]]:
    candidates = [
        "ARIALNB.TTF",
        "ARIALN.TTF",
        "arialbd.ttf",
        "arial.ttf",
        "bahnschrift.ttf",
        "GOTHICB.TTF",
        "GOTHIC.TTF",
        "tahomabd.ttf",
        "verdanab.ttf",
        "impact.ttf",
    ]
    found: list[tuple[str, Path]] = []
    for name in candidates:
        path = WINDOWS_FONT_DIR / name
        if path.exists():
            found.append((name, path))
    if not found:
        raise FileNotFoundError("No candidate fonts found in C:/Windows/Fonts")
    return found


def fit_existing_text(actual_mask: np.ndarray) -> MatchResult:
    best: MatchResult | None = None
    actual_pixels = actual_mask.sum()
    canvas_size = (actual_mask.shape[1], actual_mask.shape[0])

    for font_name, font_path in get_font_candidates():
        for size in range(14, 30):
            for x in range(0, 25):
                for y in range(-4, 7):
                    rendered_mask, width, height = render_text_mask(
                        ORIGINAL_TEXT,
                        font_path,
                        size,
                        canvas_size,
                        x,
                        y,
                    )
                    overlap = np.logical_and(actual_mask, rendered_mask).sum()
                    union = np.logical_or(actual_mask, rendered_mask).sum()
                    if union == 0:
                        continue
                    iou = overlap / union
                    density_penalty = abs(int(rendered_mask.sum()) - int(actual_pixels)) / max(actual_pixels, 1)
                    score = iou - (0.15 * density_penalty)
                    result = MatchResult(score, font_name, font_path, size, x, y, width, height)
                    if best is None or result.score > best.score:
                        best = result

    if best is None:
        raise RuntimeError("Unable to fit existing text to any candidate font")
    return best


def find_best_new_layout(template: MatchResult, target_width: int, target_height: int) -> tuple[int, int, int, int, int]:
    best_layout: tuple[float, int, int, int, int, int] | None = None
    canvas_width = ROI_X1 - ROI_X0
    canvas_height = ROI_Y1 - ROI_Y0
    font_path = template.font_path

    for size in range(max(12, template.size - 2), template.size + 14):
        for tracking in range(0, 5):
            rendered_mask, width, height = render_text_mask(
                NEW_TEXT,
                font_path,
                size,
                (canvas_width, canvas_height),
                0,
                0,
                tracking=tracking,
            )
            if width <= 0 or height <= 0:
                continue
            if width > canvas_width - 4 or height > canvas_height:
                continue

            width_score = 1.0 - abs(width - target_width) / max(target_width, 1)
            height_score = 1.0 - abs(height - target_height) / max(target_height, 1)
            balance_score = (0.7 * width_score) + (0.3 * height_score)

            x = max(0, int(round((canvas_width - width) / 2)))
            y = max(0, int(round((canvas_height - height) / 2)))
            layout = (balance_score, size, tracking, x, y, width)
            if best_layout is None or layout[0] > best_layout[0]:
                best_layout = layout

    if best_layout is None:
        raise RuntimeError("Unable to fit replacement text into the logo band")

    _, size, tracking, x, y, width = best_layout
    return size, tracking, x, y, width


def main() -> None:
    source_path = SOURCE_IMAGE_PATH if SOURCE_IMAGE_PATH.exists() else IMAGE_PATH
    image, grayscale, actual_mask = load_mask(source_path)
    fitted = fit_existing_text(actual_mask)

    actual_pixels = np.argwhere(actual_mask)
    target_y0 = int(actual_pixels[:, 0].min())
    target_y1 = int(actual_pixels[:, 0].max())
    target_x0 = int(actual_pixels[:, 1].min())
    target_x1 = int(actual_pixels[:, 1].max())
    target_width = target_x1 - target_x0 + 1
    target_height = target_y1 - target_y0 + 1

    size, tracking, x, y, new_width = find_best_new_layout(fitted, target_width, target_height)

    output = image.copy()
    draw = ImageDraw.Draw(output)
    draw.rectangle((ROI_X0, ROI_Y0, ROI_X1, ROI_Y1), fill=(255, 255, 255))

    font = ImageFont.truetype(str(fitted.font_path), size=size)
    cursor_x = ROI_X0 + x
    baseline_y = ROI_Y0 + y
    for index, char in enumerate(NEW_TEXT):
        bbox = draw.textbbox((cursor_x, baseline_y), char, font=font)
        draw.text((cursor_x, baseline_y), char, font=font, fill=(0, 0, 0))
        cursor_x = bbox[2] + (tracking if index < len(NEW_TEXT) - 1 else 0)

    output.save(IMAGE_PATH, quality=100, subsampling=0)

    output_gray = np.array(output.convert("L"))
    delta = np.abs(output_gray.astype(int) - grayscale.astype(int))
    delta[:ROI_Y0, :] = 0
    delta[ROI_Y1:, :] = 0
    delta[:, :ROI_X0] = 0

    outside_roi_changed = int((np.abs(output_gray.astype(int) - grayscale.astype(int)) > 0).sum() - (delta > 0).sum())

    print(
        {
            "source": str(source_path.name),
            "font": fitted.font_name,
            "matched_font_size": fitted.size,
            "replacement_font_size": size,
            "tracking": tracking,
            "replacement_width": new_width,
            "target_width": target_width,
            "target_height": target_height,
            "outside_roi_changed_pixels": outside_roi_changed,
        }
    )


if __name__ == "__main__":
    main()
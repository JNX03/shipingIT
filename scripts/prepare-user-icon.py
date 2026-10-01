"""Resize the user's original JPEG; do not generate or retouch artwork.

Run from any working directory with Pillow installed. Outputs are deliberately
separate from the previously generated app assets. No app config is modified.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat, __version__


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "shipiticon.jpg"
OUTPUT = ROOT / "assets" / "game"
EVIDENCE = ROOT / "artifacts" / "icon-20260930"
EXPECTED_SOURCE_SHA256 = "2b203d6b85a30240148dde81dbf07f18244629c006b051084ffcd99fe710791b"
SIZE = 1024
CONTENT_SIZE = 640
CONTENT_ORIGIN = (169, 171)
MINIMUM_SAFE66_MARGIN_PX = 12
BACKGROUND_SAMPLE = (577, 0, 677, 100)
MAIN_PATH = OUTPUT / "shipit-user-icon.png"
ADAPTIVE_PATH = OUTPUT / "shipit-user-adaptive-foreground.png"
FAVICON_PATH = OUTPUT / "shipit-user-favicon.png"

# Manually observed polygon boundaries from the supplied source, used only for
# mask-coverage checks. They do not modify any image pixels.
FEATURE_POLYGONS = {
    "left_iris": [(235, 968), (245, 922), (275, 891), (321, 884), (356, 915),
                  (370, 950), (361, 997), (333, 1035), (286, 1041), (251, 1014)],
    "right_iris": [(590, 1102), (606, 1056), (645, 1023), (689, 1018), (724, 1050),
                   (733, 1092), (720, 1141), (691, 1174), (641, 1179), (607, 1150)],
    "bulb_body": [(977, 199), (1021, 204), (1061, 226), (1085, 260), (1091, 304),
                  (1088, 349), (1067, 386), (1030, 414), (1000, 428), (984, 467),
                  (944, 491), (910, 478), (886, 443), (883, 420), (897, 380),
                  (875, 351), (866, 309), (870, 267), (890, 232), (929, 207)],
    "mouth": [(397, 1103), (456, 1112), (511, 1141), (509, 1190),
              (460, 1212), (415, 1198), (385, 1163)],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def shape_mask(size: int, exponent: int) -> Image.Image:
    """Circle (n=2) or illustrative squircle (n=4), for previews only."""
    result = Image.new("L", (size, size), 0)
    pixels = result.load()
    for y in range(size):
        ny = abs((2 * (y + 0.5) / size) - 1)
        for x in range(size):
            nx = abs((2 * (x + 0.5) / size) - 1)
            if nx ** exponent + ny ** exponent <= 1:
                pixels[x, y] = 255
    return result


def rounded_mask(size: int) -> Image.Image:
    result = Image.new("L", (size, size), 0)
    ImageDraw.Draw(result).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=round(size * 0.225), fill=255
    )
    return result


def masked_preview(image: Image.Image, mask: Image.Image) -> Image.Image:
    result = image.convert("RGBA")
    result.putalpha(mask)
    return result


def adaptive_viewport(composite: Image.Image, visible_dp: int = 72) -> Image.Image:
    # Android layers cover 108dp, with a 72dp static viewport. Centered sampling
    # retains fractional geometry instead of rounding it into an asymmetric crop.
    side = SIZE * visible_dp / 108
    start = (SIZE - side) / 2
    viewport = composite.transform(
        (768, 768), Image.Transform.EXTENT,
        (start, start, start + side, start + side), Image.Resampling.BICUBIC,
    )
    return viewport


def main() -> None:
    source_hash = sha256(SOURCE)
    if source_hash != EXPECTED_SOURCE_SHA256:
        raise ValueError("Source JPEG differs from the user-approved original; stop for review.")
    with Image.open(SOURCE) as original:
        if original.size != (1254, 1254):
            raise ValueError(f"Expected the supplied 1254 square image, received {original.size}.")
        if original.getexif().get(274, 1) not in (1, None):
            raise ValueError("Unexpected EXIF orientation; review before resizing.")
        source = original.convert("RGB")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    background_rgb = tuple(round(channel) for channel in ImageStat.Stat(
        source.crop(BACKGROUND_SAMPLE)
    ).mean)
    background_hex = "#" + "".join(f"{channel:02X}" for channel in background_rgb)

    main_image = source.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    main_image.save(MAIN_PATH, optimize=True)
    content = source.resize((CONTENT_SIZE, CONTENT_SIZE), Image.Resampling.LANCZOS)
    foreground = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    foreground.paste(content.convert("RGBA"), CONTENT_ORIGIN)
    foreground.save(ADAPTIVE_PATH, optimize=True)
    main_image.resize((64, 64), Image.Resampling.LANCZOS).save(FAVICON_PATH, optimize=True)

    # Validate pixels, alpha, size and encoding; this is artifact verification,
    # not a replacement for the parent task's lint/typecheck or native review.
    with Image.open(MAIN_PATH) as saved:
        assert saved.format == "PNG" and saved.size == (1024, 1024) and saved.mode == "RGB"
        assert ImageChops.difference(saved, main_image).getbbox() is None
    with Image.open(ADAPTIVE_PATH) as saved:
        assert saved.format == "PNG" and saved.size == (1024, 1024) and saved.mode == "RGBA"
        alpha = saved.getchannel("A")
        assert alpha.getextrema() == (0, 255)
        content_bounds = (*CONTENT_ORIGIN,
                          CONTENT_ORIGIN[0] + CONTENT_SIZE,
                          CONTENT_ORIGIN[1] + CONTENT_SIZE)
        assert alpha.getbbox() == content_bounds
        saved_content = saved.crop(content_bounds)
        assert saved_content.getchannel("A").getextrema() == (255, 255)
        assert ImageChops.difference(saved_content.convert("RGB"), content).getbbox() is None
    with Image.open(FAVICON_PATH) as saved:
        assert saved.format == "PNG" and saved.size == (64, 64) and saved.mode == "RGB"
    assert sha256(SOURCE) == source_hash

    composite = Image.new("RGBA", (SIZE, SIZE), (*background_rgb, 255))
    composite.alpha_composite(foreground)
    viewport = adaptive_viewport(composite)
    conservative_viewport = adaptive_viewport(composite, 66)
    previews = [
        ("main-square", "Main square", main_image.convert("RGBA")),
        ("ios-rounded", "iOS corner approximation", masked_preview(main_image, rounded_mask(SIZE))),
        ("android-circle", "Android circle / 72dp", masked_preview(viewport, shape_mask(768, 2))),
        ("android-squircle", "Android squircle / 72dp", masked_preview(viewport, shape_mask(768, 4))),
        ("android-safe66-circle", "Conservative circle / 66dp", masked_preview(conservative_viewport, shape_mask(768, 2))),
    ]

    font = ImageFont.load_default(size=17)
    small_font = ImageFont.load_default(size=14)
    sheet = Image.new("RGB", (1100, 380), "#F3F5F8")
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 12), "Original supplied artwork - actual 48px previews and 4x nearest-pixel enlargements", fill="#172334", font=font)
    evidence_outputs = []
    for column, (name, label, preview) in enumerate(previews):
        preview_48 = preview.resize((48, 48), Image.Resampling.LANCZOS)
        preview_256 = preview.resize((256, 256), Image.Resampling.LANCZOS)
        path_48 = EVIDENCE / f"{name}-48.png"
        path_256 = EVIDENCE / f"{name}-256.png"
        preview_48.save(path_48, optimize=True)
        preview_256.save(path_256, optimize=True)
        evidence_outputs.extend([path_48, path_256])
        x = column * 220
        draw.text((x + 10, 52), label, fill="#172334", font=small_font)
        sheet.paste(preview_48, (x + 86, 86), preview_48)
        enlarged = preview_48.resize((192, 192), Image.Resampling.NEAREST)
        sheet.paste(enlarged, (x + 14, 158), enlarged)
    draw.text((18, 362), "Preview masks are geometric illustrations. OEM launcher rendering can vary; no native build was run.", fill="#425266", font=small_font)
    contact_sheet = EVIDENCE / "contact-sheet.png"
    sheet.save(contact_sheet, optimize=True)
    evidence_outputs.append(contact_sheet)

    scale = CONTENT_SIZE / source.width
    circle_radius = SIZE * 72 / 108 / 2
    safe66_radius = SIZE * 66 / 108 / 2
    features = {}
    for name, polygon in FEATURE_POLYGONS.items():
        transformed = [(CONTENT_ORIGIN[0] + x * scale, CONTENT_ORIGIN[1] + y * scale)
                       for x, y in polygon]
        furthest = max(math.hypot(x - SIZE / 2, y - SIZE / 2) for x, y in transformed)
        margin = circle_radius - furthest
        safe66_margin = safe66_radius - furthest
        assert margin > 0, f"Observed {name} crosses the common 72dp circular mask."
        assert safe66_margin >= MINIMUM_SAFE66_MARGIN_PX, (
            f"Observed {name} lacks the required {MINIMUM_SAFE66_MARGIN_PX}px "
            "margin inside the conservative 66dp circular mask."
        )
        features[name] = {
            "source_polygon": polygon,
            "common_72dp_circle_minimum_margin_px_in_1024_layer": round(margin, 3),
            "conservative_66dp_circle_minimum_margin_px_in_1024_layer": round(safe66_margin, 3),
        }
    safe66_minimum_margin = min(
        feature["conservative_66dp_circle_minimum_margin_px_in_1024_layer"]
        for feature in features.values()
    )

    metadata = {
        "source": {"path": relative(SOURCE), "sha256": source_hash,
                   "size": list(source.size), "mode": source.mode, "untouched": True},
        "processing": {"tool": "Pillow", "version": __version__,
                       "operations": ["JPEG decode to RGB", "Lanczos resize", "rectangular transparent padding", "PNG encoding"],
                       "artwork_generated": False, "background_removed": False,
                       "source_graphics_repainted": False,
                       "adaptive_content": {"size": [CONTENT_SIZE, CONTENT_SIZE],
                                            "origin": list(CONTENT_ORIGIN),
                                            "minimum_required_safe66_margin_px": MINIMUM_SAFE66_MARGIN_PX},
                       "sampled_background": {"source_rectangle": list(BACKGROUND_SAMPLE), "rgb": list(background_rgb), "hex": background_hex}},
        "assets": [],
        "previews": [{"path": relative(path), "sha256": sha256(path)} for path in evidence_outputs],
        "observed_feature_checks": features,
        "validation": {"main_opaque": True, "png_pixel_roundtrip": True,
                       "adaptive_alpha_geometry": True, "source_sha256_unchanged": True,
                       "common_72dp_observed_features_inside_circle": True,
                       "conservative_66dp_observed_features_inside_circle": True,
                       "conservative_66dp_minimum_margin_px_in_1024_layer": safe66_minimum_margin,
                       "native_build_tested": False, "device_launcher_tested": False},
        "references": ["https://docs.expo.dev/versions/v57.0.0/",
                       "https://docs.expo.dev/llms.txt",
                       "https://developer.android.com/develop/ui/compose/system/icon_design_adaptive"],
    }
    for path in (MAIN_PATH, ADAPTIVE_PATH, FAVICON_PATH):
        with Image.open(path) as image:
            metadata["assets"].append({"path": relative(path), "sha256": sha256(path),
                                       "size": list(image.size), "mode": image.mode,
                                       "bytes": path.stat().st_size})
    (EVIDENCE / "provenance.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    (EVIDENCE / "source-sha256.txt").write_text(f"{source_hash}  shipiticon.jpg\n", encoding="utf-8")
    print(json.dumps({"source_unchanged": True, "background_color": background_hex,
                      "assets": metadata["assets"], "contact_sheet": relative(contact_sheet),
                      "feature_margins": features}, indent=2))


if __name__ == "__main__":
    main()

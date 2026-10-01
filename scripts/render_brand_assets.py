"""Render the original code-authored app mark at native density; no AI edits."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "brand"
SCALE = 3


def render(transparent: bool = False) -> Image.Image:
    im = Image.new("RGBA", (1024 * SCALE, 1024 * SCALE), (0, 0, 0, 0) if transparent else "#3B82F6")
    draw = ImageDraw.Draw(im)

    def polygon(points: list[tuple[int, int]], color: str) -> None:
        draw.polygon([(x * SCALE, y * SCALE) for x, y in points], fill=color)

    polygon([(192,544),(828,224),(624,802),(466,626),(304,732),(336,564)], "#1D4FC4")
    polygon([(192,504),(828,184),(624,762),(466,586),(304,692),(336,524)], "#FFFFFF")
    polygon([(336,524),(828,184),(466,586),(304,692)], "#BDD9FF")
    polygon([(466,586),(828,184),(423,530)], "#79B5FF")
    polygon([(284,158),(312,224),(382,252),(312,280),(284,350),(256,280),(186,252),(256,224)], "#FFBC52")
    polygon([(732,776),(750,820),(794,838),(750,856),(732,900),(714,856),(670,838),(714,820)], "#FFBC52")
    return im.resize((1024, 1024), Image.Resampling.LANCZOS)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    icon = render()
    icon.convert("RGB").save(OUT / "app-icon.png", optimize=True)
    icon.resize((192, 192), Image.Resampling.LANCZOS).save(OUT / "favicon.png", optimize=True)
    # Android adaptive foreground stays within a 66% safe area.
    foreground = Image.new("RGBA", (1024, 1024))
    mark = render(True).resize((676, 676), Image.Resampling.LANCZOS)
    foreground.alpha_composite(mark, (174, 174))
    foreground.save(OUT / "adaptive-icon.png", optimize=True)
    print("Rendered app-icon.png, adaptive-icon.png, favicon.png")

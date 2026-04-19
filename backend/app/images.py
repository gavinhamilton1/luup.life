from __future__ import annotations

import asyncio
import io
from typing import Tuple

from PIL import Image

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except Exception:
    pass


MAX_EDGE = 1600
JPEG_QUALITY = 85


def _process_sync(data: bytes) -> Tuple[bytes, int, int]:
    img = Image.open(io.BytesIO(data))

    # Honor EXIF orientation, then strip metadata by re-creating the image
    # without its info dict (exif, icc, etc).
    try:
        from PIL import ImageOps

        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # JPEG doesn't support alpha — composite RGBA onto white so transparent
    # PNGs/HEICs degrade gracefully.
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        alpha = img.split()[-1]
        bg.paste(img, mask=alpha)
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    longest = max(w, h)
    if longest > MAX_EDGE:
        scale = MAX_EDGE / longest
        new_size = (int(w * scale), int(h * scale))
        img = img.resize(new_size, Image.LANCZOS)

    out = io.BytesIO()
    img.save(
        out,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True,
        progressive=True,
    )
    out.seek(0)
    return out.getvalue(), img.size[0], img.size[1]


async def process_image(data: bytes) -> Tuple[bytes, int, int]:
    return await asyncio.to_thread(_process_sync, data)

# Owner-supplied ShipingIT icon

The app icon exports were prepared from an owner-supplied 1254 × 1254 JPEG. Preparation decoded the JPEG, resized it, added rectangular padding where needed and encoded PNGs. The artwork, character, background and colors were not generated, retouched or separated into a cutout during this export step.

| Purpose | Runtime path | Format |
| --- | --- | --- |
| Main icon/splash | `assets/game/shipit-user-icon.png` | 1024 × 1024 opaque RGB PNG |
| Android adaptive foreground | `assets/game/shipit-user-adaptive-foreground.png` | 1024 × 1024 RGBA PNG |
| Web favicon | `assets/game/shipit-user-favicon.png` | 64 × 64 opaque RGB PNG |

The main icon preserves the source square. The adaptive foreground retains the original background and places the 640 × 640 image at `(169, 171)` on a transparent 1024 × 1024 canvas. Only the padding is transparent; launcher masks and rounded corners are not baked into the image.

The adaptive background `#1A99FD` was sampled from the source's upper-center area. `app.json` selects these local assets. Source/reference drafts and preparation previews are retained separately from the public runtime files.

These are project brand assets. Their presence does not grant trademark rights or invent a separate license for the supplied image; see [third-party notices](../THIRD-PARTY-NOTICES.md).

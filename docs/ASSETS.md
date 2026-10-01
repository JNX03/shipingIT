# Visual asset provenance

ShipingIT extends the owner's existing DekPort mascot, Ami. Owner-provided sources established her cat ears, charcoal hair, black cat hairclip, white shirt and blue tie. The app's Nunito body font is distributed by `@expo-google-fonts/nunito` under the SIL Open Font License; the existing DekPort display font was inspected but not added as a new runtime font.

The project created new illustrations with the built-in image-generation tool beginning 29 September 2026. Runtime artwork is local; the app does not fetch generated images from remote URLs. Source generation drafts and private review captures are retained separately from this public snapshot.

| Asset family | Runtime location | Provenance/use |
| --- | --- | --- |
| App icon | `assets/game/shipit-user-icon.png` | Owner-supplied image, resized/encoded for app use; see [icon record](SHIPINGIT-USER-ICON.md). |
| Brand assets | `assets/brand/` | Existing owner-provided DekPort branding and Ami variants. |
| Learning illustrations | `assets/illustrations/` | Original project-generated illustrations with local size variants. |
| Game world and characters | `assets/game/` | Original generated school scenes, characters, activity props and sprites; see [game art](SHIPINGIT-ART.md). |
| World scenes | `assets/worlds/` | Original project environments used as local runtime assets. |
| Public screenshots | `docs/screenshots/public/` | Inspected original app captures; see [screenshot provenance](screenshots/public/README.md). |

The visual direction uses readable cartoon silhouettes, a blue/navy/cream palette with semantic unit colors, original environments and runtime-rendered labels. Critical instructions and answers are UI text, not words baked into illustrations. Artwork loading failures remain visible and retryable.

World provenance manifests may use `original-generation/<filename>` to identify privately archived generated originals. Those identifiers describe provenance; they are not files included in a public clone. Runtime asset paths point to the bundled images.

This provenance record does not invent a license or exclusive copyright for generated images or owner-supplied branding. The MIT source license does not grant trademark rights. See [third-party notices](../THIRD-PARTY-NOTICES.md).

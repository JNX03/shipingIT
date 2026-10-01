# Original game artwork

The game art layer was created for ShipingIT with the built-in image-generation tool beginning 29 September 2026. It uses original cartoon characters and local raster environments, guided by the owner's established Ami identity. No Duolingo character art or proprietary font is used as a runtime game asset.

## Families

- **Ami:** cat ears, charcoal hair, a black cat hairclip, white school shirt, blue tie and navy skirt.
- **Mali:** student with notebook/backpack; **Noa:** canteen staff; **Ken:** student athlete. These are fictional interview roles.
- **Environments:** school courtyard/canteen/sports areas, library and astronomy-club scenes, workshops and themed learning units.
- **Activities:** evidence notebook, insight puzzle, feature tray, phone canvas, logic blocks and launch parcel.
- **Rewards and wardrobe:** original Sparks, workshop props, clothing and headwear. Runtime art does not encode grades or entitlements.

Runtime registries include `src/game/art.ts`, `src/game/activity-art.ts` and `src/assets/registry.ts`. Aliases can intentionally reuse relevant files; they do not imply an additional generated asset exists. The source contains loading, retry and reduced-motion handling at the UI boundary.

## Integration rules

Keep essential labels, instructions and interaction targets in React Native. Preserve scene aspect ratio and coordinate mapping; cropping a walkable scene changes character/target positions. Original articulated sprites and motion assets remain tied to their runtime rigs. Tap alternatives should preserve the same learning rules as dragging.

Generated source drafts are retained privately and are not required to run this public snapshot. Runtime images are bundled from `assets/`. Original README captures are documented separately in [screenshot provenance](screenshots/public/README.md).

See [asset provenance](ASSETS.md) and [third-party notices](../THIRD-PARTY-NOTICES.md) for ownership and font boundaries.

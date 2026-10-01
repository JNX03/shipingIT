import type { GameDraft, ScreenBlock } from '../types';
import {
  blockDefinitions,
  PHONE_HEIGHT,
  PHONE_INSET,
  PHONE_WIDTH,
  type BlockKind,
} from '../logic/build';

type Design = GameDraft['design'];

/** Coordinates stay in logical phone points, independent of viewport scroll. */
export function placeEditorBlock(
  design: Design,
  kind: BlockKind,
  centerX: number,
  centerY: number,
): Design {
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return design;
  const spec = blockDefinitions[kind];
  const previous = design.blocks.find((block) => block.kind === kind);
  const block: ScreenBlock = {
    id: previous?.id ?? `screen-${kind}`,
    kind,
    x: Math.max(
      0,
      Math.min(PHONE_WIDTH - spec.width, Math.round((centerX - spec.width / 2) / 4) * 4),
    ),
    y: Math.max(
      0,
      Math.min(PHONE_HEIGHT - spec.height, Math.round((centerY - spec.height / 2) / 4) * 4),
    ),
  };
  return { ...design, blocks: [...design.blocks.filter((item) => item.kind !== kind), block] };
}

/** Find an actual free slot; never silently overlap the last block at the bottom. */
export function findEditorSlot(design: Design, kind: BlockKind) {
  const spec = blockDefinitions[kind];
  const x = design.alignment === 'center' ? (PHONE_WIDTH - spec.width) / 2 : PHONE_INSET;
  const remaining = design.blocks.filter((block) => block.kind !== kind);
  const title = remaining.find((block) => block.kind === 'title');
  const firstY =
    kind === 'title' || !title
      ? PHONE_INSET
      : title.y + blockDefinitions.title.height + design.spacing;
  for (let y = Math.ceil(firstY / 4) * 4; y + spec.height <= PHONE_HEIGHT - PHONE_INSET; y += 4) {
    if (
      remaining.every((block) => {
        const other = blockDefinitions[block.kind];
        return (
          y >= block.y + other.height + design.spacing ||
          y + spec.height + design.spacing <= block.y ||
          x >= block.x + other.width + design.spacing ||
          x + spec.width + design.spacing <= block.x
        );
      })
    )
      return { x: x + spec.width / 2, y: y + spec.height / 2 };
  }
  return null;
}

export function editorSpacingLimit(design: Design) {
  if (design.blocks.length < 2) return 24;
  const used = design.blocks.reduce((sum, block) => sum + blockDefinitions[block.kind].height, 0);
  return Math.max(
    4,
    Math.min(
      24,
      Math.floor((PHONE_HEIGHT - PHONE_INSET * 2 - used) / (design.blocks.length - 1) / 4) * 4,
    ),
  );
}

/** Keep the player's reading order and horizontal placement while changing gaps. */
export function spaceEditorBlocks(design: Design, spacing: number): Design {
  const ordered = [...design.blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  const height =
    ordered.reduce((sum, block) => sum + blockDefinitions[block.kind].height, 0) +
    Math.max(0, ordered.length - 1) * spacing;
  let y = Math.max(
    PHONE_INSET,
    Math.min(ordered[0]?.y ?? PHONE_INSET, PHONE_HEIGHT - PHONE_INSET - height),
  );
  return {
    ...design,
    spacing,
    blocks: ordered.map((block) => {
      const next = { ...block, y };
      y += blockDefinitions[block.kind].height + spacing;
      return next;
    }),
  };
}

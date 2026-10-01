import type { GameDraft, NpcId, ScreenBlock, StageCheck, StageId } from '../types';
import { insightSentence } from './research';

export const PHONE_WIDTH = 280;
export const PHONE_HEIGHT = 540;
export const PHONE_INSET = 16;
export const blockDefinitions = {
  title: { label: 'Screen title', width: 224, height: 56, detail: 'Give this screen a purpose.' },
  queue: { label: 'Queue cards', width: 248, height: 144, detail: 'Compare two stalls.' },
  updated: {
    label: 'Update time',
    width: 224,
    height: 56,
    detail: 'Show how fresh the numbers are.',
  },
  button: {
    label: 'Refresh button',
    width: 216,
    height: 56,
    detail: 'Let someone get fresh data.',
  },
  image: {
    label: 'Campus picture',
    width: 128,
    height: 56,
    detail: 'An optional visual landmark.',
  },
  navigation: {
    label: 'Staff entry',
    width: 248,
    height: 56,
    detail: 'A place for staff updates.',
  },
} as const;
export type BlockKind = keyof typeof blockDefinitions;
export const requiredBlockKinds: BlockKind[] = ['title', 'queue', 'updated', 'button'];

export const flowNodes = [
  {
    id: 'tap',
    role: 'TRIGGER',
    title: 'Tap refresh',
    detail: 'A visitor asks for current queues.',
  },
  {
    id: 'load',
    role: 'ACTION',
    title: 'Read the board',
    detail: 'Request the current board data.',
  },
  { id: 'queues', role: 'DATA', title: 'Queue data', detail: 'Stall, wait and updated time.' },
  { id: 'render', role: 'RESULT', title: 'Show choices', detail: 'Display fresh queue cards.' },
  { id: 'report', role: 'TRIGGER', title: 'Staff reports', detail: 'Noa sends a new wait time.' },
  { id: 'save', role: 'ACTION', title: 'Save update', detail: 'Write the value to the board.' },
] as const;
export type FlowNodeId = (typeof flowNodes)[number]['id'];
export const visitorFlow = ['tap', 'load', 'queues', 'render'] as const;
export const requiredFlowEdges = ['tap>load', 'load>queues', 'queues>render'] as const;
export const staffFlowEdges = ['report>save', 'save>queues'] as const;
const allowedEdges = new Set<string>([...requiredFlowEdges, ...staffFlowEdges]);

function fail(message: string): StageCheck {
  return { valid: false, message };
}
function pass(message: string): StageCheck {
  return { valid: true, message };
}

export function screenBlockRect(block: ScreenBlock) {
  return { x: block.x, y: block.y, ...blockDefinitions[block.kind] };
}

export function arrangeScreen(
  design: GameDraft['design'],
  freshnessFirst = false,
): GameDraft['design'] {
  const order: BlockKind[] = freshnessFirst
    ? ['title', 'updated', 'queue', 'button', 'image', 'navigation']
    : ['title', 'queue', 'updated', 'button', 'image', 'navigation'];
  let y = PHONE_INSET;
  return {
    ...design,
    blocks: [...design.blocks]
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
      .map((block) => {
        const spec = blockDefinitions[block.kind];
        const placed = {
          ...block,
          x: design.alignment === 'center' ? (PHONE_WIDTH - spec.width) / 2 : PHONE_INSET,
          y,
        };
        y += spec.height + design.spacing;
        return placed;
      }),
  };
}

export function checkScreenDesign(draft: GameDraft): StageCheck {
  const { blocks, radius, spacing, alignment, accent } = draft.design;
  if (blocks.length > 6) return fail('The phone is full. Keep one of each block.');
  if (!Number.isFinite(radius) || radius < 0 || radius > 28)
    return fail('Choose corner rounding between 0 and 28.');
  if (!Number.isFinite(spacing) || spacing < 4 || spacing > 24)
    return fail('Choose spacing between 4 and 24.');
  if (!['left', 'center'].includes(alignment) || !['blue', 'purple', 'teal'].includes(accent))
    return fail('Choose an alignment and a screen color.');
  for (const kind of requiredBlockKinds) {
    if (!blocks.some((block) => block.kind === kind))
      return fail(`Place the ${blockDefinitions[kind].label.toLowerCase()} on your phone.`);
  }
  const ids = new Set<string>();
  const kinds = new Set<BlockKind>();
  for (const block of blocks) {
    if (!blockDefinitions[block.kind] || !block.id || ids.has(block.id) || kinds.has(block.kind))
      return fail('Each interface block needs its own place. Remove duplicate blocks.');
    ids.add(block.id);
    kinds.add(block.kind);
    const { width, height } = blockDefinitions[block.kind];
    if (
      !Number.isFinite(block.x) ||
      !Number.isFinite(block.y) ||
      block.x < 0 ||
      block.y < 0 ||
      block.x + width > PHONE_WIDTH ||
      block.y + height > PHONE_HEIGHT
    )
      return fail(
        `Move the ${blockDefinitions[block.kind].label.toLowerCase()} fully onto the phone.`,
      );
  }
  for (let i = 0; i < blocks.length; i++) {
    const a = screenBlockRect(blocks[i]);
    for (let j = i + 1; j < blocks.length; j++) {
      const b = screenBlockRect(blocks[j]);
      if (
        a.x < b.x + b.width + 4 &&
        a.x + a.width + 4 > b.x &&
        a.y < b.y + b.height + 4 &&
        a.y + a.height + 4 > b.y
      )
        return fail(`${a.label} and ${b.label.toLowerCase()} overlap. Give them breathing room.`);
    }
  }
  const title = blocks.find((block) => block.kind === 'title')!;
  if (blocks.some((block) => block.kind !== 'title' && block.y < title.y))
    return fail('Put the screen title first so visitors know where they are.');
  return pass('Your screen has a clear purpose, queue choices, an update time and an action.');
}

export function flowEdgeKey(from: string, to: string) {
  return `${from}>${to}`;
}

export function checkConnections(draft: GameDraft): StageCheck {
  const keys = draft.connect.links.map((link) => flowEdgeKey(link.from, link.to));
  if (new Set(keys).size !== keys.length) return fail('Remove the duplicate connection.');
  const invalid = draft.connect.links.find(
    (link) => !allowedEdges.has(flowEdgeKey(link.from, link.to)),
  );
  if (invalid) {
    const from = flowNodes.find((node) => node.id === invalid.from)?.title ?? invalid.from;
    const to = flowNodes.find((node) => node.id === invalid.to)?.title ?? invalid.to;
    return fail(
      `${from} cannot send directly to ${to}. Follow trigger, action, data, then result.`,
    );
  }
  for (const edge of requiredFlowEdges) {
    if (!keys.includes(edge)) {
      const [from, to] = edge.split('>');
      return fail(
        `Signal stops at ${flowNodes.find((node) => node.id === from)!.title}. Connect it to ${flowNodes.find((node) => node.id === to)!.title}.`,
      );
    }
  }
  return pass('Refresh reaches the data and updates the visible queue choices.');
}

export const walkthroughs = [
  {
    id: 'mali',
    name: 'Mali',
    role: 'Student',
    issueId: 'crowded-choices',
    target: 'queue',
    mission: 'Compare two queues without mixing up the rows.',
    problem: 'The queue cards feel crowded. I need a clear gap between choices.',
    fixLabel: 'Give queue cards more space',
  },
  {
    id: 'ken',
    name: 'Ken',
    role: 'Campus runner',
    issueId: 'freshness-first',
    target: 'updated',
    mission: 'Check the update time before trusting a wait estimate.',
    problem: 'I saw the wait first and missed how old it was. Show freshness before choices.',
    fixLabel: 'Move update time before queues',
  },
  {
    id: 'noa',
    name: 'Noa',
    role: 'Canteen staff',
    issueId: 'staff-update',
    target: 'staff',
    mission: 'Publish a changed queue and see it reach the visitor screen.',
    problem:
      'My report does not reach the board. Connect staff reports through Save update to data.',
    fixLabel: 'Connect the staff update path',
  },
] as const;
export type WalkthroughIssueId = (typeof walkthroughs)[number]['issueId'];

export function checkPersonaWalkthrough(id: NpcId, draft: GameDraft): StageCheck {
  const design = checkScreenDesign(draft);
  if (!design.valid) return design;
  const flow = checkConnections(draft);
  if (!flow.valid) return flow;
  const walkthrough = walkthroughs.find((item) => item.id === id)!;
  if (id === 'mali' && draft.design.spacing < 12) return fail(walkthrough.problem);
  if (id === 'ken') {
    const update = draft.design.blocks.find((block) => block.kind === 'updated')!;
    const queue = draft.design.blocks.find((block) => block.kind === 'queue')!;
    if (update.y >= queue.y) return fail(walkthrough.problem);
  }
  if (id === 'noa') {
    const edges = new Set(draft.connect.links.map((link) => flowEdgeKey(link.from, link.to)));
    if (!staffFlowEdges.every((edge) => edges.has(edge))) return fail(walkthrough.problem);
  }
  return pass(`${walkthrough.name} can finish the task in this simulated walkthrough.`);
}

export function applyWalkthroughFix(
  issueId: WalkthroughIssueId,
  draft: GameDraft,
): Partial<GameDraft> {
  const launch = {
    ...draft.launch,
    shipped: false,
    testRun: [],
    fixedIssueIds: [...new Set([...draft.launch.fixedIssueIds, issueId])],
  };
  if (!checkScreenDesign(draft).valid)
    return { launch: { ...draft.launch, testRun: [], shipped: false } };
  const freshnessFirst =
    draft.design.blocks.find((block) => block.kind === 'updated')!.y <
    draft.design.blocks.find((block) => block.kind === 'queue')!.y;
  if (issueId === 'crowded-choices')
    return { design: arrangeScreen({ ...draft.design, spacing: 12 }, freshnessFirst), launch };
  if (issueId === 'freshness-first') return { design: arrangeScreen(draft.design, true), launch };
  const keys = new Set(draft.connect.links.map((link) => flowEdgeKey(link.from, link.to)));
  return {
    connect: {
      links: [
        ...draft.connect.links,
        ...staffFlowEdges
          .filter((edge) => !keys.has(edge))
          .map((edge) => {
            const [from, to] = edge.split('>');
            return { from, to };
          }),
      ],
    },
    launch,
  };
}

export function checkPrototypeReadyToShip(draft: GameDraft): StageCheck {
  for (const persona of walkthroughs) {
    const result = checkPersonaWalkthrough(persona.id, draft);
    if (!result.valid) return result;
    if (!draft.launch.testRun.includes(persona.id))
      return fail(`Run ${persona.name}'s walkthrough on the current prototype.`);
  }
  return pass('All three simulated walkthroughs pass. Your in-app prototype is ready to ship.');
}

export function checkBuildStage(stageId: StageId, draft: GameDraft): StageCheck {
  if (stageId === 'design') return checkScreenDesign(draft);
  if (stageId === 'connect') {
    const design = checkScreenDesign(draft);
    return design.valid ? checkConnections(draft) : design;
  }
  if (stageId === 'launch') {
    const ready = checkPrototypeReadyToShip(draft);
    return ready.valid && !draft.launch.shipped
      ? fail('Ship your tested in-app prototype.')
      : ready;
  }
  return fail('This is a research stage.');
}

export function buildPrototypeArtifact(draft: GameDraft): string {
  return [
    `# ${draft.projectName || 'My queue prototype'}`,
    '',
    'A playable in-app prototype made in ShipingIT. No public deployment is implied.',
    'All characters, queue numbers and walkthrough results are simulated, not real-world validation.',
    '',
    '## Insight',
    draft.insight.statement.trim() || insightSentence(draft.insight.slots),
    '',
    '## Scope',
    ...draft.scope.featureIds.map((id) => `- ${id}`),
    '',
    '## Screen',
    `Accent: ${draft.design.accent}; corners: ${draft.design.radius}; spacing: ${draft.design.spacing}; alignment: ${draft.design.alignment}.`,
    ...draft.design.blocks.map((block) => `- ${block.kind}: (${block.x}, ${block.y})`),
    '',
    '## Connections',
    ...draft.connect.links.map((link) => `- ${link.from} -> ${link.to}`),
    '',
    '## Simulated walkthroughs',
    ...walkthroughs.map((persona) => {
      const checked =
        draft.launch.testRun.includes(persona.id) &&
        checkPersonaWalkthrough(persona.id, draft).valid;
      return `- ${persona.name}: ${checked ? 'passed on current prototype' : 'not yet passed'}`;
    }),
    '',
    `Shipped in app: ${draft.launch.shipped && checkPrototypeReadyToShip(draft).valid ? 'yes' : 'no'}`,
    'Next real-world step: ask permission to observe queue choices and test this proposal with real people.',
  ].join('\n');
}

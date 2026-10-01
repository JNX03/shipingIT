import assert from 'node:assert/strict';
import test from 'node:test';
import { createDragTutorialController, DRAG_TUTORIAL_STORAGE_KEY } from './drag-tutorial';

test('only the first actual draggable claims the tutorial and leaving releases an uncompleted claim', async () => {
  const controller = createDragTutorialController({ getItem: async () => null, setItem: async () => {} });
  assert.deepEqual(await Promise.all([controller.claim('first'), controller.claim('second')]), [true, false]);
  assert.equal(controller.visible('first'), true);
  controller.release('first');
  assert.equal(await controller.claim('second'), true);
});
test('an actual interaction dismisses the tutorial once and persists only its own marker', async () => {
  const writes: string[] = [];
  const controller = createDragTutorialController({ getItem: async () => null, setItem: async (key) => { writes.push(key); } });
  await controller.claim('piece');
  await controller.complete('other');
  assert.equal(controller.visible('piece'), true);
  await controller.complete('piece');
  await controller.complete('piece');
  assert.deepEqual(writes, [DRAG_TUTORIAL_STORAGE_KEY]);
  assert.equal(await controller.claim('next-piece'), false);
});
test('cold seen markers and failed reads never show or overwrite a first-use tutorial', async () => {
  for (const getItem of [async () => 'seen', async () => { throw new Error('unread'); }]) {
    let writes = 0;
    const controller = createDragTutorialController({ getItem, setItem: async () => { writes++; } });
    assert.equal(await controller.claim('piece'), false);
    await controller.complete('piece');
    assert.equal(writes, 0);
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const queryString = require('query-string');

test('security-fixed decoder remains compatible with Expo Router query parsing', () => {
  assert.deepEqual(
    { ...queryString.parse('id=discover-1&xp=20&title=hello%20world') },
    {
      id: 'discover-1',
      xp: '20',
      title: 'hello world',
    },
  );
  assert.equal(
    queryString.stringify({ id: 'scope-2', note: 'a & b' }),
    'id=scope-2&note=a%20%26%20b',
  );
  assert.doesNotThrow(() => queryString.parse('value=%E0%A4%A%FF%FE'));
});
test('xcode configuration can generate an ID with the fixed uuid library', () => {
  const project = require('xcode').project('unused');
  project.hash = { project: { objects: {} } };
  assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../utils/scheduleSelection.js'), 'utf8');
const modulePromise = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const response = (groups, source = 'api') => ({ data: { groups }, source });
const courses = [-1, 1, 2, 3, 4, 5].map(id => ({ id }));
const resolve = async (overrides = {}) => (await modulePromise).resolveScheduleSelection({
  course: 1, group: '125-1-2', result: response(['other']), courses,
  getGroups: async id => response(id === 2 ? ['125-1-2'] : []), isCurrent: () => true,
  ...overrides,
});

test('moves the exact group from course 1 to API-confirmed course 2', async () => {
  const result = await resolve();
  assert.equal(result.course, 2);
  assert.equal(result.group, '125-1-2');
});
test('does not infer course from group number and can find a later course', async () => {
  const result = await resolve({ group: 'non-numeric', getGroups: async id => response(id === 4 ? ['non-numeric'] : []) });
  assert.equal(result.course, 4);
});
test('does not replace a missing saved group with an arbitrary first group', async () => {
  assert.equal((await resolve({ getGroups: async () => response(['other']) })).group, null);
});
test('cache absence never initiates migration; offline selection is retained', async () => {
  const result = await resolve({ result: response(['other'], 'stale_cache'), getGroups: () => assert.fail('must not probe') });
  assert.equal(result.course, 1);
  assert.equal(result.group, '125-1-2');
});
test('cached target list is not confirmation for migration', async () => {
  const result = await resolve({ getGroups: async () => response(['125-1-2'], 'cache') });
  assert.equal(result.course, 1);
  assert.equal(result.group, null);
});
test('stale request cannot return a migration after manual selection', async () => {
  let current = true;
  const result = await resolve({ isCurrent: () => current, getGroups: async () => {
    current = false;
    return response(['125-1-2']);
  } });
  assert.equal(result, null);
});
test('existing selection does not probe or move', async () => {
  const result = await resolve({ result: response(['125-1-2']), getGroups: () => assert.fail('must not probe') });
  assert.equal(result.course, 1);
});
test('no saved preference may select the first available group', async () => {
  assert.equal((await resolve({ group: null })).group, 'other');
});
test('accepts array response and proxy confirmation; ignores malformed groups', async () => {
  const { getScheduleGroups } = await modulePromise;
  assert.deepEqual(getScheduleGroups({ data: ['a', null, 2, ''] }), ['a']);
  assert.equal((await resolve({ getGroups: async () => ({ data: ['125-1-2'], source: 'proxy' }) })).course, 2);
});

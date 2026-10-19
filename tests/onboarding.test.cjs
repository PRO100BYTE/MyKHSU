const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../utils/onboarding.js'), 'utf8');
const modulePromise = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const storage = () => {
  const values = new Map();
  return {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
    removeItem: async key => values.delete(key),
  };
};

test('onboarding completion is versioned and initially absent', async () => {
  const { isOnboardingCompleted, ONBOARDING_STORAGE_KEY } = await modulePromise;
  const store = storage();
  assert.equal(await isOnboardingCompleted(store), false);
  await store.setItem(ONBOARDING_STORAGE_KEY, 'true');
  assert.equal(await isOnboardingCompleted(store), true);
});

test('completion and reset are explicit and round-trip', async () => {
  const { completeOnboarding, resetOnboarding, isOnboardingCompleted } = await modulePromise;
  const store = storage();
  await completeOnboarding(store);
  assert.equal(await isOnboardingCompleted(store), true);
  await resetOnboarding(store);
  assert.equal(await isOnboardingCompleted(store), false);
});

test('read failures fail closed and write failures are reported', async () => {
  const { isOnboardingCompleted, completeOnboarding } = await modulePromise;
  assert.equal(await isOnboardingCompleted({ getItem: async () => { throw new Error('read'); } }), false);
  await assert.rejects(() => completeOnboarding(null), /ONBOARDING_STORAGE_UNAVAILABLE/);
});

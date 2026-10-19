export const ONBOARDING_VERSION = '1';
export const ONBOARDING_STORAGE_KEY = `onboarding_completed_v${ONBOARDING_VERSION}`;

const usableStorage = storage => storage && typeof storage.getItem === 'function' &&
  typeof storage.setItem === 'function';

export const isOnboardingCompleted = async storage => {
  if (!usableStorage(storage)) return false;
  try {
    return (await storage.getItem(ONBOARDING_STORAGE_KEY)) === 'true';
  } catch (error) {
    console.error('Error reading onboarding state:', error);
    return false;
  }
};

export const completeOnboarding = async storage => {
  if (!usableStorage(storage)) throw new Error('ONBOARDING_STORAGE_UNAVAILABLE');
  await storage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  return true;
};

export const resetOnboarding = async storage => {
  if (!usableStorage(storage)) throw new Error('ONBOARDING_STORAGE_UNAVAILABLE');
  if (typeof storage.removeItem === 'function') {
    await storage.removeItem(ONBOARDING_STORAGE_KEY);
  } else {
    await storage.setItem(ONBOARDING_STORAGE_KEY, 'false');
  }
  return true;
};

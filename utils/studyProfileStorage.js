import AsyncStorage from '@react-native-async-storage/async-storage';

const STUDY_PROFILE_KEY = 'study_profile_v1';

const defaultProfile = {
  targetAttendance: 85,
  weeklyStudyTargetHours: 12,
};

export const loadStudyProfile = async () => {
  try {
    const raw = await AsyncStorage.getItem(STUDY_PROFILE_KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw);
    return {
      ...defaultProfile,
      ...parsed,
    };
  } catch {
    return defaultProfile;
  }
};

export const saveStudyProfile = async (profile) => {
  const next = {
    ...defaultProfile,
    ...(profile || {}),
  };
  await AsyncStorage.setItem(STUDY_PROFILE_KEY, JSON.stringify(next));
  return next;
};

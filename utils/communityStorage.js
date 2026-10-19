import AsyncStorage from '@react-native-async-storage/async-storage';

const COMMUNITY_DRAFTS_KEY = 'community_drafts_v1';
const COMMUNITY_FEEDBACK_KEY = 'community_feedback_v1';

const readList = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getCommunityDrafts = () => readList(COMMUNITY_DRAFTS_KEY);

export const saveCommunityDraft = async ({ title, text }) => {
  const normalizedTitle = String(title || '').trim();
  const normalizedText = String(text || '').trim();
  if (!normalizedTitle || !normalizedText) {
    throw new Error('EMPTY_DRAFT');
  }

  const drafts = await getCommunityDrafts();
  const draft = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    title: normalizedTitle,
    text: normalizedText,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(COMMUNITY_DRAFTS_KEY, JSON.stringify([draft, ...drafts].slice(0, 20)));
  return draft;
};

export const getTeacherFeedback = () => readList(COMMUNITY_FEEDBACK_KEY);

export const saveTeacherFeedback = async ({ teacher, rating, comment }) => {
  const normalizedTeacher = String(teacher || '').trim();
  const normalizedComment = String(comment || '').trim();
  const normalizedRating = Math.min(5, Math.max(1, Number(rating) || 0));
  if (!normalizedTeacher || !normalizedComment || !normalizedRating) {
    throw new Error('INVALID_FEEDBACK');
  }

  const feedback = await getTeacherFeedback();
  const entry = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    teacher: normalizedTeacher,
    rating: normalizedRating,
    comment: normalizedComment,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(COMMUNITY_FEEDBACK_KEY, JSON.stringify([entry, ...feedback].slice(0, 20)));
  return entry;
};

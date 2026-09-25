import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'schedule_favorites';

export const getFavorites = async () => {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveFavorites = async (list) => {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving favorites:', e);
  }
};

export const addFavorite = async (favorite) => {
  const list = await getFavorites();
  if (list.some(f => f.id === favorite.id)) return false;
  await saveFavorites([...list, favorite]);
  return true;
};

export const removeFavorite = async (id) => {
  const list = await getFavorites();
  await saveFavorites(list.filter(f => f.id !== id));
};

export const isFavorite = async (id) => {
  const list = await getFavorites();
  return list.some(f => f.id === id);
};

/**
 * Строит уникальный ID для избранного элемента
 */
export const buildFavoriteId = (type, data) => {
  if (type === 'student') return `student__${data.group || ''}`;
  if (type === 'teacher') return `teacher__${data.teacherName || ''}`;
  if (type === 'auditory') return `auditory__${data.auditoryName || ''}`;
  return '';
};

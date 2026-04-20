import AsyncStorage from '@react-native-async-storage/async-storage';

const ACHIEVEMENTS_KEY = 'user_achievements';

// Определения всех ачивок
export const ACHIEVEMENT_DEFINITIONS = {
  first_note: {
    id: 'first_note',
    title: 'Первая заметка',
    description: 'Создай свою первую заметку к занятию',
    icon: 'document-text',
    color: '#10B981',
    rarity: 'common',
  },
  homework_master: {
    id: 'homework_master',
    title: 'Домашний мастер',
    description: 'Запиши 10 домашних заданий',
    icon: 'school',
    color: '#3B82F6',
    rarity: 'uncommon',
  },
  early_bird: {
    id: 'early_bird',
    title: 'Ранняя пташка',
    description: 'Открой приложение до 7:00 утра',
    icon: 'sunny',
    color: '#F59E0B',
    rarity: 'uncommon',
  },
  night_owl: {
    id: 'night_owl',
    title: 'Ночная сова',
    description: 'Открой приложение после полуночи',
    icon: 'moon',
    color: '#8B5CF6',
    rarity: 'uncommon',
  },
  schedule_addict: {
    id: 'schedule_addict',
    title: 'Заядлый планировщик',
    description: 'Проверь расписание 7 дней подряд',
    icon: 'calendar',
    color: '#EF4444',
    rarity: 'rare',
  },
  explorer: {
    id: 'explorer',
    title: 'Исследователь',
    description: 'Посети все разделы приложения',
    icon: 'compass',
    color: '#06B6D4',
    rarity: 'uncommon',
  },
  map_navigator: {
    id: 'map_navigator',
    title: 'Навигатор',
    description: 'Открой карту и найди корпус ХГУ',
    icon: 'map',
    color: '#14B8A6',
    rarity: 'common',
  },
  news_reader: {
    id: 'news_reader',
    title: 'В курсе событий',
    description: 'Прочитай 5 новостей',
    icon: 'newspaper',
    color: '#F97316',
    rarity: 'uncommon',
  },
  developer_mode: {
    id: 'developer_mode',
    title: 'Хакер',
    description: 'Активируй режим разработчика',
    icon: 'code-slash',
    color: '#10B981',
    rarity: 'rare',
  },
  theme_changer: {
    id: 'theme_changer',
    title: 'Стилист',
    description: 'Смени тему оформления',
    icon: 'color-palette',
    color: '#EC4899',
    rarity: 'common',
  },
  // Секретная пасхалка
  konami_code: {
    id: 'konami_code',
    title: '???',
    description: 'Найди секрет...',
    icon: 'help',
    color: '#6366F1',
    rarity: 'legendary',
    secret: true,
    // Реальные данные, раскрывающиеся после получения:
    realTitle: 'За гранью кода',
    realDescription: 'Ты нашёл то, что не должен был найти. Или наоборот?',
    realIcon: 'eye',
  },
};

// Описания редкости
export const RARITY_INFO = {
  common: { label: 'Обычная', color: '#9CA3AF' },
  uncommon: { label: 'Необычная', color: '#10B981' },
  rare: { label: 'Редкая', color: '#3B82F6' },
  legendary: { label: 'Легендарная', color: '#F59E0B' },
};

// Загрузить все полученные ачивки
export const loadAchievements = async () => {
  try {
    const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// Разблокировать ачивку
export const unlockAchievement = async (achievementId) => {
  const def = ACHIEVEMENT_DEFINITIONS[achievementId];
  if (!def) return null;

  const achievements = await loadAchievements();
  if (achievements[achievementId]) return null; // уже получена

  achievements[achievementId] = {
    unlockedAt: Date.now(),
  };
  await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  return def;
};

// Проверить, получена ли ачивка
export const isAchievementUnlocked = async (achievementId) => {
  const achievements = await loadAchievements();
  return !!achievements[achievementId];
};

// Получить полный список ачивок с состояниями
export const getAchievementsList = async () => {
  const achievements = await loadAchievements();
  return Object.values(ACHIEVEMENT_DEFINITIONS).map(def => ({
    ...def,
    unlocked: !!achievements[def.id],
    unlockedAt: achievements[def.id]?.unlockedAt || null,
    // Для секретных: показываем реальные данные только если разблокировали
    title: def.secret && !achievements[def.id] ? def.title : (def.realTitle || def.title),
    description: def.secret && !achievements[def.id] ? def.description : (def.realDescription || def.description),
    icon: def.secret && !achievements[def.id] ? def.icon : (def.realIcon || def.icon),
  }));
};

// Очистить все ачивки
export const clearAchievements = async () => {
  await AsyncStorage.removeItem(ACHIEVEMENTS_KEY);
};

// Счётчик полученных ачивок
export const getAchievementsCount = async () => {
  const achievements = await loadAchievements();
  const total = Object.keys(ACHIEVEMENT_DEFINITIONS).length;
  const unlocked = Object.keys(achievements).length;
  return { unlocked, total };
};

// Инкремент счётчиков для трекинга прогресса
const COUNTERS_KEY = 'achievement_counters';

export const incrementCounter = async (counterName) => {
  try {
    const raw = await AsyncStorage.getItem(COUNTERS_KEY);
    const counters = raw ? JSON.parse(raw) : {};
    counters[counterName] = (counters[counterName] || 0) + 1;
    await AsyncStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
    return counters[counterName];
  } catch {
    return 0;
  }
};

export const getCounter = async (counterName) => {
  try {
    const raw = await AsyncStorage.getItem(COUNTERS_KEY);
    const counters = raw ? JSON.parse(raw) : {};
    return counters[counterName] || 0;
  } catch {
    return 0;
  }
};

// Установить дату последнего визита (для streak)
const STREAK_KEY = 'achievement_streak';

export const recordDailyVisit = async () => {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    const data = raw ? JSON.parse(raw) : { lastDate: null, streak: 0 };
    const today = new Date().toISOString().split('T')[0];
    
    if (data.lastDate === today) return data.streak;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (data.lastDate === yesterdayStr) {
      data.streak += 1;
    } else {
      data.streak = 1;
    }
    data.lastDate = today;
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
    return data.streak;
  } catch {
    return 0;
  }
};

// Константы API
export const API_BASE_URL = 'https://t2iti.khsu.ru/api';
export const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 дней

// Цветовые схемы
export const ACCENT_COLORS = {
  green: {
    primary: '#10B981',
    light: '#ECFDF5',
    dark: '#047857',
    glass: 'rgba(16, 185, 129, 0.12)',
    glassBorder: 'rgba(16, 185, 129, 0.25)',
  },
  blue: {
    primary: '#3B82F6',
    light: '#DBEAFE',
    dark: '#1D4ED8',
    glass: 'rgba(59, 130, 246, 0.12)',
    glassBorder: 'rgba(59, 130, 246, 0.25)',
  },
  purple: {
    primary: '#8B5CF6',
    light: '#EDE9FE',
    dark: '#5B21B6',
    glass: 'rgba(139, 92, 246, 0.12)',
    glassBorder: 'rgba(139, 92, 246, 0.25)',
  }
};

// Liquid Glass тема (iOS 26)
export const LIQUID_GLASS = {
  light: {
    // Поверхности
    surfacePrimary: 'rgba(255, 255, 255, 0.72)',
    surfaceSecondary: 'rgba(255, 255, 255, 0.56)',
    surfaceTertiary: 'rgba(255, 255, 255, 0.40)',
    surfaceCard: 'rgba(255, 255, 255, 0.65)',
    // Фон
    background: '#f2f2f7',
    backgroundElevated: '#ffffff',
    // Границы
    border: 'rgba(0, 0, 0, 0.06)',
    borderStrong: 'rgba(0, 0, 0, 0.12)',
    // Текст
    text: '#1c1c1e',
    textSecondary: '#8e8e93',
    textTertiary: '#aeaeb2',
    // Навигация (glass)
    headerGlass: 'rgba(255, 255, 255, 0.78)',
    tabBarGlass: 'rgba(255, 255, 255, 0.72)',
    // Тени
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowStrong: 'rgba(0, 0, 0, 0.15)',
    // Blur интенсивность
    blurIntensity: 60,
    blurTint: 'systemChromeMaterialLight',
  },
  dark: {
    // Поверхности
    surfacePrimary: 'rgba(44, 44, 46, 0.72)',
    surfaceSecondary: 'rgba(44, 44, 46, 0.56)',
    surfaceTertiary: 'rgba(44, 44, 46, 0.40)',
    surfaceCard: 'rgba(44, 44, 46, 0.65)',
    // Фон
    background: '#000000',
    backgroundElevated: '#1c1c1e',
    // Границы
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    // Текст
    text: '#ffffff',
    textSecondary: '#8e8e93',
    textTertiary: '#636366',
    // Навигация (glass)
    headerGlass: 'rgba(30, 30, 30, 0.72)',
    tabBarGlass: 'rgba(30, 30, 30, 0.68)',
    // Тени
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowStrong: 'rgba(0, 0, 0, 0.5)',
    // Blur интенсивность
    blurIntensity: 80,
    blurTint: 'systemChromeMaterialDark',
  }
};

// Версия приложения
export const APP_VERSION = '2.3.0';
export const APP_DEVELOPERS = 'студентами группы 125-1 в составе команды PRO100BYTE Team';
export const APP_SUPPORTERS = 'ХГУ им. Н.Ф. Катанова и ООО "Скалк Софт"';
export const BUILD_VER = 'git-8693746';
export const BUILD_DATE = '02.03.2026';

// Дни недели
export const WEEKDAYS = [
  "Понедельник", 
  "Вторник", 
  "Среда", 
  "Четверг", 
  "Пятница", 
  "Суббота", 
  "Воскресенье"
];

// Названия экранов
export const SCREENS = {
  SCHEDULE: 'Расписание',
  MAP: 'Карта',
  FRESHMAN: 'Первокурснику',
  NEWS: 'Новости',
  SETTINGS: 'Настройки'
};

// Коды курсов
export const COURSES = [
  { id: -1, label: 'Магистратура' },
  { id: 1, label: '1 курс' },
  { id: 2, label: '2 курс' },
  { id: 3, label: '3 курс' },
  { id: 4, label: '4 курс' },
  { id: 5, label: '5 курс' }
];

// Режимы отображения расписания
export const SCHEDULE_VIEW_MODES = {
  DAY: 'day',
  WEEK: 'week'
};

// GitHub репозиторий
export const GITHUB_REPO_URL = 'https://github.com/PRO100BYTE/MyKHSU';

// Сообщения об ошибках
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Ошибка сети. Проверьте подключение к интернету.',
  SERVER_ERROR: 'Ошибка сервера. Попробуйте позже.',
  JSON_PARSE_ERROR: 'Ошибка обработки данных.',
  CACHE_ERROR: 'Ошибка работы с кэшем.'
};

// Ключи для хранения настроек
export const STORAGE_KEYS = {
  THEME: 'theme',
  ACCENT_COLOR: 'accentColor'
};

// Функция для получения новогоднего текста
export const getNewYearText = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // С 1 января по 31 января показываем "С новым {год} годом!"
  if (month === 1 && day >= 1 && day <= 31) {
    return `С новым ${year} годом!`;
  }
  
  // С 1 декабря по 31 декабря показываем "С наступающим {год+1} годом!"
  if (month === 12 && day >= 1 && day <= 31) {
    return `С наступающим ${year + 1} годом!`;
  }
  
  return '';
};

// Функция проверки новогоднего периода (для синхронизации с App.js)
export const isNewYearPeriod = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // Период с 1 декабря по 31 января
  return (month === 12 && day >= 1) || (month === 1 && day <= 31);
};
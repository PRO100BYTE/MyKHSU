// Константы API
export const API_BASE_URL = 'https://t2iti.khsu.ru/api';
export const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
export const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 дней

// Цветовые схемы
export const ACCENT_COLORS = {
  green: {
    primary: '#10B981',
    light: '#ECFDF5',
    dark: '#047857'
  },
  blue: {
    primary: '#3B82F6',
    light: '#DBEAFE',
    dark: '#1D4ED8'
  },
  purple: {
    primary: '#8B5CF6',
    light: '#EDE9FE',
    dark: '#5B21B6'
  }
};

// Версия приложения
export const APP_VERSION = '2.2.6';
export const APP_DEVELOPERS = 'студентами группы 125-1 в составе команды PRO100BYTE Team';
export const APP_SUPPORTERS = 'ХГУ им. Н.Ф. Катанова и ООО "Скалк Софт"';
export const BUILD_VER = 'git-49ac7ce';
export const BUILD_DATE = '16.11.2025';

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
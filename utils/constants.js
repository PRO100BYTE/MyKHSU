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
  },
  orange: {
    primary: '#F97316',
    light: '#FFF7ED',
    dark: '#C2410C',
    glass: 'rgba(249, 115, 22, 0.12)',
    glassBorder: 'rgba(249, 115, 22, 0.25)',
  },
  matrix: {
    primary: '#00FF41',
    light: '#0D1A0F',
    dark: '#00CC33',
    glass: 'rgba(0, 255, 65, 0.12)',
    glassBorder: 'rgba(0, 255, 65, 0.25)',
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
    tabBarGlass: 'rgba(255, 255, 255, 0.45)',
    tabBarBlurIntensity: 40,
    tabBarBlurTint: 'systemThinMaterialLight',
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
    tabBarGlass: 'rgba(30, 30, 30, 0.40)',
    tabBarBlurIntensity: 50,
    tabBarBlurTint: 'systemThinMaterialDark',
    // Тени
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowStrong: 'rgba(0, 0, 0, 0.5)',
    // Blur интенсивность
    blurIntensity: 80,
    blurTint: 'systemChromeMaterialDark',
  },
  matrix: {
    // Поверхности
    surfacePrimary: 'rgba(13, 2, 8, 0.85)',
    surfaceSecondary: 'rgba(13, 2, 8, 0.70)',
    surfaceTertiary: 'rgba(0, 255, 65, 0.06)',
    surfaceCard: 'rgba(13, 2, 8, 0.80)',
    // Фон
    background: 'transparent',
    backgroundSolid: '#0D0208',
    backgroundElevated: '#0A0A0A',
    // Границы
    border: 'rgba(0, 255, 65, 0.12)',
    borderStrong: 'rgba(0, 255, 65, 0.25)',
    // Текст
    text: '#00FF41',
    textSecondary: '#00AA2A',
    textTertiary: '#006618',
    // Навигация (glass)
    headerGlass: 'rgba(13, 2, 8, 0.88)',
    tabBarGlass: 'rgba(13, 2, 8, 0.75)',
    tabBarBlurIntensity: 60,
    tabBarBlurTint: 'systemThinMaterialDark',
    // Тени
    shadowColor: 'rgba(0, 255, 65, 0.15)',
    shadowStrong: 'rgba(0, 255, 65, 0.3)',
    // Blur интенсивность
    blurIntensity: 80,
    blurTint: 'systemChromeMaterialDark',
  }
};

// Версия приложения
export const APP_VERSION = '2.3.1';
export const APP_DEVELOPERS = 'студентами группы 125-1 в составе команды PRO100BYTE Team';
export const APP_SUPPORTERS = 'ХГУ им. Н.Ф. Катанова и ООО "Скалк Софт"';
export const BUILD_VER = 'git-2e52816';
export const BUILD_DATE = '05.03.2026';

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

// Информация о текущем празднике (для сплэш-скрина и поздравлений)
export const getHolidayInfo = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // 25 января — День студента (Татьянин день)
  if (month === 1 && day === 25) {
    return { text: 'С Днём студента!', icon: 'school', type: 'student-day' };
  }

  // Новый год: 1–14 января
  if (month === 1 && day >= 1 && day <= 14) {
    return { text: `С новым ${year} годом!`, icon: 'sparkles', type: 'new-year' };
  }

  // 14 февраля — День святого Валентина
  if (month === 2 && day === 14) {
    return { text: 'С Днём святого Валентина!', icon: 'heart', type: 'valentines-day' };
  }

  // 23 февраля — День защитника Отечества
  if (month === 2 && day === 23) {
    return { text: 'С Днём защитника Отечества!', icon: 'shield', type: 'defender-day' };
  }

  // 8 марта — Международный женский день
  if (month === 3 && day === 8) {
    return { text: 'С 8 Марта!', icon: 'flower', type: 'womens-day' };
  }

  // 12 апреля — День космонавтики
  if (month === 4 && day === 12) {
    return { text: 'С Днём космонавтики!', icon: 'rocket', type: 'cosmonautics-day' };
  }

  // 1 мая — Праздник Весны и Труда
  if (month === 5 && day === 1) {
    return { text: 'С Праздником Весны и Труда!', icon: 'sunny', type: 'may-day' };
  }

  // 9 мая — День Победы
  if (month === 5 && day === 9) {
    return { text: 'С Днём Победы!', icon: 'star', type: 'victory-day' };
  }

  // 1 июня — День защиты детей
  if (month === 6 && day === 1) {
    return { text: 'С Днём защиты детей!', icon: 'happy', type: 'children-day' };
  }

  // 1 сентября — День знаний
  if (month === 9 && day === 1) {
    return { text: 'С Днём знаний!', icon: 'book', type: 'knowledge-day' };
  }

  // 3 сентября — Я календарь переверну 🎵
  if (month === 9 && day === 3) {
    return { text: 'Я календарь переверну...', icon: 'calendar', type: 'september-3' };
  }

  // День программиста — 256-й день года (13 или 12 сентября)
  const startOfYear = new Date(year, 0, 0);
  const diff = today - startOfYear;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (dayOfYear === 256) {
    return { text: 'С Днём программиста!', icon: 'code-slash', type: 'programmer-day' };
  }

  // День системного администратора — последняя пятница июля
  if (month === 7) {
    const lastDay = new Date(year, 7, 0);
    const lastFriday = new Date(lastDay);
    while (lastFriday.getDay() !== 5) {
      lastFriday.setDate(lastFriday.getDate() - 1);
    }
    if (day === lastFriday.getDate()) {
      return { text: 'С Днём сисадмина!', icon: 'server', type: 'sysadmin-day' };
    }
  }

  // 5 октября — День преподавателя
  if (month === 10 && day === 5) {
    return { text: 'С Днём преподавателя!', icon: 'easel', type: 'teacher-day' };
  }

  // 4 ноября — День народного единства
  if (month === 11 && day === 4) {
    return { text: 'С Днём народного единства!', icon: 'people', type: 'unity-day' };
  }

  // 17 ноября — Международный день студента
  if (month === 11 && day === 17) {
    return { text: 'С Международным днём студента!', icon: 'people', type: 'intl-student-day' };
  }

  // С наступающим Новым годом: 20–31 декабря
  if (month === 12 && day >= 20) {
    return { text: `С наступающим ${year + 1} годом!`, icon: 'sparkles', type: 'new-year' };
  }

  return null;
};
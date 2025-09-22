import { WEEKDAYS } from './constants';

// Определение номера недели (новая логика)
export const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Форматирование даты
export const formatDate = (date) => {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Получение даты по номеру недели и дню недели
export const getDateByWeekAndDay = (weekNumber, dayOfWeek) => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const firstMonday = new Date(yearStart);
  firstMonday.setDate(firstMonday.getDate() + (1 - firstMonday.getDay() + 7) % 7);
  
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7 + (dayOfWeek - 1));
  
  return targetDate;
};

// Проверка, является ли дата выходным (суббота или воскресенье)
export const isWeekend = (date) => {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};

// Получение первой даты недели
export const getFirstDayOfWeek = (date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

// Получение последней даты недели
export const getLastDayOfWeek = (date) => {
  const firstDay = getFirstDayOfWeek(date);
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);
  return lastDay;
};

// Форматирование диапазона дат недели
export const formatWeekRange = (weekNumber) => {
  const firstDay = getDateByWeekAndDay(weekNumber, 1);
  const lastDay = getDateByWeekAndDay(weekNumber, 7);
  return `${formatDate(firstDay)} - ${formatDate(lastDay)}`;
};

// Получение номера текущей недели
export const getCurrentWeekNumber = () => {
  return getWeekNumber(new Date());
};

// Добавление дней к дате
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getWeekDayName = (date) => {
  return WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
};
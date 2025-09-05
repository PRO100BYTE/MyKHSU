// utils/dateUtils.js

import { WEEKDAYS } from './constants';

// Определение номера недели
export const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getFullYear(), 8, 1)); // 1 сентября текущего года
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
  const yearStart = new Date(new Date().getFullYear(), 8, 1); // 1 сентября текущего года
  const firstMonday = new Date(yearStart);
  firstMonday.setDate(firstMonday.getDate() + (1 - firstMonday.getDay() + 7) % 7);
  
  const targetDate = new Date(firstMonday);
  targetDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7 + (dayOfWeek - 1));
  
  return targetDate;
};

// Получение названия дня недели по номеру
export const getWeekdayName = (dayNumber) => {
  return WEEKDAYS[dayNumber - 1] || 'Неизвестный день';
};

// Проверка, является ли дата сегодняшним днем
export const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
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

// Сравнение дат (без учета времени)
export const compareDates = (date1, date2) => {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1.getTime() - d2.getTime();
};
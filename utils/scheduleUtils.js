// utils/scheduleUtils.js

import { getDateByWeekAndDay } from './dateUtils';

// Проверка, является ли пара текущей
export const isCurrentLesson = (lesson, pairTime, currentTime, lessonDate = null) => {
  if (!pairTime || !lesson || !currentTime) return false;
  
  try {
    // Если передан lessonDate, используем его для проверки дня
    const checkDate = lessonDate || currentTime;
    
    // Проверяем, что дата пары совпадает с текущей датой
    const isSameDay = checkDate.getDate() === currentTime.getDate() &&
                     checkDate.getMonth() === currentTime.getMonth() &&
                     checkDate.getFullYear() === currentTime.getFullYear();
    
    if (!isSameDay) return false;
    
    const startTimeStr = pairTime.time_start || pairTime.start;
    const endTimeStr = pairTime.time_end || pairTime.end;
    
    if (!startTimeStr || !endTimeStr) return false;
    
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
    
    const startTime = new Date(currentTime);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date(currentTime);
    endTime.setHours(endHours, endMinutes, 0, 0);
    
    return currentTime >= startTime && currentTime <= endTime;
  } catch (error) {
    console.error('Error checking current lesson:', error);
    return false;
  }
};

// Получение даты для дня недели в недельном режиме
export const getLessonDateForWeek = (weekNumber, weekday, currentTime) => {
  try {
    return getDateByWeekAndDay(weekNumber, weekday);
  } catch (error) {
    console.error('Error getting lesson date for week:', error);
    return currentTime;
  }
};

// Проверка, является ли день текущим в недельном режиме
export const isCurrentDay = (weekNumber, weekday, currentTime) => {
  try {
    const lessonDate = getDateByWeekAndDay(weekNumber, weekday);
    return lessonDate.getDate() === currentTime.getDate() &&
           lessonDate.getMonth() === currentTime.getMonth() &&
           lessonDate.getFullYear() === currentTime.getFullYear();
  } catch (error) {
    console.error('Error checking current day:', error);
    return false;
  }
};

// Обработка данных групп
export const processGroupsData = (result) => {
  if (!result || !result.data) return [];
  
  const groupsData = result.data;
  
  if (Array.isArray(groupsData)) {
    return groupsData.filter(group => group && typeof group === 'string');
  }
  
  if (typeof groupsData === 'object' && groupsData.groups) {
    return Array.isArray(groupsData.groups) ? groupsData.groups : [];
  }
  
  return [];
};

// Получение стиля для текущей пары (исправленная версия)
export const getCurrentLessonStyle = (isCurrent, colors) => {
  if (isCurrent) {
    return {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20', // 20% прозрачности
      margin: 2,
      borderRadius: 8,
      padding: 12
    };
  }
  return {};
};
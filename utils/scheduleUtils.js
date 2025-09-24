import { getWeekNumber } from './dateUtils';

export const scheduleUtils = {
  // Обработка данных групп
  processGroupsData(result) {
    if (!result || !result.data) return [];
    
    const groupsData = result.data;
    
    if (Array.isArray(groupsData)) {
      return groupsData.filter(group => group && typeof group === 'string');
    }
    
    if (typeof groupsData === 'object') {
      return Object.values(groupsData).filter(group => group && typeof group === 'string');
    }
    
    return [];
  },

  // Обработка данных времени пар
  processPairsTimeData(result) {
    if (!result || !result.data) return [];
    
    const timeData = result.data;
    
    if (Array.isArray(timeData)) {
      return timeData;
    }
    
    if (timeData.pairs && Array.isArray(timeData.pairs)) {
      return timeData.pairs;
    }
    
    return [];
  },

  // Обработка данных расписания
  processScheduleData(result, currentDate) {
    if (!result || !result.data) {
      return { days: [], lessons: [] };
    }
    
    const scheduleData = result.data;
    
    if (scheduleData.days && Array.isArray(scheduleData.days)) {
      return scheduleData;
    }
    
    if (scheduleData.lessons && Array.isArray(scheduleData.lessons)) {
      const weekday = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
      return {
        days: [{ weekday, lessons: scheduleData.lessons }],
        lessons: scheduleData.lessons
      };
    }
    
    return { days: [], lessons: [] };
  },

  // Проверка, является ли пара текущей
  isCurrentLesson(lesson, pairTime, currentTime) {
    if (!pairTime || !lesson || !currentTime) return false;
    
    try {
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
  },

  // Получение стиля для пары
  getLessonStyle(lesson, pairTime, currentTime, theme, colors, cardBg, borderColor) {
    const isCurrent = this.isCurrentLesson(lesson, pairTime, currentTime);
    
    if (isCurrent) {
      return {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary,
        borderWidth: 2,
      };
    }
    
    return {
      backgroundColor: cardBg,
      borderColor: borderColor,
      borderWidth: 1,
    };
  },

  // Получение цвета текста для пары
  getLessonTextColor(lesson, pairTime, currentTime, colors, textColor) {
    const isCurrent = this.isCurrentLesson(lesson, pairTime, currentTime);
    return isCurrent ? colors.primary : textColor;
  }
};

export default scheduleUtils;
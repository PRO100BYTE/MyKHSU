import * as Calendar from 'expo-calendar';

export const CALENDAR_UNAVAILABLE_MESSAGE = 'В установленной сборке недоступен новый модуль календаря. Обновите приложение нативной сборкой с Expo SDK 58; перезагрузка JavaScript или OTA не добавляет нативные методы.';

const permission = async (method, writeOnly = false) => {
  if (typeof Calendar[method] !== 'function') return { status: 'unavailable', canAskAgain: false };
  try {
    return await Calendar[method](writeOnly);
  } catch (error) {
    if (/not available|unavailable|native module|undefined is not a function|not implemented/i.test(String(error?.message || error))) {
      return { status: 'unavailable', canAskAgain: false };
    }
    throw error;
  }
};

export const getCalendarPermission = () => permission('getCalendarPermissions', false);
export const requestCalendarPermission = () => permission('requestCalendarPermissions', false);

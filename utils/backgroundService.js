import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import ApiService from './api';
import notificationService from './notificationService';

const BACKGROUND_NEWS_CHECK = 'BACKGROUND_NEWS_CHECK';

// Регистрация фоновой задачи
TaskManager.defineTask(BACKGROUND_NEWS_CHECK, async () => {
  try {
    console.log('Background news check running...');
    
    // Проверяем настройки уведомлений
    const settings = await notificationService.getNotificationSettings();
    
    if (!settings.enabled || !settings.news) {
      return;
    }

    // Загружаем свежие новости
    const result = await ApiService.getNews(0, 5);
    
    if (result.data && result.data.length > 0) {
      // Проверяем наличие новых новостей
      await notificationService.checkForNewNews(result.data);
    }
    
    console.log('Background news check completed');
  } catch (error) {
    console.error('Background news check error:', error);
  }
});

// Регистрация периодической фоновой задачи
export const registerBackgroundNewsCheck = async () => {
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NEWS_CHECK, {
      minimumInterval: 15 * 60, // 15 минут
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background news check registered');
  } catch (error) {
    console.error('Error registering background news check:', error);
  }
};

// Отмена фоновой задачи
export const unregisterBackgroundNewsCheck = async () => {
  try {
    await Notifications.unregisterTaskAsync(BACKGROUND_NEWS_CHECK);
    console.log('Background news check unregistered');
  } catch (error) {
    console.error('Error unregistering background news check:', error);
  }
};

export default {
  registerBackgroundNewsCheck,
  unregisterBackgroundNewsCheck,
  checkForNewsNotifications: async () => {
    try {
      const result = await ApiService.getNews(0, 5);
      if (result.data && result.data.length > 0) {
        await notificationService.checkForNewNews(result.data);
      }
    } catch (error) {
      console.error('Error checking for news notifications:', error);
    }
  }
};
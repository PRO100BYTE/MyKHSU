import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
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
      return BackgroundFetch.Result.NoData;
    }

    // Загружаем свежие новости
    const result = await ApiService.getNews(0, 5);
    
    if (result.data && result.data.length > 0) {
      await notificationService.checkForNewNews(result.data);
    }
    
    console.log('Background news check completed');
    return BackgroundFetch.Result.NewData;
  } catch (error) {
    console.error('Background news check error:', error);
    return BackgroundFetch.Result.Failed;
  }
});

// Регистрация периодической фоновой задачи
export const registerBackgroundNewsCheck = async () => {
  try {
    // Для Android используем BackgroundFetch
    if (Platform.OS === 'android') {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NEWS_CHECK, {
        minimumInterval: 15 * 60, // 15 минут
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
    
    // Для iOS используем Notifications
    if (Platform.OS === 'ios') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Фоновая проверка новостей',
          body: 'Приложение будет проверять новости в фоне',
        },
        trigger: {
          type: 'timeInterval',
          seconds: 15 * 60, // 15 минут
          repeats: true,
        },
      });
    }
    
    console.log('Background news check registered');
  } catch (error) {
    console.error('Error registering background news check:', error);
  }
};

export default {
  registerBackgroundNewsCheck,
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
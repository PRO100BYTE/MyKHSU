import { getWithExpiry, setWithExpiry } from './cache';
import ApiService from './api';
import * as Notifications from 'expo-notifications';

// Конфигурация уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NewsNotificationService {
  static async checkForNewNews() {
    try {
      // Получаем информацию о новых новостях
      const newNewsInfo = await ApiService.getNewNewsInfo();
      
      if (newNewsInfo && newNewsInfo.count > 0) {
        // Проверяем, не показывали ли мы уже уведомление для этой новости
        const lastNotifiedNews = await getWithExpiry('last_notified_news');
        const latestNews = newNewsInfo.latestNews;
        
        if (!lastNotifiedNews || lastNotifiedNews.date !== latestNews.date) {
          // Показываем уведомление
          await this.showNewsNotification(newNewsInfo.count, latestNews);
          
          // Сохраняем информацию о показанном уведомлении
          await setWithExpiry('last_notified_news', latestNews, 24 * 60 * 60 * 1000);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for new news:', error);
      return false;
    }
  }

  static async showNewsNotification(count, latestNews) {
    try {
      const notificationContent = {
        title: count === 1 ? 'Новая новость' : `Новые новости: ${count}`,
        body: latestNews.content.length > 100 
          ? latestNews.content.substring(0, 100) + '...' 
          : latestNews.content,
        data: { newsDate: latestNews.date, type: 'new_news' },
        sound: true,
        badge: count,
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Отправляем немедленно
      });

      console.log('News notification scheduled');
    } catch (error) {
      console.error('Error showing news notification:', error);
    }
  }

  static async setupBackgroundCheck() {
    // Эта функция будет вызываться периодически для проверки новых новостей
    try {
      // Загружаем свежие новости для проверки
      const result = await ApiService.getNews(0, 5);
      
      if (result.source === 'api' || result.source === 'proxy') {
        // Новости были загружены с сервера - проверяем наличие новых
        await ApiService.checkForNewNews(result.data);
        await this.checkForNewNews();
      }
    } catch (error) {
      console.error('Error in background news check:', error);
    }
  }

  static async initializeNewsTracking() {
    // Инициализация отслеживания новостей
    try {
      // Загружаем текущие новости для начального состояния
      const result = await ApiService.getNews(0, 5);
      if (result.data && result.data.length > 0) {
        await setWithExpiry('news_latest', result.data.slice(0, 3), 24 * 60 * 60 * 1000);
        await setWithExpiry('news_last_check', Date.now(), 24 * 60 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error initializing news tracking:', error);
    }
  }
}

export default NewsNotificationService;
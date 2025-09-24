import { API_BASE_URL, CORS_PROXY } from './constants';
import { getWithExpiry, setWithExpiry } from './cache';
import NetInfo from '@react-native-community/netinfo';

class ApiService {
  constructor() {
    this.timeout = 10000;
  }

  // Универсальный метод для запросов
  async makeRequest(url, options = {}, useCache = true, cacheKey = null, cacheTTL = null) {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected;
    
    const finalCacheKey = cacheKey || `api_${btoa(url)}`;
    
    // Пытаемся получить данные из кэша
    if (useCache) {
      try {
        const cachedData = await getWithExpiry(finalCacheKey);
        if (cachedData) {
          return {
            data: cachedData,
            source: 'cache',
            cacheInfo: { cacheDate: new Date().toISOString() }
          };
        }
      } catch (cacheError) {
        console.error('Cache read error:', cacheError);
      }
    }
    
    // Если нет интернета, возвращаем ошибку
    if (!isOnline) {
      throw new Error('NO_INTERNET');
    }
    
    // Пытаемся сделать прямой запрос
    try {
      const response = await this.fetchWithTimeout(url, options);
      const data = await this.safeJsonParse(response);
      
      // Кэшируем успешный ответ
      if (useCache) {
        try {
          await setWithExpiry(finalCacheKey, data, cacheTTL);
        } catch (cacheError) {
          console.error('Cache write error:', cacheError);
        }
      }
      
      return {
        data,
        source: 'api',
        cacheInfo: null
      };
    } catch (directError) {
      console.log('Direct request failed, trying CORS proxy...');
      
      // Пытаемся через CORS прокси
      try {
        const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        const response = await this.fetchWithTimeout(proxyUrl, options);
        const data = await this.safeJsonParse(response);
        
        // Кэшируем успешный ответ
        if (useCache) {
          try {
            await setWithExpiry(finalCacheKey, data, cacheTTL);
          } catch (cacheError) {
            console.error('Cache write error:', cacheError);
          }
        }
        
        return {
          data,
          source: 'proxy',
          cacheInfo: null
        };
      } catch (proxyError) {
        console.log('CORS proxy also failed');
        
        // Если всё провалилось, пробуем вернуть кэш (даже просроченный)
        if (useCache) {
          try {
            const cachedData = await getWithExpiry(finalCacheKey);
            if (cachedData) {
              return {
                data: cachedData,
                source: 'stale_cache',
                cacheInfo: { cacheDate: new Date().toISOString() }
              };
            }
          } catch (cacheError) {
            console.error('Cache read error:', cacheError);
          }
        }
        
        throw new Error('API_UNAVAILABLE');
      }
    }
  }

  // Улучшенный метод для загрузки новостей с умным кэшированием
  async getNews(from = 0, amount = 10) {
    const url = `${API_BASE_URL}/news?amount=${amount}&from=${from}`;
    const cacheKey = `news_${from}_${amount}`;
    
    try {
      const result = await this.makeRequest(url, {}, true, cacheKey, 30 * 60 * 1000); // 30 минут
      
      // Дополнительная обработка для новостей: проверка новых и обновление кэша
      if (from === 0 && result.data && Array.isArray(result.data)) {
        await this.processNewsUpdate(result.data);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Обработка обновления новостей для умного кэширования
  async processNewsUpdate(currentNews) {
    if (!currentNews || currentNews.length === 0) return;
    
    try {
      // Получаем последние закэшированные новости
      const lastCachedNews = await getWithExpiry('news_latest');
      const lastNewsCheck = await getWithExpiry('news_last_check');
      
      // Фильтруем пустые новости
      const filteredNews = currentNews.filter(item => item.content && item.content.trim() !== "");
      
      // Сохраняем текущие новости как последние
      await setWithExpiry('news_latest', filteredNews.slice(0, 5), 24 * 60 * 60 * 1000);
      await setWithExpiry('news_last_check', Date.now(), 24 * 60 * 60 * 1000);
      
      // Если есть предыдущие новости, проверяем наличие новых
      if (lastCachedNews && lastCachedNews.length > 0) {
        const newNewsCount = this.detectNewNews(filteredNews, lastCachedNews);
        
        if (newNewsCount > 0) {
          // Сохраняем информацию о новых новостях для уведомлений
          await setWithExpiry('new_news_detected', {
            count: newNewsCount,
            detectedAt: Date.now(),
            latestNews: filteredNews[0]
          }, 24 * 60 * 60 * 1000);
          
          console.log(`Detected ${newNewsCount} new news items`);
        }
      }
    } catch (error) {
      console.error('Error processing news update:', error);
    }
  }

  // Обнаружение новых новостей путем сравнения с предыдущими
  detectNewNews(currentNews, previousNews) {
    if (!previousNews || previousNews.length === 0) return currentNews.length;
    
    // Создаем набор уникальных идентификаторов предыдущих новостей
    const previousNewsSet = new Set();
    previousNews.forEach(news => {
      const key = this.createNewsKey(news);
      previousNewsSet.add(key);
    });
    
    // Считаем новые новости
    let newCount = 0;
    for (const news of currentNews) {
      const key = this.createNewsKey(news);
      if (!previousNewsSet.has(key)) {
        newCount++;
      } else {
        // Новости отсортированы от новых к старым, поэтому можно прервать
        break;
      }
    }
    
    return newCount;
  }

  // Создание уникального ключа для новости
  createNewsKey(news) {
    return `${news.date}_${news.content.substring(0, 100)}`;
  }

  // Метод для получения информации о новых новостях (для уведомлений)
  async getNewNewsInfo() {
    return await getWithExpiry('new_news_detected');
  }

  // Метод для отметки новостей как прочитанных
  async markNewsAsRead() {
    const latestNews = await getWithExpiry('news_latest');
    if (latestNews && latestNews.length > 0) {
      await setWithExpiry('news_read', latestNews[0].date, 24 * 60 * 60 * 1000);
      await setWithExpiry('new_news_detected', null);
    }
  }

  // Метод для загрузки групп
  async getGroups(course) {
    const url = `${API_BASE_URL}/getgroups/${course}`;
    return this.makeRequest(url, {}, true, `groups_${course}`, 24 * 60 * 60 * 1000);
  }

  // Метод для загрузки расписания
  async getSchedule(group, date, week = null) {
    let url;
    let cacheKey;
    
    if (week) {
      url = `${API_BASE_URL}/getpairsweek?type=group&data=${group}&week=${week}`;
      cacheKey = `schedule_${group}_week_${week}`;
    } else {
      const formattedDate = this.formatDate(date);
      url = `${API_BASE_URL}/getpairs/date:${group}:${formattedDate}`;
      cacheKey = `schedule_${group}_date_${formattedDate}`;
    }
    
    return this.makeRequest(url, {}, true, cacheKey, 60 * 60 * 1000);
  }

  // Метод для загрузки времени пар
  async getPairsTime() {
    const url = `${API_BASE_URL}/getpairstime`;
    return this.makeRequest(url, {}, true, 'pairs_time', 7 * 24 * 60 * 60 * 1000);
  }

  // Вспомогательный метод для форматирования даты
  formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\./g, '.');
  }

  // Метод для запросов с таймаутом
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Безопасный парсинг JSON
  async safeJsonParse(response) {
    try {
      const text = await response.text();
      
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('HTML_RESPONSE');
      }
      
      if (!text.trim()) {
        throw new Error('EMPTY_RESPONSE');
      }
      
      try {
        const data = JSON.parse(text);
        
        // Дополнительная проверка для новостей
        if (text.includes('/news')) {
          if (!Array.isArray(data)) {
            throw new Error('INVALID_NEWS_FORMAT');
          }
        }
        
        return data;
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        throw new Error('INVALID_JSON');
      }
    } catch (error) {
      console.error('Error in safeJsonParse:', error);
      throw error;
    }
  }

    // Метод для загрузки расписания преподавателя
    async getTeacherSchedule(teacherName, week = null) {
    const encodedTeacherName = encodeURIComponent(teacherName);
    let url;
    let cacheKey;
    
    if (week) {
        url = `${API_BASE_URL}/getpairsweek?type=teacher&data=${encodedTeacherName}&week=${week}`;
        cacheKey = `teacher_schedule_${encodedTeacherName}_week_${week}`;
    } else {
        const currentWeek = getWeekNumber(new Date());
        url = `${API_BASE_URL}/getpairsweek?type=teacher&data=${encodedTeacherName}&week=${currentWeek}`;
        cacheKey = `teacher_schedule_${encodedTeacherName}_week_${currentWeek}`;
    }
    
    return this.makeRequest(url, {}, true, cacheKey, 60 * 60 * 1000);
    }

}

// Создаем и экспортируем экземпляр класса
const apiServiceInstance = new ApiService();
export default apiServiceInstance;
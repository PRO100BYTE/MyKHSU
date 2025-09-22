import { API_BASE_URL, CORS_PROXY } from './constants';
import { getWithExpiry, setWithExpiry, getCacheInfo } from './cache';
import NetInfo from '@react-native-community/netinfo';

class ApiService {
  constructor() {
    this.timeout = 10000;
  }

  // Существующие методы остаются без изменений
  // ... (getGroups, getSchedule, getPairsTime)

  // Улучшенный метод для работы с новостями
  async getNews(from = 0, amount = 10) {
    const url = `${API_BASE_URL}/news?amount=${amount}&from=${from}`;
    const cacheKey = `news_${from}_${amount}`;
    
    try {
      const result = await this.makeRequest(url, {}, true, cacheKey, 30 * 60 * 1000);
      
      // Дополнительная логика для новостей: проверяем наличие новых новостей
      if (from === 0) {
        await this.checkForNewNews(result.data);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Метод для проверки новых новостей
  async checkForNewNews(currentNews) {
    if (!currentNews || currentNews.length === 0) return;
    
    try {
      // Получаем последние закэшированные новости
      const lastCachedNews = await getWithExpiry('news_latest');
      const lastNewsCheck = await getWithExpiry('news_last_check');
      
      // Сохраняем текущие новости как последние
      await setWithExpiry('news_latest', currentNews.slice(0, 5), 24 * 60 * 60 * 1000); // 24 часа
      await setWithExpiry('news_last_check', Date.now(), 24 * 60 * 60 * 1000);
      
      // Если есть предыдущие новости, проверяем наличие новых
      if (lastCachedNews && lastCachedNews.length > 0) {
        const currentFirstNews = currentNews[0];
        const lastFirstNews = lastCachedNews[0];
        
        // Сравниваем по содержанию и дате
        if (currentFirstNews.content !== lastFirstNews.content || 
            currentFirstNews.date !== lastFirstNews.date) {
          
          // Новая новость обнаружена - сохраняем информацию для уведомлений
          await setWithExpiry('new_news_detected', {
            count: this.countNewNews(currentNews, lastCachedNews),
            detectedAt: Date.now(),
            latestNews: currentNews[0]
          }, 24 * 60 * 60 * 1000);
          
          console.log('New news detected!');
        }
      }
    } catch (error) {
      console.error('Error checking for new news:', error);
    }
  }

  // Подсчет количества новых новостей
  countNewNews(currentNews, previousNews) {
    if (!previousNews || previousNews.length === 0) return currentNews.length;
    
    const previousDates = new Set(previousNews.map(news => news.date + news.content));
    let newCount = 0;
    
    for (const news of currentNews) {
      const newsKey = news.date + news.content;
      if (!previousDates.has(newsKey)) {
        newCount++;
      } else {
        break; // Новости отсортированы от новых к старым, поэтому можно прервать
      }
    }
    
    return newCount;
  }

  // Метод для получения информации о новых новостях (для уведомлений)
  async getNewNewsInfo() {
    return await getWithExpiry('new_news_detected');
  }

  // Метод для отметки новостей как прочитанных (для уведомлений)
  async markNewsAsRead() {
    const latestNews = await getWithExpiry('news_latest');
    if (latestNews) {
      await setWithExpiry('news_read', latestNews[0]?.date || '', 24 * 60 * 60 * 1000);
      await setWithExpiry('new_news_detected', null); // Очищаем флаг новых новостей
    }
  }

  // Универсальный метод для запросов (остается без изменений)
  async makeRequest(url, options = {}, useCache = true, cacheKey = null, cacheTTL = null) {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected;
    
    const finalCacheKey = cacheKey || `api_${btoa(url)}`;
    
    // Пытаемся получить данные из кэша
    if (useCache) {
      const cachedData = await getWithExpiry(finalCacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          source: 'cache',
          cacheInfo: await getCacheInfo(finalCacheKey)
        };
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
        await setWithExpiry(finalCacheKey, data, cacheTTL);
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
          await setWithExpiry(finalCacheKey, data, cacheTTL);
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
          const cachedData = await getWithExpiry(finalCacheKey);
          if (cachedData) {
            return {
              data: cachedData,
              source: 'stale_cache',
              cacheInfo: await getCacheInfo(finalCacheKey)
            };
          }
        }
        
        throw new Error('API_UNAVAILABLE');
      }
    }
  }

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

  async safeJsonParse(response) {
    const text = await response.text();
    
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('HTML_RESPONSE');
    }
    
    if (!text.trim()) {
      throw new Error('EMPTY_RESPONSE');
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse error:', parseError);
      throw new Error('INVALID_JSON');
    }
  }
}

export default new ApiService();
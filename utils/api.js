import { API_BASE_URL, CORS_PROXY, ERROR_MESSAGES } from './constants';
import { getWithExpiry, setWithExpiry, getCacheInfo } from './cache';
import NetInfo from '@react-native-community/netinfo';

class ApiService {
  constructor() {
    this.retryCount = 2;
    this.timeout = 10000;
  }

  async makeRequest(url, options = {}, useCache = true, cacheKey = null, cacheTTL = null) {
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected;
    
    // Генерируем cacheKey если не предоставлен
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

  // Специализированные методы для разных типов данных
  async getNews(from = 0, amount = 10) {
    const url = `${API_BASE_URL}/news?amount=${amount}&from=${from}`;
    return this.makeRequest(url, {}, true, `news_${from}_${amount}`, 30 * 60 * 1000); // 30 минут
  }

  async getGroups(course) {
    const url = `${API_BASE_URL}/getgroups/${course}`;
    return this.makeRequest(url, {}, true, `groups_${course}`, 24 * 60 * 60 * 1000); // 24 часа
  }

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
    
    return this.makeRequest(url, {}, true, cacheKey, 60 * 60 * 1000); // 1 час
  }

  async getPairsTime() {
    const url = `${API_BASE_URL}/getpairstime`;
    return this.makeRequest(url, {}, true, 'pairs_time', 7 * 24 * 60 * 60 * 1000); // 7 дней
  }

  formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\./g, '.');
  }
}

export default new ApiService();
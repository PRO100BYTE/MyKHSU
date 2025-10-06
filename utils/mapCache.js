import AsyncStorage from '@react-native-async-storage/async-storage';

class MapCache {
  constructor() {
    this.CACHE_KEY = 'map_data_cache';
    this.CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 дней
  }

  // Сохранение данных карты в кэш
  async cacheMapData(mapData) {
    try {
      const cacheData = {
        data: mapData,
        timestamp: Date.now(),
        cacheVersion: '2.0'
      };
      
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      console.error('Error caching map data:', error);
      return false;
    }
  }

  // Получение закэшированных данных карты
  async getCachedMapData() {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      
      // Проверяем актуальность кэша
      const isExpired = Date.now() - cacheData.timestamp > this.CACHE_TTL;
      
      if (isExpired) {
        await this.clearCache();
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('Error reading map cache:', error);
      return null;
    }
  }

  // Очистка кэша
  async clearCache() {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing map cache:', error);
      return false;
    }
  }

  // Получение информации о кэше
  async getCacheInfo() {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      return {
        timestamp: new Date(cacheData.timestamp).toLocaleString('ru-RU'),
        size: cached.length,
        isExpired: Date.now() - cacheData.timestamp > this.CACHE_TTL,
        version: cacheData.cacheVersion
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return null;
    }
  }

  // Кэширование пользовательских местоположений
  async cacheUserLocation(location) {
    try {
      const locations = await this.getCachedUserLocations();
      locations.push({
        ...location,
        timestamp: Date.now()
      });
      
      // Сохраняем только последние 10 местоположений
      const recentLocations = locations.slice(-10);
      
      await AsyncStorage.setItem('user_locations', JSON.stringify(recentLocations));
      return true;
    } catch (error) {
      console.error('Error caching user location:', error);
      return false;
    }
  }

  // Получение кэшированных местоположений
  async getCachedUserLocations() {
    try {
      const cached = await AsyncStorage.getItem('user_locations');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error reading user locations:', error);
      return [];
    }
  }
}

export default new MapCache();
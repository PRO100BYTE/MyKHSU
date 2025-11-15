import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWithExpiry, setWithExpiry } from './cache';

const MAP_CACHE_PREFIX = 'mapgl_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 дней

class MapGLCache {
  // Сохранение данных карты в кэш
  async saveMapData(buildingsData, mapSettings, theme) {
    try {
      const cacheData = {
        buildings: buildingsData,
        settings: mapSettings,
        theme: theme,
        timestamp: Date.now(),
        version: '2.0'
      };
      
      const cacheKey = `${MAP_CACHE_PREFIX}${theme}_data`;
      await setWithExpiry(cacheKey, cacheData, CACHE_DURATION);
      return true;
    } catch (error) {
      console.error('Error saving map cache:', error);
      return false;
    }
  }

  // Получение данных карты из кэша
  async getMapData(theme) {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}${theme}_data`;
      const cachedData = await getWithExpiry(cacheKey);
      return cachedData;
    } catch (error) {
      console.error('Error reading map cache:', error);
      return null;
    }
  }

  // Сохранение состояния карты (центр, зум и т.д.)
  async saveMapState(mapState) {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}state`;
      await setWithExpiry(cacheKey, mapState, 60 * 60 * 1000); // 1 час
      return true;
    } catch (error) {
      console.error('Error saving map state:', error);
      return false;
    }
  }

  // Получение состояния карты
  async getMapState() {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}state`;
      const cachedState = await getWithExpiry(cacheKey);
      return cachedState;
    } catch (error) {
      console.error('Error reading map state:', error);
      return null;
    }
  }

  // Сохранение пользовательских маркеров
  async saveUserMarkers(markers) {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}user_markers`;
      await setWithExpiry(cacheKey, markers, 30 * 24 * 60 * 60 * 1000); // 30 дней
      return true;
    } catch (error) {
      console.error('Error saving user markers:', error);
      return false;
    }
  }

  // Получение пользовательских маркеров
  async getUserMarkers() {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}user_markers`;
      const cachedMarkers = await getWithExpiry(cacheKey);
      return cachedMarkers || [];
    } catch (error) {
      console.error('Error reading user markers:', error);
      return [];
    }
  }

  // Проверка наличия актуального кэша
  async hasValidCache(theme) {
    try {
      const cachedData = await this.getMapData(theme);
      if (!cachedData) return false;
      
      const isExpired = Date.now() - cachedData.timestamp > CACHE_DURATION;
      return !isExpired;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  // Очистка кэша карты
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mapCacheKeys = keys.filter(key => key.startsWith(MAP_CACHE_PREFIX));
      
      if (mapCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(mapCacheKeys);
      }
      
      console.log(`Cleared ${mapCacheKeys.length} map cache entries`);
      return true;
    } catch (error) {
      console.error('Error clearing map cache:', error);
      return false;
    }
  }

  // Получение информации о кэше
  async getCacheInfo() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mapCacheKeys = keys.filter(key => key.startsWith(MAP_CACHE_PREFIX));
      
      let totalSize = 0;
      let cacheEntries = [];

      for (const key of mapCacheKeys) {
        try {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (Date.now() < parsed.expiry) {
              totalSize += item.length;
              cacheEntries.push({
                key: key,
                size: item.length,
                timestamp: parsed.timestamp,
                type: key.includes('state') ? 'state' : 
                      key.includes('markers') ? 'markers' : 'data'
              });
            }
          }
        } catch (error) {
          console.error('Error processing cache item:', error);
        }
      }

      return {
        entriesCount: cacheEntries.length,
        totalSize: totalSize,
        sizeReadable: this.formatBytes(totalSize),
        entries: cacheEntries
      };
    } catch (error) {
      console.error('Error getting map cache info:', error);
      return null;
    }
  }

  // Вспомогательная функция для форматирования размера в байтах
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Сохранение последнего местоположения пользователя
  async saveUserLocation(location) {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}user_location`;
      await setWithExpiry(cacheKey, location, 24 * 60 * 60 * 1000); // 24 часа
      return true;
    } catch (error) {
      console.error('Error saving user location:', error);
      return false;
    }
  }

  // Получение последнего местоположения пользователя
  async getUserLocation() {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}user_location`;
      const cachedLocation = await getWithExpiry(cacheKey);
      return cachedLocation;
    } catch (error) {
      console.error('Error reading user location:', error);
      return null;
    }
  }

  // Сохранение избранных мест
  async saveFavoritePlaces(places) {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}favorite_places`;
      await setWithExpiry(cacheKey, places, 365 * 24 * 60 * 60 * 1000); // 1 год
      return true;
    } catch (error) {
      console.error('Error saving favorite places:', error);
      return false;
    }
  }

  // Получение избранных мест
  async getFavoritePlaces() {
    try {
      const cacheKey = `${MAP_CACHE_PREFIX}favorite_places`;
      const cachedPlaces = await getWithExpiry(cacheKey);
      return cachedPlaces || [];
    } catch (error) {
      console.error('Error reading favorite places:', error);
      return [];
    }
  }
}

// Создаем и экспортируем экземпляр класса
const mapGLCacheInstance = new MapGLCache();
export default mapGLCacheInstance;
import MapboxGL from '@react-native-mapbox-gl/maps';

class MapboxCache {
  constructor() {
    this.offlineManager = MapboxGL.offlineManager;
  }

  // Инициализация менеджера оффлайн-карт
  initialize() {
    try {
      // Настройка параметров загрузки оффлайн-карт
      this.downloadOptions = {
        styleURL: 'mapbox://styles/mapbox/light-v10', // Будет меняться в зависимости от темы
        bounds: [
          [91.43, 53.71], // Юго-западная точка (minLon, minLat)
          [91.45, 53.73]  // Северо-восточная точка (maxLon, maxLat)
        ],
        minZoom: 13,
        maxZoom: 18,
        metadata: {
          name: 'ХГУ Кампус',
          description: 'Карта кампуса Хакасского государственного университета'
        }
      };
      
      console.log('Mapbox Cache Manager инициализирован');
    } catch (error) {
      console.error('Ошибка инициализации Mapbox Cache:', error);
    }
  }

  // Загрузка оффлайн-региона
  async downloadOfflineRegion(styleURL, regionName) {
    try {
      const options = {
        ...this.downloadOptions,
        styleURL: styleURL,
        metadata: {
          ...this.downloadOptions.metadata,
          name: regionName
        }
      };

      const region = await this.offlineManager.createPack(options);
      console.log('Оффлайн-регион создан:', region);
      return region;
    } catch (error) {
      console.error('Ошибка загрузки оффлайн-региона:', error);
      throw error;
    }
  }

  // Получение списка оффлайн-регионов
  async getOfflineRegions() {
    try {
      const regions = await this.offlineManager.getPacks();
      return regions;
    } catch (error) {
      console.error('Ошибка получения оффлайн-регионов:', error);
      return [];
    }
  }

  // Удаление оффлайн-региона
  async deleteOfflineRegion(region) {
    try {
      await this.offlineManager.deletePack(region.id);
      console.log('Оффлайн-регион удален:', region.id);
    } catch (error) {
      console.error('Ошибка удаления оффлайн-региона:', error);
      throw error;
    }
  }

  // Получение информации о прогрессе загрузки
  subscribeToDownloadProgress(callback) {
    this.offlineManager.subscribe('progress', callback);
  }

  // Отписка от событий прогресса
  unsubscribeFromDownloadProgress(callback) {
    this.offlineManager.unsubscribe('progress', callback);
  }

  // Проверка доступности оффлайн-карт для текущего региона
  async isRegionCached(styleURL) {
    try {
      const regions = await this.getOfflineRegions();
      return regions.some(region => 
        region.metadata && region.metadata.styleURL === styleURL
      );
    } catch (error) {
      console.error('Ошибка проверки кэшированного региона:', error);
      return false;
    }
  }

  // Получение размера кэша
  async getCacheSize() {
    try {
      const regions = await this.getOfflineRegions();
      let totalSize = 0;
      
      regions.forEach(region => {
        totalSize += region.size || 0;
      });
      
      return {
        totalSize,
        regionCount: regions.length,
        readableSize: this.formatBytes(totalSize)
      };
    } catch (error) {
      console.error('Ошибка получения размера кэша:', error);
      return { totalSize: 0, regionCount: 0, readableSize: '0 Bytes' };
    }
  }

  // Очистка всего кэша
  async clearAllCache() {
    try {
      const regions = await this.getOfflineRegions();
      
      for (const region of regions) {
        await this.deleteOfflineRegion(region);
      }
      
      console.log('Весь кэш карт очищен');
      return true;
    } catch (error) {
      console.error('Ошибка очистки кэша:', error);
      return false;
    }
  }

  // Вспомогательная функция для форматирования размера
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Получение статуса оффлайн-режима
  async getOfflineStatus() {
    try {
      const regions = await this.getOfflineRegions();
      const cacheInfo = await this.getCacheSize();
      
      return {
        hasOfflineMaps: regions.length > 0,
        regionCount: regions.length,
        cacheSize: cacheInfo.readableSize,
        regions: regions.map(region => ({
          id: region.id,
          name: region.metadata?.name || 'Unknown',
          styleURL: region.metadata?.styleURL,
          progress: region.progress || 0,
          state: region.state || 'unknown'
        }))
      };
    } catch (error) {
      console.error('Ошибка получения статуса оффлайн-режима:', error);
      return {
        hasOfflineMaps: false,
        regionCount: 0,
        cacheSize: '0 Bytes',
        regions: []
      };
    }
  }
}

// Создаем и экспортируем экземпляр
const mapboxCache = new MapboxCache();
export default mapboxCache;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWithExpiry, setWithExpiry } from './cache';

const MAP_CACHE_PREFIX = 'map_tile_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 дней
const TILE_ZOOM = 16;

// Формулы для преобразования координат в номера тайлов
export const long2tile = (lon, zoom) => {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
};

export const lat2tile = (lat, zoom) => {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1 / Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * Math.pow(2, zoom));
};

// Создание ключа для тайла
const createTileKey = (x, y, z) => {
  return `${MAP_CACHE_PREFIX}${z}_${x}_${y}`;
};

// Сохранение тайла в кэш
export const cacheTile = async (x, y, z, tileData) => {
  try {
    const key = createTileKey(x, y, z);
    await setWithExpiry(key, tileData, CACHE_DURATION);
    return true;
  } catch (error) {
    console.error('Error caching tile:', error);
    return false;
  }
};

// Получение тайла из кэша
export const getCachedTile = async (x, y, z) => {
  try {
    const key = createTileKey(x, y, z);
    const tileData = await getWithExpiry(key);
    return tileData;
  } catch (error) {
    console.error('Error getting cached tile:', error);
    return null;
  }
};

// Предзагрузка тайлов для области вокруг зданий
export const precacheTilesForBuildings = async (buildings, urlTemplate) => {
  try {
    const cachePromises = [];
    
    for (const building of buildings) {
      const x = long2tile(building.longitude, TILE_ZOOM);
      const y = lat2tile(building.latitude, TILE_ZOOM);
      
      // Кэшируем тайлы в радиусе 2 тайлов вокруг каждого здания
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const tileX = x + dx;
          const tileY = y + dy;
          
          // Проверяем, что тайл в пределах допустимого диапазона
          if (tileX >= 0 && tileX < Math.pow(2, TILE_ZOOM) && 
              tileY >= 0 && tileY < Math.pow(2, TILE_ZOOM)) {
            
            // Проверяем, не кэширован ли уже тайл
            const existingTile = await getCachedTile(tileX, tileY, TILE_ZOOM);
            if (!existingTile) {
              cachePromises.push(cacheTileFromUrl(tileX, tileY, TILE_ZOOM, urlTemplate));
            }
          }
        }
      }
    }
    
    // Выполняем все загрузки параллельно с ограничением
    const results = await Promise.allSettled(cachePromises);
    
    const successfulDownloads = results.filter(result => result.status === 'fulfilled' && result.value).length;
    
    if (successfulDownloads > 0) {
      await setWithExpiry('cached_map_available', true, CACHE_DURATION);
      console.log(`Successfully cached ${successfulDownloads} map tiles`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error precaching tiles:', error);
    return false;
  }
};

// Загрузка и кэширование тайла с URL
const cacheTileFromUrl = async (x, y, z, urlTemplate) => {
  try {
    const url = urlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    
    // Используем HTTPS для избежания проблем с CORS
    const secureUrl = url.replace('http://', 'https://');
    
    const response = await fetch(secureUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    
    return await cacheTile(x, y, z, base64);
  } catch (error) {
    console.error('Error caching tile from URL:', error);
    return false;
  }
};

// Преобразование Blob в base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Проверка существования кэшированных тайлов
export const checkMapCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mapTileKeys = keys.filter(key => key.startsWith(MAP_CACHE_PREFIX));
    
    if (mapTileKeys.length === 0) {
      return false;
    }
    
    // Проверяем, есть ли хотя бы один не просроченный тайл
    for (const key of mapTileKeys.slice(0, 5)) { // Проверяем только первые 5 для скорости
      const tileData = await getWithExpiry(key);
      if (tileData) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking map cache:', error);
    return false;
  }
};

// Очистка кэша карты
export const clearMapCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mapTileKeys = keys.filter(key => key.startsWith(MAP_CACHE_PREFIX));
    
    if (mapTileKeys.length > 0) {
      await AsyncStorage.multiRemove(mapTileKeys);
    }
    
    await setWithExpiry('cached_map_available', false);
    
    console.log(`Cleared ${mapTileKeys.length} map tiles from cache`);
    return true;
  } catch (error) {
    console.error('Error clearing map cache:', error);
    return false;
  }
};

// Получение информации о размере кэша
export const getMapCacheInfo = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mapTileKeys = keys.filter(key => key.startsWith(MAP_CACHE_PREFIX));
    
    let totalSize = 0;
    let validTileCount = 0;
    
    for (const key of mapTileKeys) {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (Date.now() < parsed.expiry) {
            totalSize += item.length;
            validTileCount++;
          }
        }
      } catch (error) {
        console.error('Error processing cache item:', error);
      }
    }
    
    return {
      tileCount: validTileCount,
      totalSize: totalSize,
      sizeReadable: formatBytes(totalSize)
    };
  } catch (error) {
    console.error('Error getting map cache info:', error);
    return null;
  }
};

// Вспомогательная функция для форматирования размера в байтах
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
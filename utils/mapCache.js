import * as FileSystem from 'expo-file-system';
import { getWithExpiry, setWithExpiry } from './cache';

const CACHE_DIR = `${FileSystem.cacheDirectory}map_tiles/`;
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB

// Инициализация кэш-директории
export const initCache = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error initializing cache directory:', error);
  }
};

// Сохранение тайла в кэш
export const cacheTile = async (x, y, z, tileData) => {
  try {
    await initCache();
    const fileName = `${z}_${x}_${y}.png`;
    const filePath = `${CACHE_DIR}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, tileData, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Обновляем индекс кэшированных тайлов
    const cacheIndex = await getCacheIndex();
    cacheIndex[fileName] = Date.now();
    await setWithExpiry('map_tiles_index', cacheIndex);
    
    // Проверяем размер кэша и очищаем при необходимости
    await checkCacheSize();
    
    return filePath;
  } catch (error) {
    console.error('Error caching tile:', error);
    return null;
  }
};

// Получение тайла из кэша
export const getCachedTile = async (x, y, z) => {
  try {
    const fileName = `${z}_${x}_${y}.png`;
    const filePath = `${CACHE_DIR}${fileName}`;
    
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      // Обновляем время последнего доступа
      const cacheIndex = await getCacheIndex();
      cacheIndex[fileName] = Date.now();
      await setWithExpiry('map_tiles_index', cacheIndex);
      
      return filePath;
    }
    return null;
  } catch (error) {
    console.error('Error getting cached tile:', error);
    return null;
  }
};

// Получение индекса кэша
export const getCacheIndex = async () => {
  try {
    const index = await getWithExpiry('map_tiles_index');
    return index || {};
  } catch (error) {
    console.error('Error getting cache index:', error);
    return {};
  }
};

// Проверка размера кэша и очистка старых файлов
export const checkCacheSize = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists && dirInfo.size > MAX_CACHE_SIZE) {
      const cacheIndex = await getCacheIndex();
      
      // Сортируем файлы по времени последнего доступа
      const sortedFiles = Object.entries(cacheIndex)
        .sort((a, b) => a[1] - b[1]);
      
      // Удаляем самые старые файлы, пока размер кэша не станет допустимым
      for (const [fileName] of sortedFiles) {
        try {
          await FileSystem.deleteAsync(`${CACHE_DIR}${fileName}`);
          delete cacheIndex[fileName];
          
          const newDirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
          if (newDirInfo.size <= MAX_CACHE_SIZE * 0.8) {
            break;
          }
        } catch (error) {
          console.error('Error deleting cached tile:', error);
        }
      }
      
      await setWithExpiry('map_tiles_index', cacheIndex);
    }
  } catch (error) {
    console.error('Error checking cache size:', error);
  }
};

// Очистка всего кэша карты
export const clearMapCache = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
    
    await initCache();
    await setWithExpiry('map_tiles_index', {});
    await setWithExpiry('cached_map_available', false);
    
    return true;
  } catch (error) {
    console.error('Error clearing map cache:', error);
    // Если директории не существует, все равно считаем операцию успешной
    if (error.message.includes('does not exist')) {
      return true;
    }
    throw error;
  }
};

// Получение информации о кэше карты
export const getMapCacheInfo = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    const cacheIndex = await getCacheIndex();
    
    return {
      exists: dirInfo.exists,
      size: dirInfo.exists ? dirInfo.size : 0,
      fileCount: Object.keys(cacheIndex).length,
      sizeReadable: dirInfo.exists ? formatBytes(dirInfo.size) : '0 Bytes'
    };
  } catch (error) {
    console.error('Error getting map cache info:', error);
    return {
      exists: false,
      size: 0,
      fileCount: 0,
      sizeReadable: '0 Bytes'
    };
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
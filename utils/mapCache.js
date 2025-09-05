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
        await FileSystem.deleteAsync(`${CACHE_DIR}${fileName}`);
        delete cacheIndex[fileName];
        
        const newDirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
        if (newDirInfo.size <= MAX_CACHE_SIZE * 0.8) {
          break;
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
    await FileSystem.deleteAsync(CACHE_DIR);
    await initCache();
    await setWithExpiry('map_tiles_index', {});
    await setWithExpiry('cached_map_available', false);
  } catch (error) {
    console.error('Error clearing map cache:', error);
  }
};
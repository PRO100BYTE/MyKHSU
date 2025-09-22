import * as FileSystem from 'expo-file-system';
import { getWithExpiry, setWithExpiry } from './cache';

const CACHE_DIR = `${FileSystem.cacheDirectory}map_tiles/`;
const TILE_ZOOM = 16;

// Формулы для преобразования координат в номера тайлов
export const long2tile = (lon, zoom) => {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
};

export const lat2tile = (lat, zoom) => {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1 / Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * Math.pow(2, zoom));
};

// Инициализация кэш-директории
export const initCache = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
    return true;
  } catch (error) {
    console.error('Error initializing cache directory:', error);
    return false;
  }
};

// Загрузка и кэширование тайла (исправленная версия)
export const downloadAndCacheTile = async (x, y, z, urlTemplate) => {
  try {
    const url = urlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const fileName = `${z}_${x}_${y}.png`;
    const filePath = `${CACHE_DIR}${fileName}`;
    
    // Используем новую FileSystem API вместо deprecated downloadAsync
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      filePath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        console.log(`Downloading ${fileName}: ${(progress * 100).toFixed(1)}%`);
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) {
      throw new Error('Download failed');
    }
    
    // Обновляем индекс кэшированных тайлов
    const cacheIndex = await getCacheIndex();
    cacheIndex[fileName] = Date.now();
    await setWithExpiry('map_tiles_index', cacheIndex);
    
    return result.uri;
  } catch (error) {
    console.error('Error caching tile:', error);
    return null;
  }
};

// Предзагрузка тайлов для области вокруг зданий
export const precacheTilesForBuildings = async (buildings, urlTemplate) => {
  try {
    await initCache();
    
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
            await downloadAndCacheTile(tileX, tileY, TILE_ZOOM, urlTemplate);
          }
        }
      }
    }
    
    await setWithExpiry('cached_map_available', true, 7 * 24 * 60 * 60 * 1000);
    return true;
  } catch (error) {
    console.error('Error precaching tiles:', error);
    return false;
  }
};

// Проверка существования кэша
export const checkMapCache = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    return dirInfo.exists && dirInfo.isDirectory;
  } catch (error) {
    console.error('Error checking map cache:', error);
    return false;
  }
};

// Очистка кэша карты
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
    return false;
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
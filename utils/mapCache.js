import { FileSystem } from 'expo-file-system';
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

// Инициализация кэш-директории с использованием новой API
export const initCache = async () => {
  try {
    // Создаем объект Directory для кэш-директории
    const cacheDir = new FileSystem.Directory(CACHE_DIR);
    const exists = await cacheDir.exists();
    
    if (!exists) {
      await cacheDir.make();
    }
    return true;
  } catch (error) {
    console.error('Error initializing cache directory:', error);
    return false;
  }
};

// Загрузка и кэширование тайла с использованием новой API
export const downloadAndCacheTile = async (x, y, z, urlTemplate) => {
  try {
    const url = urlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const fileName = `${z}_${x}_${y}.png`;
    const filePath = `${CACHE_DIR}${fileName}`;
    
    // Создаем объект File для целевого файла
    const tileFile = new FileSystem.File(filePath);
    
    // Загружаем данные с сервера
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Получаем данные как Blob
    const blob = await response.blob();
    
    // Сохраняем файл используя новую API
    await tileFile.write(blob);
    
    // Обновляем индекс кэшированных тайлов
    const cacheIndex = await getCacheIndex();
    cacheIndex[fileName] = Date.now();
    await setWithExpiry('map_tiles_index', cacheIndex);
    
    return filePath;
  } catch (error) {
    console.error('Error caching tile:', error);
    return null;
  }
};

// Предзагрузка тайлов для области вокруг зданий
export const precacheTilesForBuildings = async (buildings, urlTemplate) => {
  try {
    await initCache();
    
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
            cachePromises.push(downloadAndCacheTile(tileX, tileY, TILE_ZOOM, urlTemplate));
          }
        }
      }
    }
    
    // Выполняем все загрузки параллельно с ограничением количества одновременных запросов
    const results = await Promise.allSettled(cachePromises);
    
    // Проверяем успешные загрузки
    const successfulDownloads = results.filter(result => result.status === 'fulfilled' && result.value !== null).length;
    
    if (successfulDownloads > 0) {
      await setWithExpiry('cached_map_available', true, 7 * 24 * 60 * 60 * 1000);
      console.log(`Successfully cached ${successfulDownloads} map tiles`);
      return true;
    } else {
      console.log('No tiles were cached successfully');
      return false;
    }
  } catch (error) {
    console.error('Error precaching tiles:', error);
    return false;
  }
};

// Проверка существования кэша с использованием новой API
export const checkMapCache = async () => {
  try {
    const cacheDir = new FileSystem.Directory(CACHE_DIR);
    const exists = await cacheDir.exists();
    
    if (!exists) {
      return false;
    }
    
    // Проверяем, есть ли файлы в директории
    const files = await cacheDir.list();
    return files.length > 0;
  } catch (error) {
    console.error('Error checking map cache:', error);
    return false;
  }
};

// Очистка кэша карты с использованием новой API
export const clearMapCache = async () => {
  try {
    const cacheDir = new FileSystem.Directory(CACHE_DIR);
    const exists = await cacheDir.exists();
    
    if (exists) {
      await cacheDir.delete();
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

// Получение URI кэшированного тайла с использованием новой API
export const getCachedTileUri = async (x, y, z) => {
  try {
    const fileName = `${z}_${x}_${y}.png`;
    const filePath = `${CACHE_DIR}${fileName}`;
    
    const tileFile = new FileSystem.File(filePath);
    const exists = await tileFile.exists();
    
    if (exists) {
      return filePath;
    }
    return null;
  } catch (error) {
    console.error('Error getting cached tile URI:', error);
    return null;
  }
};

// Получение информации о размере кэша
export const getMapCacheInfo = async () => {
  try {
    const cacheDir = new FileSystem.Directory(CACHE_DIR);
    const exists = await cacheDir.exists();
    
    if (!exists) {
      return { size: 0, fileCount: 0, sizeReadable: '0 Bytes' };
    }
    
    const files = await cacheDir.list();
    let totalSize = 0;
    
    for (const fileName of files) {
      const filePath = `${CACHE_DIR}${fileName}`;
      const file = new FileSystem.File(filePath);
      const info = await file.getInfo();
      totalSize += info.size || 0;
    }
    
    return {
      size: totalSize,
      fileCount: files.length,
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
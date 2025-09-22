import * as FileSystem from 'expo-file-system';
import { getWithExpiry, setWithExpiry } from './cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = `${FileSystem.cacheDirectory}map_tiles/`;
const TILE_ZOOM = 16;

export const long2tile = (lon, zoom) => {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
};

export const lat2tile = (lat, zoom) => {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1 / Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * Math.pow(2, zoom));
};

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

export const downloadAndCacheTile = async (x, y, z, urlTemplate) => {
  try {
    const fileName = `${x}-${y}-${z}.png`;
    const fileUri = `${CACHE_DIR}${fileName}`;
    
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      return fileUri;
    }

    const tileUrl = urlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    await FileSystem.downloadAsync(tileUrl, fileUri);
    return fileUri;
  } catch (error) {
    console.error('Error downloading or caching tile:', error);
    return null;
  }
};

export const precacheTiles = async (urlTemplate) => {
  try {
    await initCache();
    await clearMapCache(); // Очищаем старый кэш перед загрузкой нового

    // Координаты ХГУ (ориентировочно)
    const khsuLat = 53.722;
    const khsuLon = 91.439;

    const startX = long2tile(khsuLon - 0.01, TILE_ZOOM);
    const endX = long2tile(khsuLon + 0.01, TILE_ZOOM);
    const startY = lat2tile(khsuLat + 0.01, TILE_ZOOM);
    const endY = lat2tile(khsuLat - 0.01, TILE_ZOOM);
    
    for (let tileX = startX; tileX <= endX; tileX++) {
      for (let tileY = startY; tileY <= endY; tileY++) {
        await downloadAndCacheTile(tileX, tileY, TILE_ZOOM, urlTemplate);
      }
    }
    
    await setWithExpiry('cached_map_available', true, 7 * 24 * 60 * 60 * 1000);
    return true;
  } catch (error) {
    console.error('Error precaching tiles:', error);
    return false;
  }
};

export const checkMapCache = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    return dirInfo.exists;
  } catch (error) {
    console.error('Error checking map cache:', error);
    return false;
  }
};

export const clearMapCache = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIR);
    }
    await initCache();
    await AsyncStorage.removeItem('cached_map_available');
  } catch (error) {
    console.error('Error clearing map cache:', error);
  }
};
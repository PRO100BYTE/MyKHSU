import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_TTL } from './constants';

export const getWithExpiry = async (key) => {
  try {
    const itemStr = await AsyncStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return item.value;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

export const setWithExpiry = async (key, value, ttl = CACHE_TTL) => {
  try {
    const item = {
      value,
      expiry: Date.now() + ttl,
      cacheDate: new Date().toISOString()
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

export const getWithExpiryAndInfo = async (key) => {
  try {
    const itemStr = await AsyncStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return item;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

// Функция для безопасного парсинга JSON
export const safeJsonParse = (text) => {
  if (!text || text.trim().length === 0) {
    console.error('Attempted to parse empty or null text.');
    return null;
  }
  try {
    const json = JSON.parse(text);
    return json;
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Response text:', text.substring(0, 100));
    return null;
  }
};

export const clearAllCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

export const getCacheInfo = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;
    
    for (const key of keys) {
      const item = await AsyncStorage.getItem(key);
      if (item) {
        totalSize += item.length;
      }
    }
    
    return {
      count: keys.length,
      size: totalSize,
      sizeReadable: formatBytes(totalSize)
    };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return null;
  }
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
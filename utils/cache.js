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
      cacheDate: new Date().toISOString(),
      cacheVersion: '1.0'
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
    return true;
  } catch (error) {
    console.error('Error setting cache:', error);
    return false;
  }
};

export const getCacheInfo = async (key) => {
  try {
    const itemStr = await AsyncStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    return {
      value: item.value,
      expiry: item.expiry,
      cacheDate: item.cacheDate,
      isExpired: Date.now() > item.expiry
    };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return null;
  }
};

export const clearCacheByKey = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

export const clearAllCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Error clearing all cache:', error);
    return false;
  }
};

export const getCacheStats = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;
    const cacheInfo = {};
    
    for (const key of keys) {
      const item = await AsyncStorage.getItem(key);
      if (item) {
        totalSize += item.length;
        const parsed = JSON.parse(item);
        cacheInfo[key] = {
          size: item.length,
          expiry: parsed.expiry,
          cacheDate: parsed.cacheDate
        };
      }
    }
    
    return {
      totalKeys: keys.length,
      totalSize,
      cacheInfo
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
};
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
      expiry: Date.now() + ttl
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

// Новая функция для безопасного парсинга JSON
/**
 * Safely parses a JSON response, checking for HTML error pages and empty responses.
 * 
 * @param {Response} response - The fetch Response object to parse.
 * @returns {Promise<any>} The parsed JSON object.
 * @throws {Error} If the response is HTML, empty, or contains invalid JSON.
 */
export const safeJsonParse = async (response) => {
  try {
    const text = await response.text();
    
    // Проверяем, не является ли ответ HTML страницей с ошибкой
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('Server returned HTML instead of JSON');
      throw new Error('Server returned HTML instead of JSON');
    }
    
    // Проверяем, не пустой ли ответ
    if (!text.trim()) {
      console.error('Empty response from server');
      throw new Error('Empty response from server');
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse error:', parseError, 'Response text:', text.substring(0, 100));
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error('Error in safeJsonParse:', error);
    throw error;
  }
};

// Функция для очистки всего кэша
export const clearAllCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
};

// Функция для получения информации о размере кэша
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

// Вспомогательная функция для форматирования размера в байтах
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
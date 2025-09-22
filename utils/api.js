import NetInfo from '@react-native-community/netinfo';
import { getWithExpiry, setWithExpiry } from './cache';
import { API_BASE_URL, CORS_PROXY } from './constants';

export const fetchAPI = async (endpoint, cacheKey) => {
  const state = await NetInfo.fetch();
  const isOnline = state.isConnected;

  const cache = await getWithExpiry(cacheKey);
  if (!isOnline && cache) {
    console.log(`Using cached data for ${cacheKey}`);
    return { data: cache, source: 'cache', cacheDate: cache.cacheDate };
  }

  const directUrl = `${API_BASE_URL}${endpoint}`;
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(directUrl)}`;

  try {
    const response = await fetch(directUrl);
    if (!response.ok) throw new Error('Direct fetch failed');
    const data = await response.json();
    await setWithExpiry(cacheKey, data);
    console.log(`Successfully fetched from direct API for ${cacheKey}`);
    return { data, source: 'api' };
  } catch (directError) {
    console.warn(`Direct fetch failed, trying proxy: ${directError}`);
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Proxy fetch failed');
      const data = await response.json();
      await setWithExpiry(cacheKey, data);
      console.log(`Successfully fetched from proxy for ${cacheKey}`);
      return { data, source: 'proxy' };
    } catch (proxyError) {
      console.error(`Proxy fetch also failed: ${proxyError}`);
      const cachedData = await getWithExpiry(cacheKey);
      if (cachedData) {
        console.log(`Using cached data as fallback for ${cacheKey}`);
        return { data: cachedData, source: 'cache' };
      } else {
        throw new Error('Failed to fetch data and no cache available.');
      }
    }
  }
};
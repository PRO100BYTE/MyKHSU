import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Linking, Platform, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWithExpiry, setWithExpiry } from '../utils/cache';
import { ACCENT_COLORS } from '../utils/constants';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cachedMapAvailable, setCachedMapAvailable] = useState(false);
  const [cachedTiles, setCachedTiles] = useState({});
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';

  // Координаты корпусов ХГУ (примерные, замените на реальные)
  const buildings = [
    {
      id: 1,
      name: 'Главный корпус',
      latitude: 53.7213,
      longitude: 91.4424,
      description: 'ул. Ленина, 90'
    },
    {
      id: 2,
      name: 'Корпус №2',
      latitude: 53.7220,
      longitude: 91.4430,
      description: 'ул. Ленина, 92'
    },
    {
      id: 3,
      name: 'Корпус №3',
      latitude: 53.7205,
      longitude: 91.4410,
      description: 'ул. Щетинкина, 18'
    }
  ];

  // URL шаблон для OpenStreetMap тайлов
  const OSM_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  useEffect(() => {
    // Проверяем подключение к интернету
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      // Если онлайн, пытаемся загрузить карту
      if (state.isConnected && !mapLoaded) {
        loadMap();
      }
    });

    // Проверяем наличие кэшированных тайлов
    checkCachedTiles();

    return () => unsubscribe();
  }, []);

  const checkCachedTiles = async () => {
    try {
      // Проверяем, есть ли кэшированные тайлы
      const cachedTilesData = await getWithExpiry('cached_map_tiles');
      if (cachedTilesData) {
        setCachedTiles(cachedTilesData);
        setCachedMapAvailable(true);
      }
    } catch (error) {
      console.error('Error checking cached tiles:', error);
    }
  };

  const loadMap = async () => {
    try {
      // Если онлайн, предзагружаем тайлы для текущей области
      if (isOnline) {
        await precacheTiles();
      }
      setMapLoaded(true);
    } catch (error) {
      console.error('Error loading map:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить карту');
    }
  };

  const precacheTiles = async () => {
    // Здесь можно реализовать предзагрузку тайлов для определенной области
    // Это сложная задача, требующая расчета нужных тайлов для текущего региона
    console.log('Precaching map tiles...');
    
    // В реальном приложении здесь бы был код для предзагрузки тайлов
    // Пока просто отмечаем, что карта доступна для оффлайн-использования
    await setWithExpiry('cached_map_available', true, 7 * 24 * 60 * 60 * 1000);
    setCachedMapAvailable(true);
  };

  const handleRetry = () => {
    if (isOnline) {
      loadMap();
    } else {
      Alert.alert(
        'Нет подключения',
        'Для загрузки карты необходимо подключение к интернету',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Настройки', onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  const handleMarkerPress = (building) => {
    Alert.alert(
      building.name,
      building.description,
      [
        { text: 'Закрыть', style: 'cancel' },
        { 
          text: 'Построить маршрут', 
          onPress: () => {
            const url = `https://www.openstreetmap.org/directions?from=&to=${building.latitude},${building.longitude}`;
            Linking.openURL(url);
          }
        }
      ]
    );
  };

  // Функция для получения URL тайла с учетом кэша
  const getTileUrl = (x, y, z) => {
    const tileUrl = OSM_URL_TEMPLATE
      .replace('{x}', x)
      .replace('{y}', y)
      .replace('{z}', z);
    
    return tileUrl;
  };

  if (!mapLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={[styles.placeholder, { backgroundColor: cardBg }]}>
          {isOnline ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.placeholderText, { color: textColor, marginTop: 16 }]}>
                Загрузка карты...
              </Text>
            </>
          ) : cachedMapAvailable ? (
            <>
              <Icon name="warning-outline" size={48} color={colors.primary} />
              <Text style={[styles.placeholderText, { color: textColor, marginTop: 16 }]}>
                Нет подключения к интернету
              </Text>
              <Text style={[styles.placeholderSubtext, { color: textColor }]}>
                Используется кэшированная версия карты
              </Text>
              <Text style={[styles.retryText, { color: colors.primary }]} onPress={handleRetry}>
                Попробовать обновить
              </Text>
            </>
          ) : (
            <>
              <Icon name="cloud-offline-outline" size={48} color={colors.primary} />
              <Text style={[styles.placeholderText, { color: textColor, marginTop: 16 }]}>
                Нет подключения к интернету
              </Text>
              <Text style={[styles.placeholderSubtext, { color: textColor }]}>
                Карта не загружена и недоступна в оффлайн-режиме
              </Text>
              <Text style={[styles.retryText, { color: colors.primary }]} onPress={handleRetry}>
                Попробовать снова
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 53.7213,
          longitude: 91.4424,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Используем тайлы OpenStreetMap */}
        <UrlTile
          urlTemplate={OSM_URL_TEMPLATE}
          maximumZ={19}
          flipY={false}
        />
        
        {buildings.map(building => (
          <Marker
            key={building.id}
            coordinate={{
              latitude: building.latitude,
              longitude: building.longitude
            }}
            title={building.name}
            description={building.description}
            onPress={() => handleMarkerPress(building)}
          >
            <View style={styles.marker}>
              <Icon name="business-outline" size={24} color={colors.primary} />
            </View>
          </Marker>
        ))}
      </MapView>
      
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Icon name="cloud-offline-outline" size={16} color="#ffffff" />
          <Text style={styles.offlineText}>Оффлайн-режим</Text>
        </View>
      )}
      
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>
          © OpenStreetMap contributors
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
  },
  placeholderSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Montserrat_400Regular',
  },
  retryText: {
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Montserrat_500Medium',
  },
  offlineIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineText: {
    color: '#ffffff',
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  attribution: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 4,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'Montserrat_400Regular',
  },
});

export default MapScreen;
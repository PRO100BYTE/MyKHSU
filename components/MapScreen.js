import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import YaMap, { Marker, Camera } from 'react-native-yamap';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { useColorScheme } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { getWithExpiry, setWithExpiry } from '../utils/cache';
import { ACCENT_COLORS } from '../utils/constants';

// Инициализация Яндекс Карт (нужно вызвать один раз при запуске приложения)
// Обычно это делается в отдельном файле инициализации
YaMap.init('5bd63ae8-cdcf-47f4-a384-ca4b9c0b982f');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [cachedMapAvailable, setCachedMapAvailable] = useState(false);
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';

  // Координаты корпусов ХГУ (примерные, замените на реальные)
  const buildings = [
    {
      id: 1,
      name: 'Главный корпус',
      lat: 53.7213,
      lon: 91.4424,
      description: 'ул. Ленина, 90'
    },
    {
      id: 2,
      name: 'Корпус №2',
      lat: 53.7220,
      lon: 91.4430,
      description: 'ул. Ленина, 92'
    },
    {
      id: 3,
      name: 'Корпус №3',
      lat: 53.7205,
      lon: 91.4410,
      description: 'ул. Щетинкина, 18'
    }
  ];

  useEffect(() => {
    // Проверяем подключение к интернету
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      // Если онлайн, пытаемся загрузить карту
      if (state.isConnected && !mapLoaded) {
        loadMap();
      }
    });

    // Проверяем наличие кэшированной карты
    checkCachedMap();

    return () => unsubscribe();
  }, []);

  const checkCachedMap = async () => {
    try {
      // Проверяем, есть ли кэшированная карта
      const cached = await getWithExpiry('cached_map_available');
      setCachedMapAvailable(!!cached);
    } catch (error) {
      console.error('Error checking cached map:', error);
    }
  };

  const loadMap = async () => {
    try {
      // Имитируем загрузку карты
      setTimeout(() => {
        setMapLoaded(true);
        // Сохраняем информацию о том, что карта была загружена
        setWithExpiry('cached_map_available', true, 7 * 24 * 60 * 60 * 1000); // 7 дней
        setCachedMapAvailable(true);
      }, 1500);
    } catch (error) {
      console.error('Error loading map:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить карту');
    }
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
            const url = `https://yandex.ru/maps/?pt=${building.lon},${building.lat}&z=17&l=map`;
            Linking.openURL(url);
          }
        }
      ]
    );
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
      <YaMap
        style={styles.map}
        initialRegion={{
          lat: 53.7213,
          lon: 91.4424,
          zoom: 15,
          azimuth: 0,
          tilt: 0
        }}
        showUserPosition={true}
        nightMode={theme === 'dark'}
      >
        {buildings.map(building => (
          <Marker
            key={building.id}
            point={{ lat: building.lat, lon: building.lon }}
            source={require('../assets/marker.png')} // Ваш кастомный маркер
            scale={0.5}
            onPress={() => handleMarkerPress(building)}
          />
        ))}
      </YaMap>
      
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Icon name="cloud-offline-outline" size={16} color="#ffffff" />
          <Text style={styles.offlineText}>Оффлайн-режим</Text>
        </View>
      )}
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
});

export default MapScreen;
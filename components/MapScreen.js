import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Platform, Dimensions, TouchableOpacity, Animated } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS } from '../utils/constants';
import { buildings, initialRegion } from '../utils/buildingCoordinates';
import ConnectionError from './ConnectionError';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appTheme, setAppTheme] = useState('light');
  const mapRef = useRef(null);
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = appTheme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = appTheme === 'light' ? '#111827' : '#ffffff';
  
  // Анимация появления
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Загружаем тему приложения из SecureStore
  useEffect(() => {
    loadAppTheme();
  }, []);

  // Обновляем локальную тему при изменении пропса theme
  useEffect(() => {
    if (theme) {
      setAppTheme(theme);
    }
  }, [theme]);

  const loadAppTheme = async () => {
    try {
      const savedTheme = await SecureStore.getItemAsync('theme');
      if (savedTheme) {
        const effectiveTheme = savedTheme === 'auto' ? 'light' : savedTheme;
        setAppTheme(effectiveTheme);
      } else if (theme) {
        setAppTheme(theme);
      }
    } catch (error) {
      console.error('Error loading app theme:', error);
      setAppTheme(theme || 'light');
    }
  };

  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Mapbox стили для светлой и темной тем
  const MAPBOX_THEMES = {
    light: {
      urlTemplate: 'https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
      attribution: '© Mapbox © OpenStreetMap',
      markerColor: colors.primary
    },
    dark: {
      urlTemplate: 'https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
      attribution: '© Mapbox © OpenStreetMap',
      markerColor: colors.dark
    }
  };

  // Резервные OSM стили
  const OSM_THEMES = {
    light: {
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      markerColor: colors.primary
    },
    dark: {
      urlTemplate: 'https://tiles.wmflabs.org/dark-matter/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors, Dark Matter style',
      markerColor: colors.dark
    }
  };

  // Используем Mapbox как основной провайдер, OSM как запасной
  const mapThemes = MAPBOX_THEMES;

  // Иконки для разных типов зданий
  const BUILDING_ICONS = {
    main: 'business-outline',
    academic: 'school-outline',
    library: 'library-outline',
    dormitory: 'home-outline',
    sports: 'barbell-outline',
    cafeteria: 'restaurant-outline'
  };

  // Получаем настройки текущей темы карты из настроек приложения
  const mapTheme = mapThemes[appTheme] || mapThemes.light;

  useEffect(() => {
    initializeMap();
  }, [appTheme]);

  const initializeMap = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Проверяем подключение к интернету
      const netState = await NetInfo.fetch();
      setIsOnline(netState.isConnected);
      
      if (!netState.isConnected) {
        setError('NO_INTERNET');
        setLoading(false);
        return;
      }

      // Простая загрузка онлайн карты
      setTimeout(() => {
        setMapLoaded(true);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('LOAD_ERROR');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    initializeMap();
  };

  const handleMarkerPress = (building) => {
    Alert.alert(
      building.name,
      building.description,
      [
        { text: 'Закрыть', style: 'cancel' },
        { 
          text: 'Построить маршрут', 
          onPress: () => showRouteOptions(building)
        }
      ]
    );
  };

  // Показываем выбор приложения для построения маршрута
  const showRouteOptions = (building) => {
    Alert.alert(
      'Построение маршрута',
      'Выберите приложение для построения маршрута:',
      [
        {
          text: 'Яндекс Карты',
          onPress: () => openYandexMapsRoute(building)
        },
        {
          text: '2ГИС',
          onPress: () => open2GISRoute(building)
        },
        {
          text: 'Отмена',
          style: 'cancel'
        }
      ]
    );
  };

  // Построение маршрута через Яндекс Карты
  const openYandexMapsRoute = async (building) => {
    const yandexMapsUrl = `https://yandex.ru/maps/?rtext=~${building.latitude},${building.longitude}&rtt=auto`;
    
    try {
      const supported = await Linking.canOpenURL(yandexMapsUrl);
      if (supported) {
        await Linking.openURL(yandexMapsUrl);
      } else {
        Alert.alert('Ошибка', 'Не удалось открыть Яндекс Карты');
      }
    } catch (error) {
      console.error('Error opening Yandex Maps:', error);
      Alert.alert('Ошибка', 'Не удалось открыть Яндекс Карты');
    }
  };

  // Построение маршрута через 2ГИС
  const open2GISRoute = async (building) => {
    const twoGisUrl = `https://2gis.ru/routeSearch/rsType/car/to/${building.longitude},${building.latitude}`;
    
    try {
      const supported = await Linking.canOpenURL(twoGisUrl);
      if (supported) {
        await Linking.openURL(twoGisUrl);
      } else {
        Alert.alert('Ошибка', 'Не удалось открыть 2ГИС');
      }
    } catch (error) {
      console.error('Error opening 2GIS:', error);
      Alert.alert('Ошибка', 'Не удалось открыть 2ГИС');
    }
  };

  const getMarkerIcon = (buildingType) => {
    return BUILDING_ICONS[buildingType] || 'business-outline';
  };

  // Функция для центрирования карты на всех зданиях
  const focusOnAllBuildings = () => {
    if (mapRef.current && buildings.length > 0) {
      mapRef.current.fitToCoordinates(buildings.map(b => ({
        latitude: b.latitude,
        longitude: b.longitude
      })), {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Если есть ошибка или загрузка, показываем соответствующий экран
  if (loading || error) {
    let errorType = error;
    if (error === 'NO_INTERNET') {
      errorType = 'no-internet';
    } else if (error === 'LOAD_ERROR') {
      errorType = 'load-error';
    }

    return (
      <Animated.View style={{ flex: 1, backgroundColor: bgColor, opacity: fadeAnim }}>
        <ConnectionError 
          type={errorType}
          loading={loading}
          onRetry={handleRetry}
          theme={appTheme}
          accentColor={accentColor}
          contentType="map"
          message={error === 'NO_INTERNET' ? 'Карта недоступна без подключения к интернету' : 'Не удалось загрузить карту'}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        // Принудительно обновляем карту при смене темы приложения
        key={`map_${appTheme}_${accentColor}`}
      >
        {/* Используем Mapbox тайлы для обеих платформ */}
        <UrlTile
          urlTemplate={mapTheme.urlTemplate}
          maximumZ={20}
          flipY={false}
          tileSize={256}
          key={`tile_${appTheme}`}
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
            <View style={[
              styles.marker, 
              { 
                backgroundColor: colors.light, 
                borderColor: colors.primary,
                // Уменьшаем размер маркеров на Android
                padding: Platform.OS === 'android' ? 4 : 8,
              }
            ]}>
              <Icon 
                name={getMarkerIcon(building.type)} 
                size={Platform.OS === 'android' ? 18 : 24} 
                color={colors.primary} 
              />
            </View>
          </Marker>
        ))}
      </MapView>
      
      {/* Кнопка центрирования на зданиях */}
      <TouchableOpacity 
        style={[styles.centerButton, { backgroundColor: colors.primary }]}
        onPress={focusOnAllBuildings}
      >
        <Icon name="locate" size={24} color="#ffffff" />
      </TouchableOpacity>

      <View style={[styles.attribution, { backgroundColor: appTheme === 'dark' ? '#000000' : '#ffffff' }]}>
        <Text style={[styles.attributionText, { color: appTheme === 'dark' ? '#ffffff' : '#333333' }]}>
          {mapTheme.attribution}
        </Text>
      </View>

      {/* Индикатор темы карты */}
      <View style={[styles.themeIndicatorBadge, { backgroundColor: appTheme === 'dark' ? '#000000' : '#ffffff' }]}>
        <Icon 
          name={appTheme === 'dark' ? 'moon' : 'sunny'} 
          size={14} 
          color={appTheme === 'dark' ? '#ffffff' : '#333333'} 
        />
        <Text style={[styles.themeIndicatorText, { color: appTheme === 'dark' ? '#ffffff' : '#333333' }]}>
          {appTheme === 'dark' ? 'Тёмная карта' : 'Светлая карта'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    marginBottom: Platform.OS === 'android' ? 5 : 0
  },
  marker: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  attribution: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 70 : 16,
    left: 16,
    padding: 6,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  themeIndicatorBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 16,
    padding: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIndicatorText: {
    fontSize: 10,
    marginLeft: 4,
    fontFamily: 'Montserrat_400Regular',
  },
  centerButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 16,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default MapScreen;
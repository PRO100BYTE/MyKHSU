import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Platform, Dimensions, TouchableOpacity, Animated, StatusBar } from 'react-native';
import MapboxGL from '@react-native-mapbox-gl/maps';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons as Icon } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ACCENT_COLORS } from '../utils/constants';
import { buildings, initialRegion } from '../utils/buildingCoordinates';
import ConnectionError from './ConnectionError';

// Получаем токен из environment variables
const MAPBOX_ACCESS_TOKEN = Constants.expoConfig?.extra?.mapboxAccessToken || Constants.manifest?.extra?.mapboxAccessToken;

// Проверяем и устанавливаем токен Mapbox
let mapboxInitialized = false;
if (MAPBOX_ACCESS_TOKEN) {
  try {
    MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);
    mapboxInitialized = true;
    console.log('Mapbox initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Mapbox:', error);
  }
} else {
  console.error('Mapbox access token is missing!');
}

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const cameraRef = useRef(null);
  const mapRef = useRef(null);
  const colors = ACCENT_COLORS[accentColor];
  
  // Анимация появления
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Проверяем инициализацию Mapbox
  useEffect(() => {
    if (!mapboxInitialized) {
      setError('MAPBOX_INIT_ERROR');
      setLoading(false);
    }
  }, []);

  // Определяем стиль карты на основе темы приложения
  const getMapStyle = () => {
    return theme === 'dark' 
      ? 'mapbox://styles/mapbox/dark-v10'
      : 'mapbox://styles/mapbox/light-v10';
  };

  const [mapStyle, setMapStyle] = useState(getMapStyle());

  // Обновляем стиль карты при изменении темы приложения
  useEffect(() => {
    console.log('Обновление стиля карты для темы:', theme);
    setMapStyle(getMapStyle());
  }, [theme]);

  // Цвета фона и текста на основе темы ПРИЛОЖЕНИЯ
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    // Если Mapbox не инициализирован, показываем ошибку
    if (!mapboxInitialized) {
      setError('MAPBOX_INIT_ERROR');
      setLoading(false);
      return;
    }

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

      // Инициализация карты
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('LOAD_ERROR');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
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
          text: 'Google Карты',
          onPress: () => openGoogleMapsRoute(building)
        },
        {
          text: 'Отмена',
          style: 'cancel'
        }
      ]
    );
  };

  const openYandexMapsRoute = async (building) => {
    const yandexMapsAppUrl = `yandexmaps://build_route_on_map?lat_to=${building.latitude}&lon_to=${building.longitude}`;
    const yandexMapsWebUrl = `https://yandex.ru/maps/?rtext=~${building.latitude},${building.longitude}&rtt=auto`;
    
    try {
      const supported = await Linking.canOpenURL(yandexMapsAppUrl);
      if (supported) {
        await Linking.openURL(yandexMapsAppUrl);
      } else {
        await Linking.openURL(yandexMapsWebUrl);
      }
    } catch (error) {
      console.error('Error opening Yandex Maps:', error);
      try {
        await Linking.openURL(yandexMapsWebUrl);
      } catch (webError) {
        Alert.alert('Ошибка', 'Не удалось открыть Яндекс Карты');
      }
    }
  };

  const open2GISRoute = async (building) => {
    const twoGisAppUrl = `dgis://2gis.ru/routeSearch/rsType/car/to/${building.longitude},${building.latitude}`;
    const twoGisWebUrl = `https://2gis.ru/routeSearch/rsType/car/to/${building.longitude},${building.latitude}`;
    
    try {
      const supported = await Linking.canOpenURL(twoGisAppUrl);
      if (supported) {
        await Linking.openURL(twoGisAppUrl);
      } else {
        await Linking.openURL(twoGisWebUrl);
      }
    } catch (error) {
      console.error('Error opening 2GIS:', error);
      try {
        await Linking.openURL(twoGisWebUrl);
      } catch (webError) {
        Alert.alert('Ошибка', 'Не удалось открыть 2ГИС');
      }
    }
  };

  const openGoogleMapsRoute = async (building) => {
    const googleMapsAppUrl = `https://www.google.com/maps/dir/?api=1&destination=${building.latitude},${building.longitude}`;
    
    try {
      await Linking.openURL(googleMapsAppUrl);
    } catch (error) {
      console.error('Error opening Google Maps:', error);
      Alert.alert('Ошибка', 'Не удалось открыть Google Карты');
    }
  };

  const BUILDING_ICONS = {
    main: 'business',
    academic: 'school',
    library: 'library',
    dormitory: 'home',
    sports: 'barbell',
    cafeteria: 'restaurant'
  };

  const getMarkerIcon = (buildingType) => {
    return BUILDING_ICONS[buildingType] || 'business';
  };

  const focusOnAllBuildings = () => {
    if (cameraRef.current && buildings.length > 0) {
      const coordinates = buildings.map(building => [building.longitude, building.latitude]);
      
      cameraRef.current.fitBounds(
        coordinates,
        {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1000
        }
      );
    }
  };

  const handleMapReady = () => {
    setMapReady(true);
    setLoading(false);
  };

  // Если Mapbox не инициализирован, показываем заглушку
  if (!mapboxInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar 
          barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={bgColor}
        />
        <Icon name="map-outline" size={64} color={colors.primary} />
        <Text style={{ marginTop: 16, color: textColor, textAlign: 'center', paddingHorizontal: 20 }}>
          Карта временно недоступна. Пожалуйста, обновите приложение или обратитесь в поддержку.
        </Text>
      </View>
    );
  }

  // Если есть ошибка или загрузка, показываем соответствующий экран
  if (error && !loading) {
    let errorType = error;
    let errorMessage = '';

    switch (error) {
      case 'NO_INTERNET':
        errorType = 'no-internet';
        errorMessage = 'Карта недоступна без подключения к интернету';
        break;
      case 'LOAD_ERROR':
        errorType = 'load-error';
        errorMessage = 'Не удалось загрузить карту';
        break;
      case 'MAPBOX_INIT_ERROR':
        errorType = 'config-error';
        errorMessage = 'Ошибка инициализации карты';
        break;
      default:
        errorType = 'load-error';
        errorMessage = 'Не удалось загрузить карту';
    }

    return (
      <Animated.View style={{ flex: 1, backgroundColor: bgColor, opacity: fadeAnim }}>
        <StatusBar 
          barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={bgColor}
        />
        <ConnectionError 
          type={errorType}
          loading={loading}
          onRetry={handleRetry}
          theme={theme}
          accentColor={accentColor}
          contentType="map"
          message={errorMessage}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, opacity: fadeAnim }]}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      
      {/* Карта Mapbox */}
      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={mapStyle}
          onDidFinishLoadingMap={handleMapReady}
          compassEnabled={true}
          logoEnabled={true}
          attributionEnabled={true}
          scaleBarEnabled={true}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            defaultSettings={{
              center: [initialRegion.longitude, initialRegion.latitude],
              zoom: initialRegion.longitudeDelta,
              pitch: 0,
              heading: 0
            }}
          />
          
          <MapboxGL.UserLocation 
            visible={true}
            animated={true}
            rendersMode={'normal'}
          />
          
          {/* Маркеры зданий */}
          {buildings.map((building, index) => (
            <MapboxGL.PointAnnotation
              key={building.id}
              id={`building-${building.id}`}
              coordinate={[building.longitude, building.latitude]}
              onSelected={() => handleMarkerPress(building)}
            >
              <View style={[
                styles.marker, 
                { 
                  backgroundColor: colors.light, 
                  borderColor: colors.primary,
                }
              ]}>
                <Icon 
                  name={getMarkerIcon(building.type)} 
                  size={20} 
                  color={colors.primary} 
                />
              </View>
              
              <MapboxGL.Callout title={building.name} />
            </MapboxGL.PointAnnotation>
          ))}
        </MapboxGL.MapView>
        
        {/* Индикатор загрузки */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={[styles.loadingIndicator, { backgroundColor: colors.light }]}>
              <Icon name="map-outline" size={32} color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.primary, marginTop: 8 }]}>
                Загрузка карты...
              </Text>
            </View>
          </View>
        )}
      </View>
      
      {/* Кнопка центрирования на зданиях */}
      <TouchableOpacity 
        style={[styles.centerButton, { backgroundColor: colors.primary }]}
        onPress={focusOnAllBuildings}
      >
        <Icon name="locate" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Индикатор темы карты */}
      <View style={[styles.themeIndicatorBadge, { backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }]}>
        <Icon 
          name={theme === 'dark' ? 'moon' : 'sunny'} 
          size={14} 
          color={theme === 'dark' ? '#ffffff' : '#333333'} 
        />
        <Text style={[styles.themeIndicatorText, { color: theme === 'dark' ? '#ffffff' : '#333333' }]}>
          {theme === 'dark' ? 'Тёмная карта' : 'Светлая карта'}
        </Text>
      </View>

      {/* Отладочная информация */}
      {__DEV__ && (
        <View style={[styles.debugInfo, { backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }]}>
          <Text style={[styles.debugText, { color: theme === 'dark' ? '#ffffff' : '#333333' }]}>
            Mapbox • {theme === 'dark' ? 'Dark' : 'Light'} • {Platform.OS.toUpperCase()}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
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
  debugInfo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 80,
    right: 16,
    padding: 6,
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
  },
});

export default MapScreen;
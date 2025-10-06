import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Platform, Dimensions, TouchableOpacity, Animated, StatusBar } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';
import { buildings, initialRegion } from '../utils/buildingCoordinates';
import ConnectionError from './ConnectionError';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapKey, setMapKey] = useState(0); // Ключ для принудительного пересоздания карты
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

  // ЖЕСТКО определяем URL тайлов на основе темы ПРИЛОЖЕНИЯ
  const getTileUrl = () => {
    // Используем ТОЛЬКО тему приложения, игнорируем системную
    const appTheme = theme;
    
    console.log('Карта: Тема приложения:', appTheme);
    
    // Mapbox URLs для разных тем
    const mapboxUrls = {
      light: 'https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoicHJvMTAwYnl0ZSIsImEiOiJjbHZ5b2N1c3YwMDB0MmpxcTV0b3N5b2VpIn0.8QlXYi2nQK2kY9Ql7Qqj9A',
      dark: 'https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoicHJvMTAwYnl0ZSIsImEiOiJjbHZ5b2N1c3YwMDB0MmpxcTV0b3N5b2VpIn0.8QlXYi2nQK2kY9Ql7Qqj9A'
    };

    // OpenStreetMap как резервный
    const osmUrls = {
      light: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      dark: 'https://tiles.wmflabs.org/dark-matter/{z}/{x}/{y}.png'
    };

    // ВСЕГДА используем тему ПРИЛОЖЕНИЯ
    const selectedTheme = appTheme === 'dark' ? 'dark' : 'light';
    
    // Пробуем Mapbox сначала
    return {
      url: mapboxUrls[selectedTheme],
      attribution: '© Mapbox © OpenStreetMap',
      provider: 'mapbox'
    };
  };

  const [tileConfig, setTileConfig] = useState(getTileUrl());

  // ПРИНУДИТЕЛЬНО пересоздаем карту при ЛЮБОМ изменении темы приложения
  useEffect(() => {
    console.log('Карта: Смена темы приложения, пересоздаем карту...', theme);
    
    const newConfig = getTileUrl();
    setTileConfig(newConfig);
    
    // Меняем ключ для принудительного пересоздания компонента MapView
    setMapKey(prev => prev + 1);
    
    // Показываем индикатор загрузки на короткое время
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
    
  }, [theme]); // Срабатывает ТОЛЬКО при изменении темы приложения

  // Цвета фона и текста на основе темы ПРИЛОЖЕНИЯ
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';

  useEffect(() => {
    initializeMap();
  }, []);

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

      // Загрузка карты
      setTimeout(() => {
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

  const BUILDING_ICONS = {
    main: 'business-outline',
    academic: 'school-outline',
    library: 'library-outline',
    dormitory: 'home-outline',
    sports: 'barbell-outline',
    cafeteria: 'restaurant-outline'
  };

  const getMarkerIcon = (buildingType) => {
    return BUILDING_ICONS[buildingType] || 'business-outline';
  };

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
          message={error === 'NO_INTERNET' ? 'Карта недоступна без подключения к интернету' : 'Не удалось загрузить карту'}
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
      
      {/* Ключ mapKey принудительно пересоздает MapView при изменении темы */}
      <MapView
        key={`map_${mapKey}_${theme}`}
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {/* UrlTile с URL, зависящим от темы приложения */}
        <UrlTile
          urlTemplate={tileConfig.url}
          maximumZ={19}
          flipY={false}
          tileSize={Platform.OS === 'android' ? 256 : 512}
          key={`tile_${mapKey}_${theme}`}
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

      <View style={[styles.attribution, { backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }]}>
        <Text style={[styles.attributionText, { color: theme === 'dark' ? '#ffffff' : '#333333' }]}>
          {tileConfig.attribution}
        </Text>
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
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
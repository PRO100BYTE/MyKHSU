// MapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Platform, Dimensions, TouchableOpacity, Animated } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import { buildings, initialRegion } from '../utils/buildingCoordinates';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  
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

  // URL шаблоны для разных тем карты (только OpenStreetMap)
  const MAP_THEMES = {
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

  // Иконки для разных типов зданий
  const BUILDING_ICONS = {
    main: 'business-outline',
    academic: 'school-outline',
    library: 'library-outline',
    dormitory: 'home-outline',
    sports: 'barbell-outline',
    cafeteria: 'restaurant-outline'
  };

  // Получаем настройки текущей темы карты
  const mapTheme = MAP_THEMES[theme] || MAP_THEMES.light;

  // Для Android используем только OSM, для iOS - дефолтный провайдер
  const mapProvider = Platform.OS === 'android' ? undefined : PROVIDER_DEFAULT;

  useEffect(() => {
    initializeMap();
  }, [theme]);

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
    setSelectedBuilding(building);
    setShowRouteOptions(true);
  };

  const handleRouteServiceSelect = async (service) => {
    setShowRouteOptions(false);
    
    if (!selectedBuilding) return;

    try {
      let url;
      
      switch (service) {
        case 'yandex':
          // Веб-версия Яндекс.Карт для построения маршрута
          url = `https://yandex.ru/maps/?rtext=~${selectedBuilding.latitude},${selectedBuilding.longitude}&rtt=auto`;
          break;
        case '2gis':
          // Веб-версия 2ГИС для построения маршрута
          url = `https://2gis.ru/routeSearch/rsType?from=&to=${selectedBuilding.longitude},${selectedBuilding.latitude}`;
          break;
        default:
          return;
      }

      // Всегда открываем веб-версию сервиса
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening route URL:', error);
      Alert.alert('Ошибка', 'Не удалось открыть веб-сервис для построения маршрута');
    }
  };

  const getMarkerIcon = (buildingType) => {
    return BUILDING_ICONS[buildingType] || 'business-outline';
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
          theme={theme}
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
        style={styles.map}
        provider={mapProvider}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        userInterfaceStyle={theme}
      >
        {/* Для Android используем только OSM тайлы */}
        {Platform.OS === 'android' && (
          <UrlTile
            urlTemplate={mapTheme.urlTemplate}
            maximumZ={19}
            flipY={false}
          />
        )}
        
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
            <View style={[styles.marker, { backgroundColor: colors.light }]}>
              <Icon 
                name={getMarkerIcon(building.type)} 
                size={24} 
                color={mapTheme.markerColor} 
              />
            </View>
          </Marker>
        ))}
      </MapView>
      
      {/* Аттрибуция */}
      <View style={[styles.attribution, { backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }]}>
        <Text style={[styles.attributionText, { color: theme === 'dark' ? '#ffffff' : '#333333' }]}>
          {mapTheme.attribution}
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

      {/* Информация о провайдере карты */}
      <View style={[styles.providerInfo, { backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }]}>
        <Icon 
          name={Platform.OS === 'android' ? 'logo-android' : 'logo-apple'} 
          size={12} 
          color={theme === 'dark' ? '#ffffff' : '#333333'} 
        />
        <Text style={[styles.providerInfoText, { color: theme === 'dark' ? '#ffffff' : '#333333' }]}>
          {Platform.OS === 'android' ? 'OpenStreetMap' : 'Apple Maps'}
        </Text>
      </View>

      {/* Модальное окно выбора сервиса для построения маршрута */}
      {showRouteOptions && selectedBuilding && (
        <View style={[styles.routeModal, { backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff' }]}>
          <Text style={[styles.routeModalTitle, { color: textColor }]}>
            Построить маршрут до {selectedBuilding.name}
          </Text>
          
          <TouchableOpacity 
            style={[styles.routeOption, { backgroundColor: colors.light }]}
            onPress={() => handleRouteServiceSelect('yandex')}
          >
            <View style={[styles.routeIcon, { backgroundColor: colors.primary }]}>
              <Text style={styles.routeIconText}>Я</Text>
            </View>
            <View style={styles.routeOptionText}>
              <Text style={[styles.routeOptionTitle, { color: colors.primary }]}>
                Яндекс.Карты
              </Text>
              <Text style={[styles.routeOptionDesc, { color: colors.primary }]}>
                Веб-версия сервиса
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.routeOption, { backgroundColor: colors.light, marginTop: 12 }]}
            onPress={() => handleRouteServiceSelect('2gis')}
          >
            <View style={[styles.routeIcon, { backgroundColor: colors.primary }]}>
              <Text style={styles.routeIconText}>2</Text>
            </View>
            <View style={styles.routeOptionText}>
              <Text style={[styles.routeOptionTitle, { color: colors.primary }]}>
                2ГИС
              </Text>
              <Text style={[styles.routeOptionDesc, { color: colors.primary }]}>
                Веб-версия сервиса
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.cancelButton, { marginTop: 16 }]}
            onPress={() => setShowRouteOptions(false)}
          >
            <Text style={[styles.cancelButtonText, { color: theme === 'light' ? '#6b7280' : '#9ca3af' }]}>
              Отмена
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    padding: 4,
    borderWidth: 1,
    borderColor: '#ddd',
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
  providerInfo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 16,
    padding: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerInfoText: {
    fontSize: 10,
    marginLeft: 4,
    fontFamily: 'Montserrat_400Regular',
  },
  routeModal: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 70 : 16,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  routeModalTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  routeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  routeOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  routeOptionTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  routeOptionDesc: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
});

export default MapScreen;
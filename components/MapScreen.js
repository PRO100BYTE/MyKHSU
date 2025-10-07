import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Platform, Dimensions, TouchableOpacity, Animated } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import { buildings, initialRegion } from '../utils/buildingCoordinates';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
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

  // Простые URL шаблоны для OpenStreetMap
  const getMapTheme = () => {
    if (theme === 'dark') {
      return {
        urlTemplate: 'https://tiles.wmflabs.org/dark-matter/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
      };
    }
    return {
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    };
  };

  const mapTheme = getMapTheme();

  // Иконки для разных типов зданий
  const getMarkerIcon = (buildingType) => {
    const icons = {
      main: 'business-outline',
      academic: 'school-outline',
      library: 'library-outline',
      dormitory: 'home-outline',
      sports: 'barbell-outline',
      cafeteria: 'restaurant-outline'
    };
    return icons[buildingType] || 'business-outline';
  };

  useEffect(() => {
    initializeMap();
  }, [theme]);

  const initializeMap = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Простая проверка подключения
      const netState = await NetInfo.fetch();
      setIsOnline(netState.isConnected);
      
      if (!netState.isConnected) {
        setError('NO_INTERNET');
      }

      // Минимальная задержка для инициализации
      setTimeout(() => {
        setLoading(false);
      }, 500);
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
      
      if (service === 'yandex') {
        url = `https://yandex.ru/maps/?rtext=~${selectedBuilding.latitude},${selectedBuilding.longitude}&rtt=auto`;
      } else if (service === '2gis') {
        url = `https://2gis.ru/routeSearch/rsType?from=&to=${selectedBuilding.longitude},${selectedBuilding.latitude}`;
      } else {
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening route URL:', error);
      Alert.alert('Ошибка', 'Не удалось открыть веб-сервис для построения маршрута');
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
        provider={null} // Явно отключаем провайдера для Android
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* OpenStreetMap тайлы */}
        <UrlTile
          urlTemplate={mapTheme.urlTemplate}
          maximumZ={19}
          flipY={false}
        />
        
        {/* Маркеры зданий */}
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
                size={20} 
                color={colors.primary} 
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
            style={[styles.routeOption, { backgroundColor: colors.light, marginTop: 8 }]}
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
            style={[styles.cancelButton, { marginTop: 12 }]}
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
  },
  marker: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  attribution: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  attributionText: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  routeModal: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  routeModalTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  routeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  routeOptionText: {
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
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Platform, Dimensions, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';

  // Координаты корпусов ХГУ
  const buildings = [
    {
      id: 1,
      name: 'Корпус №2 (ИТИ)',
      latitude: 53.722143,
      longitude: 91.439183,
      description: 'ул. Ленина, 92/1',
      type: 'academic'
    },
    {
      id: 2,
      name: 'Административный корпус',
      latitude: 53.722127,
      longitude: 91.438486,
      description: 'ул. Ленина, 92',
      type: 'main'
    },
    {
      id: 3,
      name: 'Корпус №1 (ИЕНиМ)',
      latitude: 53.722481,
      longitude: 91.441737,
      description: 'ул. Ленина, 90',
      type: 'academic'
    }
  ];

  // URL шаблоны для разных тем карты
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

  useEffect(() => {
    loadMap();
  }, [theme]);

  const loadMap = async () => {
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

      // Простая загрузка онлайн карты без сложного кэширования
      setTimeout(() => {
        setMapLoaded(true);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading map:', error);
      setError('LOAD_ERROR');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    loadMap();
  };

  const handleOpenDirections = async (building) => {
    const url = `https://www.openstreetmap.org/directions?from=&to=${building.latitude},${building.longitude}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Ошибка', 'Не удалось открыть приложение для построения маршрута');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Ошибка', 'Не удалось открыть приложение для построения маршрута');
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
          onPress: () => handleOpenDirections(building)
        }
      ]
    );
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
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <ConnectionError 
          type={errorType}
          loading={loading}
          onRetry={handleRetry}
          theme={theme}
          accentColor={accentColor}
          contentType="map"
          message={error === 'NO_INTERNET' ? 'Карта недоступна без подключения к интернету' : 'Не удалось загрузить карту'}
        />
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
        userInterfaceStyle={theme}
      >
        {/* Используем тайлы в зависимости от темы */}
        <UrlTile
          urlTemplate={mapTheme.urlTemplate}
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
  attribution: {
    position: 'absolute',
    bottom: 16,
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
    top: Platform.OS === 'ios' ? 50 : 20,
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
});

export default MapScreen;
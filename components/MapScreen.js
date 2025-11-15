import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Linking, 
  Platform,
  Dimensions, 
  TouchableOpacity, 
  Animated, 
  StatusBar, 
  ActivityIndicator 
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons as Icon } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ACCENT_COLORS } from '../utils/constants';
import ConnectionError from './ConnectionError';
import { buildings, initialRegion } from '../utils/buildingCoordinates';
import BuildingsListScreen from './BuildingsListScreen';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showBuildingsList, setShowBuildingsList] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [mapError, setMapError] = useState(false);
  
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  
  // Получаем API ключи
  const dgApiKey = Constants.expoConfig?.extra?.dgApiKey || Constants.manifest?.extra?.dgApiKey;
  const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken || Constants.manifest?.extra?.mapboxAccessToken;
  
  // Анимации
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const routeModalAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    initializeMap();
  }, [theme]);

  // Анимация появления модального окна
  useEffect(() => {
    if (showRouteOptions) {
      Animated.spring(routeModalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(routeModalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showRouteOptions]);

  const initializeMap = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const netState = await NetInfo.fetch();
      setIsOnline(netState.isConnected);
      
      if (!netState.isConnected) {
        setError('NO_INTERNET');
        setLoading(false);
        return;
      }

      if (!dgApiKey) {
        setError('NO_API_KEY');
        setLoading(false);
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError('LOAD_ERROR');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setWebViewKey(prev => prev + 1);
    initializeMap();
  };

  const handleViewBuildingsList = () => {
    setShowBuildingsList(true);
  };

  const handleRouteServiceSelect = async (service) => {
    // Анимация закрытия перед действием
    Animated.timing(routeModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowRouteOptions(false);
      
      if (!selectedBuilding) return;

      try {
        let url;
        
        switch (service) {
          case 'yandex':
            url = `https://yandex.ru/maps/?rtext=~${selectedBuilding.latitude},${selectedBuilding.longitude}&rtt=auto`;
            break;
          case '2gis':
            const lon = selectedBuilding.longitude;
            const lat = selectedBuilding.latitude;
            url = `https://2gis.ru/abakan/directions/points/~${lon}%2C${lat}?m=${lon}%2C${lat}%2F16`;
            break;
          default:
            return;
        }

        Linking.openURL(url);
      } catch (error) {
        console.error('Error opening route URL:', error);
        Alert.alert('Ошибка', 'Не удалось открыть веб-сервис для построения маршрута');
      }
    });
  };

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
    setShowRouteOptions(true);
    // Центрировать карту на выбранном здании
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: building.latitude,
        longitude: building.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleCloseRouteModal = () => {
    Animated.timing(routeModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowRouteOptions(false);
    });
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapLoaded':
          setMapLoaded(true);
          break;
        case 'buildingSelected':
          const building = buildings.find(b => b.id === data.buildingId);
          if (building) {
            handleBuildingSelect(building);
          }
          break;
        case 'loadError':
          console.error('2GIS map loading error:', data.error);
          setError('LOAD_ERROR');
          break;
        default:
          console.log('Unknown message from WebView:', data);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const getBuildingIcon = (type) => {
    switch (type) {
      case 'main': return 'business-outline';
      case 'academic': return 'school-outline';
      case 'library': return 'library-outline';
      case 'sports': return 'barbell-outline';
      case 'dormitory': return 'home-outline';
      case 'cafeteria': return 'restaurant-outline';
      default: return 'location-outline';
    }
  };

  const generateMapHTML = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
      <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        .attribution {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background-color: ${theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 41, 55, 0.8)'};
          padding: 4px;
          border-radius: 4px;
          font-size: 10px;
          font-family: 'Montserrat', sans-serif;
          color: ${theme === 'light' ? '#111827' : '#ffffff'};
        }
      </style>
      <script src="https://api-maps.2gis.ru/2.0.0/loader.js"></script>
      <script>
        function init() {
          const map = new DG.Map('map', {
            center: [53.7025, 91.4339],
            zoom: 15,
            controls: ['zoomControl', 'scaleLine'],
          });
          
          DG.control.layers({
            'Схема': DG.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '© OpenStreetMap contributors'
            }),
            'Спутник': DG.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
              maxZoom: 17,
              attribution: '© OpenTopoMap'
            }),
          }).addTo(map);
          
          // Обработка события выбора здания
          map.on('click', function(e) {
            const lat = e.latlng.lat;
            const lon = e.latlng.lng;
            
            // Поиск ближайшего здания по координатам
            const building = ${JSON.stringify(buildings)}.find(b => {
              return Math.abs(b.latitude - lat) < 0.0001 && Math.abs(b.longitude - lon) < 0.0001;
            });
            
            if (building) {
              // Отправка сообщения в React Native о выборе здания
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'buildingSelected',
                buildingId: building.id,
              }));
            }
          });
        }
        
        document.addEventListener('DOMContentLoaded', function() {
          init();
        });
      </script>
    </head>
    <body>
      <div id="map"></div>
      <div class="attribution">© 2GIS</div>
    </body>
    </html>
  `;

  // Если показываем список корпусов
  if (showBuildingsList) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatusBar 
          barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={bgColor}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme === 'light' ? '#ffffff' : '#1f2937' }}>
          <TouchableOpacity 
            onPress={() => setShowBuildingsList(false)}
            style={{ padding: 8, marginRight: 12 }}
          >
            <Icon name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={{ 
            color: textColor, 
            fontSize: 20, 
            fontWeight: 'bold',
            fontFamily: 'Montserrat_600SemiBold'
          }}>
            Корпуса ХГУ
          </Text>
        </View>
        <BuildingsListScreen 
          theme={theme} 
          accentColor={accentColor} 
          onBuildingSelect={handleBuildingSelect}
        />
      </View>
    );
  }

  // Если есть ошибка или загрузка, показываем соответствующий экран
  if (loading || error) {
    let errorType = error;
    let errorMessage = 'Не удалось загрузить карту';
    
    if (error === 'NO_INTERNET') {
      errorType = 'no-internet';
      errorMessage = 'Карта недоступна без подключения к интернету';
    } else if (error === 'LOAD_ERROR') {
      errorType = 'load-error';
      errorMessage = 'Не удалось загрузить карту';
    } else if (error === 'NO_API_KEY') {
      errorType = 'load-error';
      errorMessage = 'API ключ 2ГИС не настроен';
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
          onViewCache={handleViewBuildingsList}
          theme={theme}
          accentColor={accentColor}
          contentType="map"
          message={errorMessage}
          showCacheButton={true}
          cacheAvailable={true}
        />
      </Animated.View>
    );
  }

  // Стили карты для темной темы (Google Maps)
  const mapStyle = theme === 'dark' ? [
    {
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#8ec3b9"
        }
      ]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1a3646"
        }
      ]
    },
    {
      "featureType": "administrative.country",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#4b6878"
        }
      ]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#64779e"
        }
      ]
    },
    {
      "featureType": "administrative.province",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#4b6878"
        }
      ]
    },
    {
      "featureType": "landscape.man_made",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#334e87"
        }
      ]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#283d6a"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#6f9ba5"
        }
      ]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "poi.park",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#3C7680"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#304a7d"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#98a5be"
        }
      ]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#2c6675"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry.stroke",
      "stylers": [
        {
          "color": "#255763"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#b0d5ce"
        }
      ]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#023e58"
        }
      ]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#98a5be"
        }
      ]
    },
    {
      "featureType": "transit",
      "elementType": "labels.text.stroke",
      "stylers": [
        {
          "color": "#1d2c4d"
        }
      ]
    },
    {
      "featureType": "transit.line",
      "elementType": "geometry.fill",
      "stylers": [
        {
          "color": "#283d6a"
        }
      ]
    },
    {
      "featureType": "transit.station",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#3a4762"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [
        {
          "color": "#0e1626"
        }
      ]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [
        {
          "color": "#4e6d70"
        }
      ]
    }
  ] : [];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      
      {/* Заголовок с кнопкой списка корпусов */}
      <View style={[styles.header, { backgroundColor: theme === 'light' ? '#ffffff' : '#1f2937' }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Карта кампуса</Text>
        <TouchableOpacity 
          style={[styles.buildingsButton, { backgroundColor: colors.light }]}
          onPress={handleViewBuildingsList}
        >
          <Icon name="list-outline" size={20} color={colors.primary} />
          <Text style={[styles.buildingsButtonText, { color: colors.primary }]}>Список корпусов</Text>
        </TouchableOpacity>
      </View>
      
      {/* Реальная карта 2ГИС */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'android' && mapError ? (
          <WebView
            key={webViewKey}
            ref={webViewRef}
            source={{ html: generateMapHTML() }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onMessage={handleWebViewMessage}
            onLoadStart={() => setMapLoaded(false)}
            onLoadEnd={() => {
              setTimeout(() => {
                if (!mapLoaded) {
                  setError('LOAD_ERROR');
                }
              }, 10000);
            }}
          />
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            customMapStyle={mapStyle}
            initialRegion={{
              latitude: initialRegion.latitude,
              longitude: initialRegion.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            onMapReady={() => setMapLoaded(true)}
            onMarkerPress={(e) => {
              const building = buildings.find(b => b.latitude === e.nativeEvent.coordinate.latitude && b.longitude === e.nativeEvent.coordinate.longitude);
              if (building) {
                handleBuildingSelect(building);
              }
            }}
          >
            {Platform.OS === 'android' && (
              <UrlTile
                urlTemplate={theme === 'dark' 
                  ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                  : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                }
                maximumZ={19}
                flipY={false}
              />
            )}
            {buildings.map((building) => (
              <Marker
                key={building.id}
                coordinate={{
                  latitude: building.latitude,
                  longitude: building.longitude,
                }}
                title={building.name}
                description={building.description}
                onPress={() => handleBuildingSelect(building)}
              >
                <View style={[styles.marker, { 
                  backgroundColor: theme === 'light' ? '#ffffff' : '#374151',
                  borderColor: colors.primary
                }]}>
                  <Icon name={getBuildingIcon(building.type)} size={16} color={colors.primary} />
                </View>
              </Marker>
            ))}
          </MapView>
        )}
        
        {Platform.OS === 'android' && !mapError && (
          <View style={[styles.attribution, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 41, 55, 0.8)' }]}>
            <Text style={[styles.attributionText, { color: textColor }]}>© Esri</Text>
          </View>
        )}
        
        {!mapLoaded && (
          <View style={styles.loadingOverlay}>
            <View style={[styles.loadingContent, { backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: textColor, marginTop: 12 }]}>
                Загрузка карты 2ГИС...
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Модальное окно выбора сервиса для построения маршрута с анимацией */}
      {showRouteOptions && (
        <Animated.View 
          style={[
            styles.routeModalOverlay,
            { 
              opacity: routeModalAnim,
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.routeModal,
              { 
                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                transform: [{
                  translateY: routeModalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0]
                  })
                }]
              }
            ]}
          >
            <Text style={[styles.routeModalTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
              Построить маршрут до {selectedBuilding?.name}
            </Text>
            <Text style={[styles.routeModalSubtitle, { color: placeholderColor, fontFamily: 'Montserrat_400Regular' }]}>
              {selectedBuilding?.description}
            </Text>
            
            <TouchableOpacity 
              style={[styles.routeOption, { backgroundColor: colors.light }]}
              onPress={() => handleRouteServiceSelect('yandex')}
            >
              <View style={[styles.routeIcon, { backgroundColor: colors.primary }]}>
                <Text style={[styles.routeIconText, { fontFamily: 'Montserrat_700Bold' }]}>Я</Text>
              </View>
              <View style={styles.routeOptionText}>
                <Text style={[styles.routeOptionTitle, { color: colors.primary, fontFamily: 'Montserrat_600SemiBold' }]}>
                  Яндекс.Карты
                </Text>
                <Text style={[styles.routeOptionDesc, { color: colors.primary, fontFamily: 'Montserrat_400Regular' }]}>
                  Веб-версия сервиса
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.routeOption, { backgroundColor: colors.light, marginTop: 12 }]}
              onPress={() => handleRouteServiceSelect('2gis')}
            >
              <View style={[styles.routeIcon, { backgroundColor: colors.primary }]}>
                <Text style={[styles.routeIconText, { fontFamily: 'Montserrat_700Bold' }]}>2</Text>
              </View>
              <View style={styles.routeOptionText}>
                <Text style={[styles.routeOptionTitle, { color: colors.primary, fontFamily: 'Montserrat_600SemiBold' }]}>
                  2ГИС
                </Text>
                <Text style={[styles.routeOptionDesc, { color: colors.primary, fontFamily: 'Montserrat_400Regular' }]}>
                  Веб-версия сервиса
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.cancelButton, { marginTop: 16 }]}
              onPress={handleCloseRouteModal}
            >
              <Text style={[styles.cancelButtonText, { color: placeholderColor, fontFamily: 'Montserrat_500Medium' }]}>
                Отмена
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
  },
  buildingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  buildingsButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  loadingContent: {
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
  routeModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1001,
  },
  routeModal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  routeModalTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  routeModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
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
  },
  routeOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  routeOptionTitle: {
    fontSize: 16,
  },
  routeOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  attribution: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    padding: 4,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
  },
});

export default MapScreen;
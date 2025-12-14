import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ActivityIndicator,
  ScrollView
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
import Snowfall from './Snowfall';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ theme, accentColor, isNewYearMode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [showBuildingsList, setShowBuildingsList] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [mapError, setMapError] = useState(false);
  
  const colors = ACCENT_COLORS[accentColor];
  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  
  // Получаем API ключи
  const dgApiKey = Constants.expoConfig?.extra?.dgApiKey || Constants.manifest?.extra?.dgApiKey;
  const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken || Constants.manifest?.extra?.mapboxAccessToken;
  
  // Анимации
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const routeModalAnim = useRef(new Animated.Value(0)).current;
  const filtersModalAnim = useRef(new Animated.Value(0)).current;
  const mapRef = useRef(null);
  const webViewRef = useRef(null);

  // Категории фильтров
  const filterCategories = [
    { id: 'main', name: 'Административный корпус', icon: 'business-outline' },
    { id: 'academic', name: 'Учебные корпуса', icon: 'school-outline' },
    { id: 'dormitory', name: 'Общежития', icon: 'home-outline' },
    { id: 'library', name: 'Библиотеки ХГУ', icon: 'library-outline' },
    { id: 'cafeteria', name: 'Столовые ХГУ', icon: 'restaurant-outline' },
    { id: 'cardatm', name: 'Банкоматы', icon: 'card-outline' },
    { id: 'sports', name: 'Спортивные площадки', icon: 'barbell-outline' },
    { id: 'other', name: 'Прочее', icon: 'ellipse-outline' }
  ];

  // Фильтрация зданий
  const filteredBuildings = useMemo(() => {
    return buildings.filter(building => {
      if (selectedFilters.length === 0) return true;
      
      let buildingType = building.type;
      // Относим типы 5ka, sausage, shop, cafe, coffee, garden к категории "other"
      if (['5ka', 'sausage', 'shop', 'cafe', 'coffee', 'garden'].includes(building.type)) {
        buildingType = 'other';
      }
      
      return selectedFilters.includes(buildingType);
    });
  }, [selectedFilters, buildings]);

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

  // Анимация появления модального окна маршрута
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

  // Анимация появления модального окна фильтров
  useEffect(() => {
    if (showFiltersModal) {
      Animated.spring(filtersModalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(filtersModalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showFiltersModal]);

  const initializeMap = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Для Android сразу показываем заглушку
      if (Platform.OS === 'android') {
        setError('ANDROID_NOT_SUPPORTED');
        setLoading(false);
        return;
      }

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
    // Для Android retry не делает ничего, так как карта недоступна
    if (Platform.OS === 'android') {
      return;
    }
    setWebViewKey(prev => prev + 1);
    initializeMap();
  };

  const handleViewBuildingsList = () => {
    setShowBuildingsList(true);
  };

  const handleRouteServiceSelect = async (service) => {
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
    // Закрываем список корпусов, если он был открыт
    setShowBuildingsList(false);
    // Центрировать карту на выбранном здании (только для iOS)
    if (mapRef.current && Platform.OS === 'ios') {
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

  const handleToggleFilter = (filterId) => {
    setSelectedFilters(prev => {
      if (prev.includes(filterId)) {
        return prev.filter(id => id !== filterId);
      } else {
        return [...prev, filterId];
      }
    });
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
  };

  const handleCloseFiltersModal = () => {
    Animated.timing(filtersModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowFiltersModal(false);
    });
  };

  const getBuildingIcon = (type) => {
    switch (type) {
      case 'main': return 'business-outline';
      case 'academic': return 'school-outline';
      case 'library': return 'library-outline';
      case 'sports': return 'barbell-outline';
      case 'dormitory': return 'home-outline';
      case 'cafeteria': return 'restaurant-outline';
      case '5ka': return 'nutrition-outline';
      case 'sausage': return 'fast-food-outline';
      case 'shop': return 'cart-outline';
      case 'garden': return 'people-outline';
      case 'cardatm': return 'card-outline';
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
        {isNewYearMode && <Snowfall theme={theme} intensity={0.8} />}
        
        <View style={{ flex: 1, zIndex: 2 }}>
          <StatusBar 
            barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
            backgroundColor={bgColor}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: cardBg }}>
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
    } else if (error === 'ANDROID_NOT_SUPPORTED') {
      errorType = 'android-not-supported';
      errorMessage = 'В данный момент карта недоступна на платформе Android из-за отсутствия необходимых API ключей и ресурсов. Мы делаем все возможное, чтобы восстановить работоспособность карты на Android в кратчайшие сроки. Следите за обновлениями!';
    }

    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        {isNewYearMode && <Snowfall theme={theme} intensity={0.8} />}
        <Animated.View style={{ flex: 1, opacity: fadeAnim, zIndex: 2 }}>
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
            showFreshmanHint={true}
          />
        </Animated.View>
      </View>
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
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Снегопад для новогоднего режима */}
      {isNewYearMode && <Snowfall theme={theme} intensity={0.8} />}
      
      <Animated.View style={[styles.container, { opacity: fadeAnim, zIndex: 2 }]}>
        <StatusBar 
          barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={bgColor}
        />
        
        {/* Заголовок с кнопкой фильтров */}
      <View style={[styles.header, { backgroundColor: cardBg }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Корпуса ХГУ</Text>
          {selectedFilters.length > 0 && (
            <View style={[styles.activeFiltersBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.activeFiltersText}>{selectedFilters.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.filtersButton, { backgroundColor: colors.light }]}
          onPress={() => setShowFiltersModal(true)}
        >
          <Icon name="filter-outline" size={20} color={colors.primary} />
          <Text style={[styles.filtersButtonText, { color: colors.primary }]}>Фильтры</Text>
        </TouchableOpacity>
      </View>
      
      {/* ============================================ */}
      {/* КОД КАРТЫ ДЛЯ ANDROID (ЗАКОММЕНТИРОВАН ДЛЯ ВОЗМОЖНОГО ВОССТАНОВЛЕНИЯ) */}
      {/* ============================================ */}
      {/*
      {Platform.OS === 'android' && mapError ? (
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onLoadStart={() => setMapLoaded(false)}
          onLoadEnd={() => {
            setTimeout(() => {
              if (!mapLoaded) {
                setError('LOAD_ERROR');
              }
            }, 10000);
          }}
        />
      ) : ( */}
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
            const building = filteredBuildings.find(b => b.latitude === e.nativeEvent.coordinate.latitude && b.longitude === e.nativeEvent.coordinate.longitude);
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
          {filteredBuildings.map((building) => (
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
      {/* )} */}
      {/* ============================================ */}
      {/* КОНЕЦ ЗАКОММЕНТИРОВАННОГО КОДА ДЛЯ ANDROID */}
      {/* ============================================ */}
      
      {Platform.OS === 'android' && !mapError && (
        <View style={[styles.attribution, { backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 41, 55, 0.8)' }]}>
          <Text style={[styles.attributionText, { color: textColor }]}>© Esri</Text>
        </View>
      )}
      
      {!mapLoaded && Platform.OS === 'ios' && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContent, { backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff' }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: textColor, marginTop: 12 }]}>
              Загрузка карты...
            </Text>
          </View>
        </View>
      )}

      {/* Модальное окно фильтров */}
      {showFiltersModal && Platform.OS === 'ios' && (
        <Animated.View 
          style={[
            styles.filtersModalOverlay,
            { 
              opacity: filtersModalAnim,
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.filtersModal,
              { 
                backgroundColor: cardBg,
                transform: [{
                  translateY: filtersModalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0]
                  })
                }]
              }
            ]}
          >
            <View style={styles.filtersHeader}>
              <Text style={[styles.filtersTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
                Фильтры
              </Text>
              <TouchableOpacity onPress={handleCloseFiltersModal}>
                <Icon name="close" size={24} color={placeholderColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersList} showsVerticalScrollIndicator={false}>
              {filterCategories.map((category, index) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterItem,
                    { 
                      backgroundColor: selectedFilters.includes(category.id) ? colors.light + '40' : 'transparent',
                      borderBottomWidth: index === filterCategories.length - 1 ? 0 : 1,
                      borderBottomColor: theme === 'light' ? '#f3f4f6' : '#374151',
                    }
                  ]}
                  onPress={() => handleToggleFilter(category.id)}
                >
                  <View style={styles.filterItemLeft}>
                    <View style={[styles.filterIcon, { backgroundColor: selectedFilters.includes(category.id) ? colors.primary : colors.light }]}>
                      <Icon name={category.icon} size={18} color={selectedFilters.includes(category.id) ? '#ffffff' : colors.primary} />
                    </View>
                    <Text style={[styles.filterName, { 
                      color: selectedFilters.includes(category.id) ? colors.primary : textColor, 
                      fontFamily: 'Montserrat_500Medium' 
                    }]}>
                      {category.name}
                    </Text>
                  </View>
                  {selectedFilters.includes(category.id) && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.filtersFooter}>
              <TouchableOpacity 
                style={[styles.clearButton, { borderColor: colors.primary }]}
                onPress={handleClearFilters}
              >
                <Text style={[styles.clearButtonText, { color: colors.primary, fontFamily: 'Montserrat_500Medium' }]}>
                  Сбросить
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
                onPress={handleCloseFiltersModal}
              >
                <Text style={[styles.applyButtonText, { fontFamily: 'Montserrat_500Medium' }]}>
                  Применить
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Модальное окно выбора сервиса для построения маршрута с анимацией */}
      {showRouteOptions && Platform.OS === 'ios' && (
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
                backgroundColor: cardBg,
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
    </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
  },
  activeFiltersBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  activeFiltersText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filtersButtonText: {
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
  filtersModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1001,
  },
  filtersModal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filtersTitle: {
    fontSize: 18,
  },
  filtersList: {
    maxHeight: 400,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  filterItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  filterName: {
    fontSize: 16,
    flex: 1,
  },
  filtersFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  routeModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1002,
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
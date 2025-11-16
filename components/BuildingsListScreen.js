import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  StyleSheet, 
  Animated, 
  StatusBar, 
  Alert,
  Platform 
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS } from '../utils/constants';
import { buildings } from '../utils/buildingCoordinates';

const BuildingsListScreen = ({ theme, accentColor, onBuildingSelect }) => {
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const routeModalAnim = useRef(new Animated.Value(0)).current;

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Группировка зданий по категориям
  const groupedBuildings = {
    main: buildings.filter(b => b.type === 'main'),
    academic: buildings.filter(b => b.type === 'academic'),
    dormitory: buildings.filter(b => b.type === 'dormitory'),
    library: buildings.filter(b => b.type === 'library'),
    cafeteria: buildings.filter(b => b.type === 'cafeteria'),
    cardatm: buildings.filter(b => b.type === 'cardatm'),
    sports: buildings.filter(b => b.type === 'sports'),
    other: buildings.filter(b => ['5ka', 'sausage', 'shop', 'cafe', 'coffee', 'garden'].includes(b.type))
  };

  // Названия категорий
  const categoryNames = {
    main: 'Административный корпус',
    academic: 'Учебные корпуса',
    dormitory: 'Общежития',
    library: 'Библиотеки ХГУ',
    cafeteria: 'Столовые ХГУ',
    cardatm: 'Банкоматы',
    sports: 'Спортивные площадки',
    other: 'Прочее'
  };

  // Анимация модального окна
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

  const handleBuildingPress = (building) => {
    if (onBuildingSelect) {
      onBuildingSelect(building);
    } else {
      setSelectedBuilding(building);
      setShowRouteOptions(true);
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

  const getBuildingTypeText = (type) => {
    switch (type) {
      case 'main': return 'Административный корпус';
      case 'academic': return 'Учебный корпус';
      case 'library': return 'Библиотека';
      case 'sports': return 'Спортивный комплекс';
      case 'dormitory': return 'Общежитие';
      case 'cafeteria': return 'Столовая';
      case '5ka': return 'Магазин "Пятёрочка"';
      case 'sausage': return 'Сосисочная';
      case 'shop': return 'Магазин';
      case 'garden': return 'Университетский сквер';
      case 'cardatm': return 'Банкомат';
      default: return 'Корпус';
    }
  };

  const renderBuildingCard = (building, isLast = false) => (
    <TouchableOpacity 
      key={building.id}
      style={{ 
        backgroundColor: cardBg, 
        borderRadius: 12, 
        padding: 16, 
        marginBottom: isLast ? 0 : 8,
        marginLeft: 16,
        flexDirection: 'row',
        alignItems: 'center'
      }}
      onPress={() => handleBuildingPress(building)}
    >
      <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
        <Icon 
          name={getBuildingIcon(building.type)} 
          size={20} 
          color={colors.primary} 
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>
          {building.name}
        </Text>
        <Text style={{ color: placeholderColor, fontSize: 12, marginTop: 2, fontFamily: 'Montserrat_400Regular' }}>
          {getBuildingTypeText(building.type)}
        </Text>
        <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
          {building.description}
        </Text>
      </View>
      <Icon name="navigate-outline" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  const renderCategorySection = (category, buildingsList) => {
    if (buildingsList.length === 0) return null;
    
    const isExpanded = expandedSections[category];
    
    return (
      <View key={category} style={{ marginBottom: 16 }}>
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            backgroundColor: cardBg,
            borderRadius: 12,
          }}
          onPress={() => toggleSection(category)}
        >
          <Text style={{ 
            color: textColor, 
            fontSize: 18, 
            fontFamily: 'Montserrat_600SemiBold' 
          }}>
            {categoryNames[category]} ({buildingsList.length})
          </Text>
          <Icon 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={colors.primary} 
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={{ marginTop: 8 }}>
            {buildingsList.map((building, index) => 
              renderBuildingCard(building, index === buildingsList.length - 1)
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Animated.View style={{ flex: 1, backgroundColor: bgColor, opacity: fadeAnim }}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ 
            color: placeholderColor, 
            fontSize: 16,
            fontFamily: 'Montserrat_400Regular',
            lineHeight: 22
          }}>
            Все корпуса Хакасского государственного университета.{'\n'}
            Выберите корпус для построения маршрута.
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {Object.entries(groupedBuildings).map(([category, buildingsList]) => 
            renderCategorySection(category, buildingsList)
          )}
          
          {/* Информационный блок */}
          <View style={[styles.infoCard, { backgroundColor: colors.light, marginTop: 16 }]}>
            <Icon name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary, marginLeft: 8, flex: 1 }]}>
              Для построения маршрута выберите корпус и сервис навигации
            </Text>
          </View>
        </ScrollView>
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
              Построить маршрут
            </Text>
            <Text style={[styles.routeModalSubtitle, { color: textColor, fontFamily: 'Montserrat_500Medium' }]}>
              {selectedBuilding?.name}
            </Text>
            <Text style={[styles.routeModalDescription, { color: placeholderColor, fontFamily: 'Montserrat_400Regular' }]}>
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
                  Открыть в веб-браузере
                </Text>
              </View>
              <Icon name="open-outline" size={20} color={colors.primary} />
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
                  Открыть в веб-браузере
                </Text>
              </View>
              <Icon name="open-outline" size={20} color={colors.primary} />
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
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
    fontSize: 16,
    marginBottom: 2,
  },
  routeModalDescription: {
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
});

export default BuildingsListScreen;
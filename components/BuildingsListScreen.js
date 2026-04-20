import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  TextInput,
  Linking, 
  StyleSheet, 
  Animated, 
  StatusBar, 
  Alert,
  Platform 
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import { buildings } from '../utils/buildingCoordinates';
import Snowfall from './Snowfall';

const BuildingsListScreen = ({ theme, accentColor, onBuildingSelect, isNewYearMode }) => {
  const [showRouteOptions, setShowRouteOptions] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ academic: true });
  const [searchQuery, setSearchQuery] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const routeModalAnim = useRef(new Animated.Value(0)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const cardBg = glass.surfaceCard;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const colors = ACCENT_COLORS[accentColor];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Группировка зданий по категориям
  const groupedBuildings = useMemo(() => ({
    main: buildings.filter(b => b.type === 'main'),
    academic: buildings.filter(b => b.type === 'academic'),
    dormitory: buildings.filter(b => b.type === 'dormitory'),
    library: buildings.filter(b => b.type === 'library'),
    cafeteria: buildings.filter(b => b.type === 'cafeteria'),
    cardatm: buildings.filter(b => b.type === 'cardatm'),
    sports: buildings.filter(b => b.type === 'sports'),
    other: buildings.filter(b => ['5ka', 'sausage', 'shop', 'cafe', 'coffee', 'garden'].includes(b.type))
  }), []);

  // Фильтрация зданий по поисковому запросу
  const filteredGroupedBuildings = useMemo(() => {
    if (!searchQuery.trim()) return groupedBuildings;
    const query = searchQuery.toLowerCase();
    const filtered = {};
    for (const [key, list] of Object.entries(groupedBuildings)) {
      const matches = list.filter(b => 
        b.name.toLowerCase().includes(query) || 
        b.description.toLowerCase().includes(query)
      );
      if (matches.length > 0) filtered[key] = matches;
    }
    return filtered;
  }, [groupedBuildings, searchQuery]);

  const totalFilteredCount = useMemo(() => {
    return Object.values(filteredGroupedBuildings).reduce((sum, list) => sum + list.length, 0);
  }, [filteredGroupedBuildings]);

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
        flexDirection: 'row',
        backgroundColor: glass.surfaceSecondary, 
        borderRadius: 14, 
        marginBottom: isLast ? 0 : 8,
        marginLeft: 16,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glass.border,
        overflow: 'hidden',
        shadowColor: glass.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      }}
      onPress={() => handleBuildingPress(building)}
    >
      {/* Цветная полоска-акцент слева */}
      <View style={{
        width: 3,
        backgroundColor: colors.primary,
        alignSelf: 'stretch',
        borderTopLeftRadius: 14,
        borderBottomLeftRadius: 14,
      }} />
      
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 }}>
        <View style={{ 
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.glass, 
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.glassBorder,
        }}>
          <Icon 
            name={getBuildingIcon(building.type)} 
            size={18} 
            color={colors.primary} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_500Medium' }}>
            {building.name}
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 12, marginTop: 2, fontFamily: 'Montserrat_400Regular' }}>
            {getBuildingTypeText(building.type)}
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 13, marginTop: 3, fontFamily: 'Montserrat_400Regular', lineHeight: 18 }}>
            {building.description}
          </Text>
        </View>
        <Icon name="navigate-outline" size={20} color={colors.primary} />
      </View>
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
            padding: 14,
            backgroundColor: glass.surfaceSecondary,
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
            shadowColor: glass.shadowColor,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 1,
          }}
          onPress={() => toggleSection(category)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={{ 
              color: textColor, 
              fontSize: 16, 
              fontFamily: 'Montserrat_600SemiBold' 
            }}>
              {categoryNames[category]}
            </Text>
            <View style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: colors.primary + '18',
            }}>
              <Text style={{ 
                fontSize: 12, 
                color: colors.primary, 
                fontFamily: 'Montserrat_600SemiBold' 
              }}>
                {buildingsList.length}
              </Text>
            </View>
          </View>
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
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Снегопад для новогоднего режима */}
      {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim, zIndex: 2 }}>
        <StatusBar 
          barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={bgColor}
        />

        <View style={{ flex: 1, padding: 16 }}>
          {/* Поиск */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: glass.surfaceTertiary,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
          }}>
            <Icon name="search-outline" size={18} color={placeholderColor} />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 10,
                fontSize: 15,
                fontFamily: 'Montserrat_400Regular',
                color: textColor,
                paddingVertical: 0,
              }}
              placeholder="Поиск корпусов..."
              placeholderTextColor={placeholderColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color={placeholderColor} />
              </TouchableOpacity>
            )}
          </View>

          {/* Счётчик результатов */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: placeholderColor, fontSize: 13, fontFamily: 'Montserrat_400Regular' }}>
              {searchQuery ? `Найдено: ${totalFilteredCount}` : `Всего объектов: ${buildings.length}`}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {Object.entries(filteredGroupedBuildings).map(([category, buildingsList]) => 
              renderCategorySection(category, buildingsList)
            )}
            
            {searchQuery && totalFilteredCount === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Icon name="search-outline" size={48} color={placeholderColor} style={{ opacity: 0.4, marginBottom: 12 }} />
                <Text style={{ color: placeholderColor, fontSize: 16, fontFamily: 'Montserrat_500Medium', textAlign: 'center' }}>
                  Ничего не найдено
                </Text>
                <Text style={{ color: placeholderColor, fontSize: 14, fontFamily: 'Montserrat_400Regular', textAlign: 'center', marginTop: 4 }}>
                  Попробуйте изменить запрос
                </Text>
              </View>
            )}
            
            {!searchQuery && (
              <View style={[styles.infoCard, { backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder, marginTop: 16 }]}>
                <Icon name="information-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor, marginLeft: 8, flex: 1 }]}>
                  Для построения маршрута выберите корпус и сервис навигации
                </Text>
              </View>
            )}
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
            <TouchableWithoutFeedback onPress={handleCloseRouteModal}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.routeModal,
                { 
                  backgroundColor: glass.backgroundElevated,
                  borderColor: glass.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderBottomWidth: 0,
                  transform: [{
                    translateY: routeModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0]
                    })
                  }]
                }
              ]}
            >
              {/* Header with close button */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }}>
                  <Icon name="navigate-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeModalTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
                    {selectedBuilding?.name}
                  </Text>
                  <Text style={{ color: placeholderColor, fontSize: 13, fontFamily: 'Montserrat_400Regular', marginTop: 2 }}>
                    {selectedBuilding?.description}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={handleCloseRouteModal}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: glass.surfaceTertiary, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Icon name="close" size={18} color={placeholderColor} />
                </TouchableOpacity>
              </View>
              
              <Text style={{ color: placeholderColor, fontSize: 13, fontFamily: 'Montserrat_500Medium', marginBottom: 12 }}>
                Выберите сервис навигации
              </Text>
              
              <TouchableOpacity 
                style={[styles.routeOption, { backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }]}
                onPress={() => handleRouteServiceSelect('yandex')}
              >
                <View style={[styles.routeIcon, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.routeIconText, { fontFamily: 'Montserrat_700Bold' }]}>Я</Text>
                </View>
                <View style={styles.routeOptionText}>
                  <Text style={[styles.routeOptionTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
                    Яндекс.Карты
                  </Text>
                  <Text style={[styles.routeOptionDesc, { color: placeholderColor, fontFamily: 'Montserrat_400Regular' }]}>
                    Откроется в браузере
                  </Text>
                </View>
                <Icon name="open-outline" size={18} color={placeholderColor} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.routeOption, { backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder, marginTop: 10 }]}
                onPress={() => handleRouteServiceSelect('2gis')}
              >
                <View style={[styles.routeIcon, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.routeIconText, { fontFamily: 'Montserrat_700Bold' }]}>2</Text>
                </View>
                <View style={styles.routeOptionText}>
                  <Text style={[styles.routeOptionTitle, { color: textColor, fontFamily: 'Montserrat_600SemiBold' }]}>
                    2ГИС
                  </Text>
                  <Text style={[styles.routeOptionDesc, { color: placeholderColor, fontFamily: 'Montserrat_400Regular' }]}>
                    Откроется в браузере
                  </Text>
                </View>
                <Icon name="open-outline" size={18} color={placeholderColor} />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 100 : 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  routeModalTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  routeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
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
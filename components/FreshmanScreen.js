import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Platform, Animated, StatusBar } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import UnderDevelopmentModal from './UnderDevelopmentModal';
import BuildingsListScreen from './BuildingsListScreen';
import Snowfall from './Snowfall';

const FreshmanScreen = forwardRef(({ theme, accentColor, isNewYearMode, onNavigationChange }, ref) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentGroupType, setCurrentGroupType] = useState(null);
  const [showBuildingsList, setShowBuildingsList] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const cardBg = glass.surfaceCard;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const colors = ACCENT_COLORS[accentColor];

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (showBuildingsList) {
        setShowBuildingsList(false);
      } else if (currentGroupType === 'vk' || currentGroupType === 'telegram') {
        setCurrentGroupType('main');
      } else if (currentGroupType === 'main') {
        setCurrentGroupType(null);
      }
    },
  }));

  // Notify parent about navigation state changes
  useEffect(() => {
    let title = null;
    if (showBuildingsList) {
      title = 'Корпуса ХГУ';
    } else if (currentGroupType === 'vk') {
      title = 'Группы ВКонтакте';
    } else if (currentGroupType === 'telegram') {
      title = 'Группы Telegram';
    } else if (currentGroupType === 'main') {
      title = 'Полезные группы';
    }
    if (onNavigationChange) onNavigationChange(title);
  }, [showBuildingsList, currentGroupType]);

  // Простая анимация fade при смене экрана
  useEffect(() => {
    // Сбрасываем прозрачность
    fadeAnim.setValue(0);
    
    // Плавное появление
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [currentGroupType, showBuildingsList]);

  // Функции для открытия ссылок
  const openITIWebsite = () => {
    Linking.openURL('https://iti.khsu.ru');
  };

  const openEduPortal = () => {
    Linking.openURL('https://edu.khsu.ru');
  };

  const openNewEduPortal = () => {
    Linking.openURL('https://newdo.khsu.ru');
  };

  const openLink = (url) => {
    Linking.openURL(url);
  };

  // Данные для групп ВКонтакте
  const vkGroups = [
    {
      id: 1,
      name: 'Хакасский государственный университет им. Н.Ф.Катанова',
      url: 'https://vk.com/khsu_ru',
      icon: 'school-outline'
    },
    {
      id: 2,
      name: 'Инженерно-технологический институт ХГУ',
      url: 'https://vk.com/khsu_iit',
      icon: 'business-outline'
    },
    {
      id: 3,
      name: 'Кафедра ПОВТиАС ИТИ ХГУ',
      url: 'https://vk.com/kafedrapovtias',
      icon: 'code-slash-outline'
    },
    {
      id: 4,
      name: 'Кафедра ЦТиД ИТИ ХГУ',
      url: 'https://vk.com/public212642505',
      icon: 'color-palette-outline'
    },
    {
      id: 5,
      name: 'Медиацентр "404"',
      url: 'https://vk.com/iti_404',
      icon: 'camera-outline'
    },
    {
      id: 6,
      name: 'Совет обучающихся ХГУ',
      url: 'https://vk.com/so_khsu',
      icon: 'people-outline'
    },
    {
      id: 7,
      name: 'Профсоюзная организация обучающихся ХГУ',
      url: 'https://vk.com/pos_khsu',
      icon: 'shield-checkmark-outline'
    },
    {
      id: 8,
      name: 'Профбюро ИТИ',
      url: 'https://vk.com/prof_iti_khsu',
      icon: 'briefcase-outline'
    },
    {
      id: 9,
      name: 'ХГУ Спорт ИТИ',
      url: 'https://vk.com/club178703236',
      icon: 'barbell-outline'
    }
  ];

  // Рендер карточки раздела
  const renderSectionCard = (icon, title, description, onPress, isLast = false) => (
    <TouchableOpacity 
      style={{ 
        flexDirection: 'row',
        backgroundColor: glass.surfaceSecondary, 
        borderRadius: 16, 
        marginBottom: isLast ? 0 : 12,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glass.border,
        overflow: 'hidden',
        shadowColor: glass.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}
      onPress={onPress}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <View style={{ 
          width: 42, 
          height: 42, 
          borderRadius: 12, 
          backgroundColor: colors.glass, 
          justifyContent: 'center', 
          alignItems: 'center',
          marginRight: 14,
          borderWidth: StyleSheet.hairlineWidth, 
          borderColor: colors.glassBorder,
        }}>
          <Icon name={icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_500Medium' }}>
            {title}
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 13, marginTop: 3, fontFamily: 'Montserrat_400Regular', lineHeight: 18 }}>
            {description}
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={placeholderColor} />
      </View>
    </TouchableOpacity>
  );

  // Рендер карточки группы
  const renderGroupCard = (group, isLast = false) => (
    <TouchableOpacity 
      key={group.id}
      style={{ 
        flexDirection: 'row',
        backgroundColor: glass.surfaceSecondary, 
        borderRadius: 14, 
        marginBottom: isLast ? 0 : 10,
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
      onPress={() => openLink(group.url)}
    >
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
          <Icon name={group.icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 14, fontFamily: 'Montserrat_500Medium', lineHeight: 19 }}>
            {group.name}
          </Text>
        </View>
        <Icon name="open-outline" size={18} color={placeholderColor} />
      </View>
    </TouchableOpacity>
  );

  // Главный экран разделов
  const renderMainSections = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>
      {renderSectionCard(
        'people-outline',
        'Преподаватели',
        'Информация о преподавателях ИТИ ХГУ',
        () => setModalVisible(true)
      )}
      
      {renderSectionCard(
        'business-outline',
        'Корпуса ХГУ',
        'Список всех корпусов университета с маршрутами',
        () => setShowBuildingsList(true)
      )}
      
      {renderSectionCard(
        'globe-outline',
        'Сайт ИТИ ХГУ',
        'Официальный сайт Инженерно-технологического института',
        openITIWebsite
      )}
      
      {renderSectionCard(
        'laptop-outline',
        'Образовательный портал ХГУ',
        'Электронная образовательная среда университета',
        openEduPortal
      )}
      
      {renderSectionCard(
        'school-outline',
        'Новый образовательный портал ХГУ (Moodle)',
        'Современная платформа для дистанционного обучения',
        openNewEduPortal
      )}
      
      {renderSectionCard(
        'chatbubbles-outline',
        'Полезные группы (сообщества)',
        'Группы и сообщества ВКонтакте и Telegram',
        () => setCurrentGroupType('main'),
        true
      )}
    </ScrollView>
  );

  // Экран групп ВКонтакте
  const renderVKGroups = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <ScrollView>
        {vkGroups.map((group, index) => 
          renderGroupCard(group, index === vkGroups.length - 1)
        )}
      </ScrollView>
    </View>
  );

  // Экран групп Telegram
  const renderTelegramGroups = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ 
        backgroundColor: glass.surfaceSecondary, 
        borderRadius: 16, 
        padding: 28, 
        alignItems: 'center',
        marginTop: 40,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glass.border,
        shadowColor: glass.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}>
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: 'rgba(0, 136, 204, 0.1)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 14,
        }}>
          <Icon name="paper-plane-outline" size={28} color="#0088cc" />
        </View>
        <Text style={{ 
          color: textColor, 
          fontSize: 16, 
          fontFamily: 'Montserrat_500Medium',
          textAlign: 'center',
          marginBottom: 4,
        }}>
          Скоро здесь появятся группы
        </Text>
        <Text style={{ 
          color: placeholderColor, 
          fontSize: 14, 
          textAlign: 'center', 
          fontFamily: 'Montserrat_400Regular',
          lineHeight: 20,
        }}>
          Мы работаем над добавлением Telegram-каналов и чатов
        </Text>
      </View>
    </View>
  );

  // Экран выбора типа групп
  const renderGroupTypeSelection = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ 
        color: placeholderColor, 
        fontSize: 14, 
        marginBottom: 24,
        fontFamily: 'Montserrat_400Regular'
      }}>
        Выберите платформу для просмотра групп и сообществ
      </Text>

      {renderSectionCard(
        'logo-vk',
        'Группы ВКонтакте',
        'Официальные группы и сообщества ВКонтакте',
        () => setCurrentGroupType('vk')
      )}
      
      {renderSectionCard(
        'paper-plane-outline',
        'Группы Telegram',
        'Каналы и чаты в Telegram',
        () => setCurrentGroupType('telegram'),
        true
      )}
    </View>
  );

  // Рендер списка корпусов
  const renderBuildingsList = () => (
    <View style={{ flex: 1 }}>
      <BuildingsListScreen 
        theme={theme} 
        accentColor={accentColor} 
      />
    </View>
  );

  // Рендер текущего экрана с анимацией
  const renderCurrentScreen = () => {
    if (showBuildingsList) {
      return renderBuildingsList();
    } else if (!currentGroupType) {
      return renderMainSections();
    } else if (currentGroupType === 'main') {
      return renderGroupTypeSelection();
    } else if (currentGroupType === 'vk') {
      return renderVKGroups();
    } else if (currentGroupType === 'telegram') {
      return renderTelegramGroups();
    }
    return null;
  };

return (
  <View style={{ flex: 1, backgroundColor: bgColor }}>
    {/* Снегопад для новогоднего режима */}
    {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
    
    <View style={{ flex: 1, zIndex: 2 }}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      
      {/* Рендер текущего экрана с анимацией */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {renderCurrentScreen()}
      </Animated.View>

      {/* Модальное окно заглушки */}
      <UnderDevelopmentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        theme={theme}
        accentColor={accentColor}
        featureName="Информация о преподавателях"
      />
    </View>
  </View>
);
});

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default FreshmanScreen;
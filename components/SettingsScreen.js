import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  Animated, 
  StatusBar,
  Dimensions
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import AppearanceSettingsSheet from './AppearanceSettingsSheet';
import AboutModal from './AboutModal';
import NotificationSettingsModal from './NotificationSettingsModal';
import ScheduleFormatModal from './ScheduleFormatModal';
import { ACCENT_COLORS, APP_VERSION, APP_DEVELOPERS, APP_SUPPORTERS, GITHUB_REPO_URL, BUILD_VER, BUILD_DATE, LIQUID_GLASS } from '../utils/constants';
import { getGlassSettingsCardStyle, getGlassIconBadgeStyle } from '../utils/liquidGlass';
import Snowfall from './Snowfall';

const { width, height } = Dimensions.get('window');

const ConfettiParticle = ({ particle, theme, colors }) => {
  const { 
    id, 
    emoji, 
    x, 
    y, 
    rotateAnim, 
    fallAnim, 
    swingAnim, 
    opacityAnim, 
    size, 
    startDelay 
  } = particle;

  // Интерполяции для анимаций
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1080deg']
  });

  const fallInterpolate = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [y, height + 100]
  });

  const swingInterpolate = swingAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, x * 0.3, 0]
  });

  return (
    <Animated.View
      key={id}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: [
          { translateY: fallInterpolate },
          { translateX: swingInterpolate },
          { rotate: rotateInterpolate }
        ],
        opacity: opacityAnim,
        zIndex: 1000,
      }}
    >
      <Text style={{ 
        fontSize: size,
        color: colors.primary,
        textShadowColor: theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      }}>
        {emoji}
      </Text>
    </Animated.View>
  );
};

const Confetti = ({ show, theme, colors }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      createConfetti();
    } else {
      setParticles([]);
    }
  }, [show]);

  const createConfetti = () => {
    const emojis = ['🎉', '✨', '🌟', '⭐', '🎊', '🥳', '🎁', '🎈', '💫', '🔥', '💥', '🎇', '🎆', '🪅', '🪩'];
    const newParticles = [];
    const particleCount = 80; // Увеличим количество частиц
    
    for (let i = 0; i < particleCount; i++) {
      // Случайная позиция по X (по всей ширине экрана)
      const x = Math.random() * width;
      // Начальная позиция Y (выше видимой области)
      const y = -Math.random() * 100 - 50;
      // Случайный размер
      const size = Math.random() * 20 + 20; // 20-40px
      // Случайная задержка
      const startDelay = Math.random() * 1000;
      // Случайная эмодзи
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      
      const particle = {
        id: i,
        emoji,
        x,
        y,
        rotateAnim: new Animated.Value(0),
        fallAnim: new Animated.Value(0),
        swingAnim: new Animated.Value(0),
        opacityAnim: new Animated.Value(1),
        size,
        startDelay
      };
      
      newParticles.push(particle);
      
      // Запускаем анимации с задержкой
      setTimeout(() => {
        // Анимация вращения
        Animated.timing(particle.rotateAnim, {
          toValue: 1,
          duration: Math.random() * 2000 + 3000, // 3-5 секунд
          useNativeDriver: true,
        }).start();
        
        // Анимация падения
        Animated.timing(particle.fallAnim, {
          toValue: 1,
          duration: Math.random() * 2000 + 3000, // 3-5 секунд
          useNativeDriver: true,
          easing: Animated.quad, // Более естественное падение
        }).start();
        
        // Анимация качания (свинга)
        Animated.sequence([
          Animated.timing(particle.swingAnim, {
            toValue: 0.5,
            duration: Math.random() * 1000 + 1000,
            useNativeDriver: true,
            easing: Animated.ease,
          }),
          Animated.timing(particle.swingAnim, {
            toValue: 1,
            duration: Math.random() * 1000 + 1000,
            useNativeDriver: true,
            easing: Animated.ease,
          })
        ]).start();
        
        // Анимация исчезновения
        setTimeout(() => {
          Animated.timing(particle.opacityAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }, Math.random() * 1000 + 2000); // Исчезают через 2-3 секунды
      }, startDelay);
    }
    
    setParticles(newParticles);
  };

  if (!show || particles.length === 0) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999,
      pointerEvents: 'none',
    }}>
      {particles.map(particle => (
        <ConfettiParticle 
          key={particle.id} 
          particle={particle} 
          theme={theme} 
          colors={colors} 
        />
      ))}
    </View>
  );
};

const SettingsScreen = ({ theme, accentColor, setTheme, setAccentColor, onScheduleSettingsChange, onTabbarSettingsChange, isNewYearMode }) => {
  const [appearanceSheetVisible, setAppearanceSheetVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [scheduleFormatModalVisible, setScheduleFormatModalVisible] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState(null);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [easterEggActive, setEasterEggActive] = useState(false);
  const [secretMessage, setSecretMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Анимация появления
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const cardBg = glass.surfaceCard;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = glass.border;
  const hintBgColor = glass.surfaceTertiary;
  const glassCardStyle = getGlassSettingsCardStyle(theme);
  const glassIconBadge = getGlassIconBadgeStyle(theme, accentColor);

  // Сообщения для пасхалки
  const easterEggMessages = [
    'Секретный уровень разблокирован! 🎉',
    'ХГУ - лучший университет! 💻',
    'Разработано с любовью к студентам 💕',
    'Кто ищет, тот всегда найдет 👀',
    'А ты настойчивый! Продолжай в том же духе! 🔥',
    'Ты обнаружил секретную функцию! 🥳',
    'ИТИ ХГУ гордится такими студентами! 🎓',
    'Ты настоящий исследователь! 🔍',
    'Приложение стало лучше благодаря тебе! ✨',
    'Ты заслужил виртуальное печенье! 🍪'
  ];

  // Запуск анимации при монтировании
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Загружаем настройки при монтировании
  useEffect(() => {
    loadScheduleSettings();
  }, []);

  // Обработчик нажатия на версию
  const handleVersionPress = () => {
    const newCount = versionTapCount + 1;
    setVersionTapCount(newCount);
    
    // Активируем пасхалку при 5 нажатиях
    if (newCount >= 5 && !easterEggActive) {
      setEasterEggActive(true);
      
      // Выбираем случайное сообщение
      const randomMessage = easterEggMessages[Math.floor(Math.random() * easterEggMessages.length)];
      setSecretMessage(randomMessage);
      
      // Запускаем конфетти
      setShowConfetti(true);
      
      // Автоматически скрываем конфетти через 3.5 секунды
      setTimeout(() => {
        setShowConfetti(false);
      }, 3500);
      
      // Показываем алерт с секретным сообщением
      Alert.alert(
        '🎉 Пасхалка обнаружена!',
        randomMessage,
        [
          {
            text: 'Круто!',
            onPress: () => {
              // Сбрасываем счетчик через 5 секунд
              setTimeout(() => {
                setVersionTapCount(0);
                setEasterEggActive(false);
                setSecretMessage('');
              }, 3000);
            }
          }
        ]
      );
      
      // Сбрасываем счетчик
      setVersionTapCount(0);
    }
    
    // Если нажали 3 раза, показываем подсказку
    if (newCount === 3 && !easterEggActive) {
      Alert.alert(
        'Ого!',
        'Ты уже нажал 3 раза! Попробуй ещё пару раз 😉',
        [{ text: 'Интересно...' }]
      );
    }
  };

  const loadScheduleSettings = async () => {
    try {
      const format = await SecureStore.getItemAsync('schedule_format') || 'student';
      const group = await SecureStore.getItemAsync('default_group') || '';
      const course = await SecureStore.getItemAsync('default_course') || '1';
      const teacher = await SecureStore.getItemAsync('teacher_name') || '';
      const showSelector = await SecureStore.getItemAsync('show_course_selector') !== 'false';
      
      const settings = {
        format,
        group,
        course: parseInt(course),
        teacher,
        showSelector
      };
      
      setScheduleSettings(settings);
      
      console.log('Настройки расписания загружены:', settings);
    } catch (error) {
      console.error('Error loading schedule settings:', error);
    }
  };

  const handleScheduleSettingsChange = (newSettings) => {
    setScheduleSettings(newSettings);
    console.log('Schedule settings updated in SettingsScreen:', newSettings);
    
    // Передаем изменения в родительский компонент для немедленного применения
    if (onScheduleSettingsChange) {
      onScheduleSettingsChange(newSettings);
    }
  };

  const handleTabbarSettingsChange = (newSettings) => {
    // Передаем изменения в родительский компонент для немедленного применения
    if (onTabbarSettingsChange) {
      onTabbarSettingsChange(newSettings);
    }
  };

  const clearAppCache = () => {
    Alert.alert(
      'Очистка кэша',
      'После очистки кэша вы не сможете просматривать расписание и новости в оффлайн-режиме, пока не загрузите их повторно. Продолжить?',
      [
        {
          text: 'Отмена',
          style: 'cancel'
        },
        {
          text: 'Очистить',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(keys);
              Alert.alert('Успех', 'Кэш успешно очищен');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Ошибка', 'Не удалось очистить кэш');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const clearMapCacheHandler = async () => {
    Alert.alert(
      'Информация',
      'Очистка кэша карты недоступна. В данной версии приложения используется карта без возможностей кэширования.'
    );
  };

  const openGitHub = () => {
    Linking.openURL(GITHUB_REPO_URL);
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

        {/* Компонент конфетти */}
        <Confetti show={showConfetti} theme={theme} colors={colors} />
      
      <ScrollView style={{ padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Формат расписания */}
        <TouchableOpacity 
          style={glassCardStyle}
          onPress={() => setScheduleFormatModalVisible(true)}
        >
          <View style={glassIconBadge}>
            <Icon name="calendar-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>
              Формат расписания
            </Text>
            <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
              Настройте отображение расписания для студентов или преподавателей
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={placeholderColor} />
        </TouchableOpacity>

        {/* Настройки уведомлений */}
        <TouchableOpacity 
          style={glassCardStyle}
          onPress={() => setNotificationModalVisible(true)}
        >
          <View style={glassIconBadge}>
            <Icon name="notifications-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>Уведомления</Text>
            <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
              Настройте уведомления о новостях и расписании
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={placeholderColor} />
        </TouchableOpacity>

        {/* Настройки внешнего вида */}
        <TouchableOpacity 
          style={glassCardStyle}
          onPress={() => setAppearanceSheetVisible(true)}
        >
          <View style={glassIconBadge}>
            <Icon name="color-palette-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>Внешний вид</Text>
            <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
              Настройте тему и цветовую схему приложения
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={placeholderColor} />
        </TouchableOpacity>

        {/* О приложении */}
        <TouchableOpacity 
          style={glassCardStyle}
          onPress={() => setAboutModalVisible(true)}
        >
          <View style={glassIconBadge}>
            <Icon name="information-circle-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>О приложении</Text>
            <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
              Информация о приложении и его возможностях
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={placeholderColor} />
        </TouchableOpacity>

        {/* GitHub репозиторий */}
        <TouchableOpacity 
          style={glassCardStyle}
          onPress={openGitHub}
        >
          <View style={glassIconBadge}>
            <Icon name="logo-github" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>GitHub репозиторий</Text>
            <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
              Исходный код проекта на GitHub
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={placeholderColor} />
        </TouchableOpacity>

        {/* Очистка кэша приложения */}
        <TouchableOpacity 
          style={glassCardStyle}
          onPress={clearAppCache}
        >
          <View style={glassIconBadge}>
            <Icon name="trash-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>Очистка кэша приложения</Text>
            <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
              Удалить все сохраненные данные приложения
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={placeholderColor} />
        </TouchableOpacity>

        {/* Очистка кэша карты */}
        <TouchableOpacity 
          style={glassCardStyle}
          onPress={clearMapCacheHandler}
        >
          <View style={glassIconBadge}>
            <Icon name="map-outline" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 16, fontFamily: 'Montserrat_500Medium' }}>Очистка кэша карты</Text>
            <Text style={{ color: placeholderColor, fontSize: 14, marginTop: 4, fontFamily: 'Montserrat_400Regular' }}>
              Удалить сохраненные картографические данные
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={placeholderColor} />
        </TouchableOpacity>

        {/* Информация о версии (пасхалка) */}
        <TouchableOpacity 
          style={[glassCardStyle, { 
            flexDirection: 'column',
            alignItems: 'center',
            borderWidth: easterEggActive ? 1.5 : glassCardStyle.borderWidth,
            borderColor: easterEggActive ? colors.primary : glassCardStyle.borderColor,
            shadowColor: easterEggActive ? colors.primary : glassCardStyle.shadowColor,
            shadowOpacity: easterEggActive ? 0.4 : 1,
            shadowRadius: easterEggActive ? 12 : 8,
          }]}
          onPress={handleVersionPress}
          activeOpacity={0.7}
        >
          <Text style={{ color: placeholderColor, fontSize: 12, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            Версия: {APP_VERSION}
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            Сборка {BUILD_VER} от {BUILD_DATE}
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            Разработано с  ❤️  {APP_DEVELOPERS}
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            При поддержке {APP_SUPPORTERS}
          </Text>
          
          {/* Секретное сообщение при активированной пасхалке */}
          {easterEggActive && secretMessage && (
            <View style={{ 
              marginTop: 12, 
              padding: 12, 
              backgroundColor: hintBgColor, 
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: borderColor,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: theme === 'light' ? 0.05 : 0.2,
              shadowRadius: 2,
              elevation: 2,
              width: '100%'
            }}>
              <Icon name="sparkles" size={16} color={colors.primary} />
              <Text style={{ 
                color: colors.primary, 
                marginLeft: 8, 
                fontFamily: 'Montserrat_400Regular', 
                textAlign: 'center',
                flex: 1,
                fontSize: 12
              }}>
                {secretMessage}
              </Text>
            </View>
          )}
          
          {/* Индикатор нажатий (для отладки) */}
          {versionTapCount > 0 && versionTapCount < 5 && (
            <Text style={{ 
              color: colors.primary, 
              fontSize: 10, 
              marginTop: 4,
              fontFamily: 'Montserrat_400Regular',
              textAlign: 'center',
              opacity: 0.7
            }}>
              Нажатий: {versionTapCount}/5
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Модальные окна */}
      <AppearanceSettingsSheet
        visible={appearanceSheetVisible}
        onClose={() => setAppearanceSheetVisible(false)}
        theme={theme}
        accentColor={accentColor}
        setTheme={setTheme}
        setAccentColor={setAccentColor}
        onTabbarSettingsChange={handleTabbarSettingsChange}
      />

      <AboutModal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
        theme={theme}
        accentColor={accentColor}
      />

      <NotificationSettingsModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
        theme={theme}
        accentColor={accentColor}
      />

      <ScheduleFormatModal
        visible={scheduleFormatModalVisible}
        onClose={() => setScheduleFormatModalVisible(false)}
        theme={theme}
        accentColor={accentColor}
        onSettingsChange={handleScheduleSettingsChange}
      />
    </Animated.View>
  </View>
  );
};

export default SettingsScreen;
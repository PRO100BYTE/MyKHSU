import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
import DeveloperMenuScreen from './DeveloperMenuScreen';
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
    const particleCount = 80;
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = -Math.random() * 100 - 50;
      const size = Math.random() * 20 + 20;
      const startDelay = Math.random() * 1000;
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
      
      setTimeout(() => {
        Animated.timing(particle.rotateAnim, {
          toValue: 1,
          duration: Math.random() * 2000 + 3000,
          useNativeDriver: true,
        }).start();
        
        Animated.timing(particle.fallAnim, {
          toValue: 1,
          duration: Math.random() * 2000 + 3000,
          useNativeDriver: true,
        }).start();
        
        Animated.sequence([
          Animated.timing(particle.swingAnim, {
            toValue: 0.5,
            duration: Math.random() * 1000 + 1000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.swingAnim, {
            toValue: 1,
            duration: Math.random() * 1000 + 1000,
            useNativeDriver: true,
          })
        ]).start();
        
        setTimeout(() => {
          Animated.timing(particle.opacityAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }, Math.random() * 1000 + 2000);
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

const SettingsScreen = forwardRef(({ 
  theme, accentColor, setTheme, setAccentColor, 
  onScheduleSettingsChange, onTabbarSettingsChange, 
  isNewYearMode, onNewYearModeChange, onNavigationChange 
}, ref) => {
  const [currentScreen, setCurrentScreen] = useState(null);
  const [scheduleSettings, setScheduleSettings] = useState(null);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [easterEggActive, setEasterEggActive] = useState(false);
  const [secretMessage, setSecretMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const screenFadeAnim = useRef(new Animated.Value(1)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const colors = ACCENT_COLORS[accentColor];
  const borderColor = glass.border;
  const hintBgColor = glass.surfaceTertiary;
  const glassCardStyle = getGlassSettingsCardStyle(theme);
  const glassIconBadge = getGlassIconBadgeStyle(theme, accentColor);

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

  // Навигация из хедера
  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (currentScreen) {
        navigateTo(null);
      }
    }
  }));

  const navigateTo = (screen) => {
    Animated.timing(screenFadeAnim, {
      toValue: 0, duration: 120, useNativeDriver: true
    }).start(() => {
      setCurrentScreen(screen);
      Animated.timing(screenFadeAnim, {
        toValue: 1, duration: 200, useNativeDriver: true
      }).start();
    });
  };

  useEffect(() => {
    const titles = {
      schedule: 'Формат расписания',
      appearance: 'Внешний вид',
      notifications: 'Уведомления',
      about: 'О приложении',
      developer: 'Меню разработчика',
    };
    if (onNavigationChange) onNavigationChange(titles[currentScreen] || null);
  }, [currentScreen]);

  useEffect(() => {
    loadDeveloperMode();
    loadScheduleSettings();
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const loadDeveloperMode = async () => {
    try {
      const saved = await SecureStore.getItemAsync('developer_mode');
      if (saved === 'true') setDeveloperMode(true);
    } catch (e) {}
  };

  const handleVersionPress = () => {
    const newCount = versionTapCount + 1;
    setVersionTapCount(newCount);
    
    if (newCount >= 5 && !easterEggActive) {
      setEasterEggActive(true);
      const randomMessage = easterEggMessages[Math.floor(Math.random() * easterEggMessages.length)];
      setSecretMessage(randomMessage);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
      
      if (!developerMode) {
        Alert.alert(
          '🎉 Пасхалка обнаружена!',
          randomMessage + '\n\nПродолжай нажимать для ещё большего сюрприза...',
          [{ text: 'Круто!' }]
        );
      } else {
        Alert.alert('🎉 Пасхалка!', randomMessage, [{ text: 'Круто!' }]);
        setVersionTapCount(0);
        setTimeout(() => { setEasterEggActive(false); setSecretMessage(''); }, 3000);
      }
    }
    
    if (newCount >= 7 && !developerMode) {
      setDeveloperMode(true);
      SecureStore.setItemAsync('developer_mode', 'true');
      Alert.alert(
        '🛠 Режим разработчика',
        'Вы активировали скрытый режим разработчика! В настройках внешнего вида появился секретный акцентный цвет, а в настройках — новый раздел.',
        [{ text: 'Отлично!' }]
      );
      setVersionTapCount(0);
      setEasterEggActive(false);
      setSecretMessage('');
      return;
    }
    
    if (newCount === 3 && !easterEggActive) {
      Alert.alert('Ого!', 'Ты уже нажал 3 раза! Попробуй ещё пару раз 😉', [{ text: 'Интересно...' }]);
    }
  };

  const resetDeveloperMode = async () => {
    Alert.alert(
      'Сбросить режим разработчика?',
      'Скрытые настройки будут недоступны. Активировать режим снова можно через пасхалку.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сбросить', style: 'destructive', onPress: async () => {
          setDeveloperMode(false);
          await SecureStore.setItemAsync('developer_mode', 'false');
          if (accentColor === 'orange' || accentColor === 'matrix') {
            setAccentColor('green');
            await SecureStore.setItemAsync('accentColor', 'green');
          }
          if (theme === 'matrix') {
            setTheme('dark');
            await SecureStore.setItemAsync('theme', 'dark');
          }
          navigateTo(null);
        }}
      ]
    );
  };

  const loadScheduleSettings = async () => {
    try {
      const format = await SecureStore.getItemAsync('schedule_format') || 'student';
      const group = await SecureStore.getItemAsync('default_group') || '';
      const course = await SecureStore.getItemAsync('default_course') || '1';
      const teacher = await SecureStore.getItemAsync('teacher_name') || '';
      const showSelector = await SecureStore.getItemAsync('show_course_selector') !== 'false';
      
      setScheduleSettings({ format, group, course: parseInt(course), teacher, showSelector });
    } catch (error) {
      console.error('Error loading schedule settings:', error);
    }
  };

  const handleScheduleSettingsChange = (newSettings) => {
    setScheduleSettings(newSettings);
    if (onScheduleSettingsChange) onScheduleSettingsChange(newSettings);
  };

  const handleTabbarSettingsChange = (newSettings) => {
    if (onTabbarSettingsChange) onTabbarSettingsChange(newSettings);
  };

  const clearAppCache = () => {
    Alert.alert(
      'Очистка кэша',
      'После очистки кэша вы не сможете просматривать расписание и новости в оффлайн-режиме, пока не загрузите их повторно. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
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

  // Заголовок секции настроек
  const SectionHeader = ({ title }) => (
    <Text style={{ 
      color: placeholderColor, 
      fontSize: 13, 
      fontFamily: 'Montserrat_600SemiBold', 
      textTransform: 'uppercase', 
      letterSpacing: 0.5,
      marginTop: 24, 
      marginBottom: 8, 
      paddingHorizontal: 4,
    }}>
      {title}
    </Text>
  );

  // Группировка настроек в карточку
  const SettingsGroup = ({ children }) => (
    <View style={{
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: glass.border,
      shadowColor: glass.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    }}>
      {children}
    </View>
  );

  // Строка настройки в группе
  const SettingsRow = ({ icon, title, subtitle, onPress, isFirst, isLast, rightElement, destructive }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: glass.surfaceSecondary,
        borderTopLeftRadius: isFirst ? 14 : 0,
        borderTopRightRadius: isFirst ? 14 : 0,
        borderBottomLeftRadius: isLast ? 14 : 0,
        borderBottomRightRadius: isLast ? 14 : 0,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: glass.border,
      }}
    >
      <View style={glassIconBadge}>
        <Icon name={icon} size={20} color={destructive ? '#ef4444' : colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 2 }}>
        <Text style={{ color: destructive ? '#ef4444' : textColor, fontSize: 15, fontFamily: 'Montserrat_500Medium' }}>{title}</Text>
        {subtitle && (
          <Text style={{ color: placeholderColor, fontSize: 12, marginTop: 2, fontFamily: 'Montserrat_400Regular', lineHeight: 17 }}>{subtitle}</Text>
        )}
      </View>
      {rightElement || <Icon name="chevron-forward" size={18} color={placeholderColor} />}
    </TouchableOpacity>
  );

  const getScheduleLabel = () => {
    if (!scheduleSettings) return 'Настроить отображение расписания';
    if (scheduleSettings.format === 'teacher') return `Преподаватель: ${scheduleSettings.teacher || 'не указан'}`;
    return `Группа: ${scheduleSettings.group || 'не выбрана'}`;
  };

  const renderMainScreen = () => (
    <ScrollView 
      style={{ padding: 16 }} 
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* РАСПИСАНИЕ */}
      <SectionHeader title="Расписание" />
      <SettingsGroup>
        <SettingsRow 
          icon="calendar-outline" 
          title="Формат расписания" 
          subtitle={getScheduleLabel()}
          onPress={() => navigateTo('schedule')} 
          isFirst isLast 
        />
      </SettingsGroup>

      {/* УВЕДОМЛЕНИЯ */}
      <SectionHeader title="Уведомления" />
      <SettingsGroup>
        <SettingsRow 
          icon="notifications-outline" 
          title="Настройки уведомлений" 
          subtitle="Уведомления о новостях и расписании" 
          onPress={() => navigateTo('notifications')} 
          isFirst isLast 
        />
      </SettingsGroup>

      {/* ОФОРМЛЕНИЕ */}
      <SectionHeader title="Оформление" />
      <SettingsGroup>
        <SettingsRow 
          icon="color-palette-outline" 
          title="Внешний вид" 
          subtitle="Тема, акцентный цвет, панель навигации" 
          onPress={() => navigateTo('appearance')} 
          isFirst isLast 
        />
      </SettingsGroup>

      {/* ДАННЫЕ И ХРАНИЛИЩЕ */}
      <SectionHeader title="Данные и хранилище" />
      <SettingsGroup>
        <SettingsRow 
          icon="trash-outline" 
          title="Очистить кэш" 
          subtitle="Удалить сохранённые данные" 
          onPress={clearAppCache} 
          isFirst 
          rightElement={<Icon name="trash-outline" size={18} color={placeholderColor} />}
        />
        <SettingsRow 
          icon="map-outline" 
          title="Очистить кэш карты" 
          subtitle="Удалить картографические данные" 
          onPress={clearMapCacheHandler} 
          isLast 
          rightElement={<Icon name="trash-outline" size={18} color={placeholderColor} />}
        />
      </SettingsGroup>

      {/* О ПРИЛОЖЕНИИ */}
      <SectionHeader title="О приложении" />
      <SettingsGroup>
        <SettingsRow 
          icon="information-circle-outline" 
          title="О приложении" 
          subtitle="Информация и возможности" 
          onPress={() => navigateTo('about')} 
          isFirst 
        />
        <SettingsRow 
          icon="logo-github" 
          title="GitHub репозиторий" 
          subtitle="Исходный код проекта" 
          onPress={openGitHub} 
          isLast 
          rightElement={<Icon name="open-outline" size={18} color={placeholderColor} />}
        />
      </SettingsGroup>

      {/* РЕЖИМ РАЗРАБОТЧИКА */}
      {developerMode && (
        <>
          <SectionHeader title="🛠 Режим разработчика" />
          <SettingsGroup>
            <SettingsRow 
              icon="construct-outline" 
              title="Меню разработчика" 
              subtitle="API, отладка, тестирование"
              onPress={() => navigateTo('developer')} 
              isFirst isLast 
            />
          </SettingsGroup>
        </>
      )}

      {/* ВЕРСИЯ */}
      <TouchableOpacity 
        style={[glassCardStyle, { 
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 24,
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
        
        {easterEggActive && secretMessage && (
          <View style={{ 
            marginTop: 12, 
            padding: 12, 
            backgroundColor: hintBgColor, 
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: borderColor,
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
        
        {versionTapCount > 0 && versionTapCount < 5 && (
          <Text style={{ 
            color: colors.primary, fontSize: 10, marginTop: 4,
            fontFamily: 'Montserrat_400Regular', textAlign: 'center', opacity: 0.7
          }}>
            Нажатий: {versionTapCount}/5
          </Text>
        )}
        
        {versionTapCount >= 5 && versionTapCount < 7 && !developerMode && (
          <Text style={{ 
            color: colors.primary, fontSize: 10, marginTop: 4,
            fontFamily: 'Montserrat_400Regular', textAlign: 'center', opacity: 0.7
          }}>
            Не останавливайся... ещё {7 - versionTapCount}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim, zIndex: 2 }}>
        <StatusBar 
          barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
          backgroundColor={bgColor}
        />
        <Confetti show={showConfetti} theme={theme} colors={colors} />
        
        <Animated.View style={{ flex: 1, opacity: screenFadeAnim }}>
          {currentScreen === null && renderMainScreen()}
          
          {currentScreen === 'appearance' && (
            <AppearanceSettingsSheet
              theme={theme}
              accentColor={accentColor}
              setTheme={setTheme}
              setAccentColor={setAccentColor}
              onTabbarSettingsChange={handleTabbarSettingsChange}
              isNewYearMode={isNewYearMode}
              onNewYearModeChange={onNewYearModeChange}
              developerMode={developerMode}
            />
          )}
          
          {currentScreen === 'schedule' && (
            <ScheduleFormatModal
              theme={theme}
              accentColor={accentColor}
              onSettingsChange={handleScheduleSettingsChange}
              onSave={() => {
                loadScheduleSettings();
                navigateTo(null);
              }}
            />
          )}

          {currentScreen === 'notifications' && (
            <NotificationSettingsModal
              theme={theme}
              accentColor={accentColor}
            />
          )}

          {currentScreen === 'about' && (
            <AboutModal
              theme={theme}
              accentColor={accentColor}
            />
          )}

          {currentScreen === 'developer' && (
            <DeveloperMenuScreen
              theme={theme}
              accentColor={accentColor}
              onResetDeveloperMode={resetDeveloperMode}
            />
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
});

export default SettingsScreen;

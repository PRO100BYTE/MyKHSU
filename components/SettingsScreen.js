import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Animated } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AppearanceSettingsSheet from './AppearanceSettingsSheet';
import AboutModal from './AboutModal';
import NotificationSettingsModal from './NotificationSettingsModal';
import ScheduleFormatModal from './ScheduleFormatModal';
import { ACCENT_COLORS, APP_VERSION, APP_DEVELOPERS, APP_SUPPORTERS, GITHUB_REPO_URL, BUILD_VER, BUILD_DATE } from '../utils/constants';

const SettingsScreen = ({ theme, accentColor, setTheme, setAccentColor, onScheduleSettingsChange }) => {
  const [appearanceSheetVisible, setAppearanceSheetVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [scheduleFormatModalVisible, setScheduleFormatModalVisible] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState(null);
  
  // Анимация появления
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

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

  const clearMapCacheHandler = () => {
    Alert.alert(
      'Очистка кэша карты',
      'Функция временно недоступна. В текущей версии приложения используется онлайн-карта без кэширования.',
      [
        {
          text: 'Понятно',
          style: 'cancel'
        }
      ]
    );
  };

  const openGitHub = () => {
    Linking.openURL(GITHUB_REPO_URL);
  };

  return (
    <Animated.View style={{ flex: 1, backgroundColor: bgColor, opacity: fadeAnim }}>
      <ScrollView style={{ padding: 16 }}>
        {/* Формат расписания */}
        <TouchableOpacity 
          style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={() => setScheduleFormatModalVisible(true)}
        >
          <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
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
          style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={() => setNotificationModalVisible(true)}
        >
          <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
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
          style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={() => setAppearanceSheetVisible(true)}
        >
          <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
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
          style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={() => setAboutModalVisible(true)}
        >
          <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
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
          style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={openGitHub}
        >
          <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
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
          style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={clearAppCache}
        >
          <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
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
          style={{ 
            backgroundColor: cardBg, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}
          onPress={clearMapCacheHandler}
        >
          <View style={{ backgroundColor: colors.light, borderRadius: 8, padding: 8, marginRight: 12 }}>
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

        {/* Информация о версии */}
        <View style={{ 
          backgroundColor: cardBg, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 16,
          alignItems: 'center'
        }}>
          <Text style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            Версия: {APP_VERSION}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            Сборка {BUILD_VER} от {BUILD_DATE}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            Разработано с  ❤️  {APP_DEVELOPERS}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
            При поддержке {APP_SUPPORTERS}
          </Text>
        </View>

        {/* Модальные окна */}
        <AppearanceSettingsSheet
          visible={appearanceSheetVisible}
          onClose={() => setAppearanceSheetVisible(false)}
          theme={theme}
          accentColor={accentColor}
          setTheme={setTheme}
          setAccentColor={setAccentColor}
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
      </ScrollView>
    </Animated.View>
  );
};

export default SettingsScreen;
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AppearanceSettingsSheet from './AppearanceSettingsSheet';
import AboutModal from './AboutModal';
import { ACCENT_COLORS, APP_VERSION, APP_DEVELOPERS, GITHUB_REPO_URL, BUILD_VER, BUILD_DATE } from '../utils/constants';
import { clearMapCache } from '../utils/mapCache';

const SettingsScreen = ({ theme, accentColor, setTheme, setAccentColor }) => {
  const [appearanceSheetVisible, setAppearanceSheetVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  const bgColor = theme === 'light' ? '#f3f4f6' : '#111827';
  const cardBg = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

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
              for (const key of keys) {
                await AsyncStorage.removeItem(key);
              }
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
    'Удалить все сохраненные картографические данные? Это освободит место на устройстве, но карты станут недоступны в оффлайн-режиме.',
    [
      {
        text: 'Отмена',
        style: 'cancel'
      },
      {
        text: 'Очистить',
        onPress: async () => {
          try {
            const success = await clearMapCache();
            if (success) {
              Alert.alert('Успех', 'Кэш карты успешно очищен');
            } else {
              Alert.alert('Информация', 'Кэш карты уже пуст или отсутствует');
            }
          } catch (error) {
            console.error('Error clearing map cache:', error);
            Alert.alert('Ошибка', 'Не удалось очистить кэш карты');
          }
        },
        style: 'destructive'
      }
    ]
  );
};

  const openGitHub = () => {
    Linking.openURL(GITHUB_REPO_URL);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}>
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
      </View>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default SettingsScreen;
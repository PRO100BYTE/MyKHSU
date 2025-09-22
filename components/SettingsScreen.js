import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Linking } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import AppearanceSettingsSheet from './AppearanceSettingsSheet';
import AboutModal from './AboutModal';
import { ACCENT_COLORS, APP_VERSION, APP_DEVELOPERS, GITHUB_REPO_URL, BUILD_VER, BUILD_DATE } from '../utils/constants';
import { clearMapCache } from '../utils/mapCache';
import { clearAllCache } from '../utils/cache';

const SettingsScreen = ({ theme, accentColor, setTheme, setAccentColor, openNotificationsModal }) => {
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
      'Вы уверены, что хотите очистить кэш расписания и новостей? Это потребует повторной загрузки данных при следующем запуске.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Очистить',
          onPress: async () => {
            try {
              await clearAllCache();
              Alert.alert('Готово', 'Кэш расписания и новостей успешно очищен.');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось очистить кэш.');
              console.error('Failed to clear app cache:', error);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const openGithub = async () => {
    try {
      await WebBrowser.openBrowserAsync(GITHUB_REPO_URL);
    } catch (error) {
      console.error('Failed to open browser:', error);
      Alert.alert('Ошибка', 'Не удалось открыть браузер. Пожалуйста, попробуйте еще раз.');
    }
  };

  const handleClearMapCache = () => {
    Alert.alert(
      'Очистка кэша карты',
      'Вы уверены, что хотите очистить кэш карты? Карту потребуется загрузить заново.',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Очистить',
          onPress: async () => {
            try {
              await clearMapCache();
              Alert.alert('Готово', 'Кэш карты успешно очищен.');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось очистить кэш карты.');
              console.error('Failed to clear map cache:', error);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: textColor }]}>Настройки</Text>

        {/* Раздел внешнего вида */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <TouchableOpacity style={styles.option} onPress={() => setAppearanceSheetVisible(true)}>
            <View style={styles.iconTextContainer}>
              <Icon name="color-palette-outline" size={24} color={textColor} />
              <Text style={[styles.optionText, { color: textColor }]}>Внешний вид</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={placeholderColor} />
          </TouchableOpacity>
        </View>

        {/* Раздел уведомлений */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <TouchableOpacity style={styles.option} onPress={openNotificationsModal}>
            <View style={styles.iconTextContainer}>
              <Icon name="notifications-outline" size={24} color={textColor} />
              <Text style={[styles.optionText, { color: textColor }]}>Уведомления</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={placeholderColor} />
          </TouchableOpacity>
        </View>

        {/* Раздел очистки кэша */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <TouchableOpacity style={styles.option} onPress={clearAppCache}>
            <View style={styles.iconTextContainer}>
              <Icon name="trash-outline" size={24} color={textColor} />
              <Text style={[styles.optionText, { color: textColor }]}>Очистить кэш</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={placeholderColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={handleClearMapCache}>
            <View style={styles.iconTextContainer}>
              <Icon name="map-outline" size={24} color={textColor} />
              <Text style={[styles.optionText, { color: textColor }]}>Очистить кэш карты</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={placeholderColor} />
          </TouchableOpacity>
        </View>

        {/* Раздел информации */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <TouchableOpacity style={styles.option} onPress={() => setAboutModalVisible(true)}>
            <View style={styles.iconTextContainer}>
              <Icon name="information-circle-outline" size={24} color={textColor} />
              <Text style={[styles.optionText, { color: textColor }]}>О приложении</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={placeholderColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={openGithub}>
            <View style={styles.iconTextContainer}>
              <Icon name="logo-github" size={24} color={textColor} />
              <Text style={[styles.optionText, { color: textColor }]}>Исходный код</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={placeholderColor} />
          </TouchableOpacity>
        </View>

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
      </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
});

export default SettingsScreen;
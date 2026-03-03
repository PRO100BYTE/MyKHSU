import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Switch, Clipboard, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCENT_COLORS, API_BASE_URL, APP_VERSION, BUILD_VER, BUILD_DATE, LIQUID_GLASS } from '../utils/constants';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';

const DeveloperMenuScreen = ({ theme, accentColor, onResetDeveloperMode }) => {
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [useCustomApi, setUseCustomApi] = useState(false);
  const [cacheKeys, setCacheKeys] = useState([]);
  const [secureKeys, setSecureKeys] = useState([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const colors = ACCENT_COLORS[accentColor];
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const borderColor = glass.border;
  const inputBgColor = glass.surfaceTertiary;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedUrl = await SecureStore.getItemAsync('custom_api_url');
      const savedUseCustom = await SecureStore.getItemAsync('use_custom_api');
      if (savedUrl) setCustomApiUrl(savedUrl);
      if (savedUseCustom === 'true') setUseCustomApi(true);
    } catch (e) {
      console.error('Error loading dev settings:', e);
    }
  };

  const saveApiSettings = async () => {
    try {
      if (useCustomApi && customApiUrl.trim()) {
        // Базовая валидация URL
        try {
          new URL(customApiUrl.trim());
        } catch {
          Alert.alert('Ошибка', 'Некорректный URL. Убедитесь, что адрес начинается с http:// или https://');
          return;
        }
        await SecureStore.setItemAsync('custom_api_url', customApiUrl.trim());
        await SecureStore.setItemAsync('use_custom_api', 'true');
        Alert.alert('Сохранено', 'Кастомный API-эндпоинт сохранён. Перезапустите приложение для применения.');
      } else {
        await SecureStore.setItemAsync('use_custom_api', 'false');
        Alert.alert('Сохранено', 'Используется стандартный API-эндпоинт.');
      }
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось сохранить настройки');
    }
  };

  const toggleCustomApi = async (value) => {
    setUseCustomApi(value);
    if (!value) {
      await SecureStore.setItemAsync('use_custom_api', 'false');
    }
  };

  const loadDebugInfo = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      setCacheKeys(keys);
      
      const knownSecureKeys = [
        'theme', 'accentColor', 'schedule_format', 'default_group', 
        'default_course', 'teacher_name', 'show_course_selector',
        'notification_settings', 'developer_mode', 'custom_api_url',
        'use_custom_api', 'cache_settings', 'tabbar_labels_enabled',
        'tabbar_font_size', 'new_year_mode'
      ];
      
      const keyValues = [];
      for (const key of knownSecureKeys) {
        try {
          const val = await SecureStore.getItemAsync(key);
          if (val !== null) {
            keyValues.push({ key, value: val });
          }
        } catch {}
      }
      setSecureKeys(keyValues);
      setShowDebugInfo(true);
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось загрузить отладочную информацию');
    }
  };

  const clearAllSecureStore = () => {
    Alert.alert(
      'Очистить SecureStore?',
      'Все настройки приложения будут сброшены. Это действие необратимо.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Очистить', style: 'destructive', onPress: async () => {
          try {
            const keys = [
              'theme', 'accentColor', 'schedule_format', 'default_group',
              'default_course', 'teacher_name', 'show_course_selector',
              'notification_settings', 'developer_mode', 'custom_api_url',
              'use_custom_api', 'cache_settings', 'tabbar_labels_enabled',
              'tabbar_font_size', 'new_year_mode'
            ];
            for (const key of keys) {
              await SecureStore.deleteItemAsync(key);
            }
            Alert.alert('Готово', 'SecureStore очищен. Перезапустите приложение.');
          } catch (e) {
            Alert.alert('Ошибка', 'Не удалось очистить SecureStore');
          }
        }}
      ]
    );
  };

  const forceAppCrash = () => {
    Alert.alert(
      'Тестовый краш',
      'Это вызовет нативный краш приложения для тестирования Sentry. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Крашнуть', style: 'destructive', onPress: () => {
          throw new Error('[DevMenu] Test crash from Developer Menu');
        }}
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView 
        style={{ flex: 1, padding: 16 }} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* API-эндпоинт */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>API-эндпоинт</Text>
          <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
            Текущий: {API_BASE_URL}
          </Text>

          <TouchableOpacity
            style={[styles.settingRow, { borderColor }]}
            onPress={() => toggleCustomApi(!useCustomApi)}
          >
            <View style={styles.settingInfo}>
              <Icon name="server-outline" size={24} color={useCustomApi ? colors.primary : placeholderColor} />
              <View style={styles.textContainer}>
                <Text style={[styles.settingLabel, { color: textColor }]}>Кастомный эндпоинт</Text>
                <Text style={[styles.settingDesc, { color: placeholderColor }]}>
                  Использовать свой сервер API
                </Text>
              </View>
            </View>
            <Switch
              value={useCustomApi}
              onValueChange={toggleCustomApi}
              trackColor={{ false: borderColor, true: colors.light }}
              thumbColor={useCustomApi ? colors.primary : placeholderColor}
            />
          </TouchableOpacity>

          {useCustomApi && (
            <>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBgColor, borderColor, color: textColor }]}
                placeholder="https://your-api.example.com/api"
                placeholderTextColor={placeholderColor}
                value={customApiUrl}
                onChangeText={setCustomApiUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveApiSettings}
              >
                <Icon name="checkmark" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.saveButtonText}>Сохранить</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Отладочные инструменты */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Отладка</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={() => {
              Alert.alert(
                'Перезагрузить приложение?',
                'Приложение будет полностью перезагружено.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Перезагрузить', onPress: async () => {
                    try {
                      await Updates.reloadAsync();
                    } catch (e) {
                      Alert.alert('Ошибка', 'Не удалось перезагрузить приложение. Попробуйте закрыть и открыть его вручную.');
                    }
                  }}
                ]
              );
            }}
          >
            <Icon name="refresh-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Перезагрузить приложение
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={loadDebugInfo}
          >
            <Icon name="bug-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Показать отладочную информацию
            </Text>
          </TouchableOpacity>

          {showDebugInfo && (
            <View style={[styles.debugCard, { backgroundColor: inputBgColor, borderColor }]}>
              <Text style={[styles.debugTitle, { color: textColor }]}>Информация о сборке</Text>
              <Text style={[styles.debugText, { color: placeholderColor }]}>
                Версия: {APP_VERSION} ({BUILD_VER})
              </Text>
              <Text style={[styles.debugText, { color: placeholderColor }]}>
                Дата сборки: {BUILD_DATE}
              </Text>

              <Text style={[styles.debugTitle, { color: textColor, marginTop: 12 }]}>
                AsyncStorage ({cacheKeys.length} ключей)
              </Text>
              {cacheKeys.slice(0, 20).map((key, i) => (
                <Text key={i} style={[styles.debugText, { color: placeholderColor }]}>
                  • {key}
                </Text>
              ))}
              {cacheKeys.length > 20 && (
                <Text style={[styles.debugText, { color: placeholderColor }]}>
                  ...и ещё {cacheKeys.length - 20}
                </Text>
              )}

              <Text style={[styles.debugTitle, { color: textColor, marginTop: 12 }]}>
                SecureStore
              </Text>
              {secureKeys.map((item, i) => (
                <Text key={i} style={[styles.debugText, { color: placeholderColor }]}>
                  • {item.key}: {item.value.length > 50 ? item.value.substring(0, 50) + '...' : item.value}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Тестовые уведомления */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Тестовые уведомления</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '🔔 Тестовое уведомление',
                    body: 'Это тестовое уведомление из меню разработчика',
                    data: { type: 'test' },
                    sound: true,
                  },
                  trigger: null,
                });
                Alert.alert('Готово', 'Тестовое уведомление отправлено');
              } catch (e) {
                Alert.alert('Ошибка', 'Не удалось отправить уведомление: ' + e.message);
              }
            }}
          >
            <Icon name="notifications-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Тестовое уведомление
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '📰 Новая новость',
                    body: 'Это тестовое уведомление о новой новости из меню разработчика',
                    data: { type: 'new_news', newsDate: new Date().toISOString() },
                    sound: true,
                    ...(Platform.OS === 'android' && { channelId: 'news' }),
                  },
                  trigger: null,
                });
                Alert.alert('Готово', 'Уведомление о новости отправлено');
              } catch (e) {
                Alert.alert('Ошибка', 'Не удалось отправить уведомление: ' + e.message);
              }
            }}
          >
            <Icon name="newspaper-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Тестовое уведомление: новость
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '📚 Началась пара',
                    body: 'Тестовый предмет в аудитории 101',
                    data: { type: 'lesson_start' },
                    sound: true,
                    ...(Platform.OS === 'android' && { channelId: 'schedule' }),
                  },
                  trigger: null,
                });
                Alert.alert('Готово', 'Уведомление о начале пары отправлено');
              } catch (e) {
                Alert.alert('Ошибка', 'Не удалось отправить уведомление: ' + e.message);
              }
            }}
          >
            <Icon name="play-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Тестовое уведомление: начало пары
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: '✅ Пара закончилась',
                    body: 'Тестовый предмет завершён',
                    data: { type: 'lesson_end' },
                    sound: true,
                    ...(Platform.OS === 'android' && { channelId: 'schedule' }),
                  },
                  trigger: null,
                });
                Alert.alert('Готово', 'Уведомление об окончании пары отправлено');
              } catch (e) {
                Alert.alert('Ошибка', 'Не удалось отправить уведомление: ' + e.message);
              }
            }}
          >
            <Icon name="checkmark-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Тестовое уведомление: конец пары
            </Text>
          </TouchableOpacity>
        </View>

        {/* Опасные действия */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Опасная зона</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={forceAppCrash}
          >
            <Icon name="skull-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
              Тестовый краш (Sentry)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={clearAllSecureStore}
          >
            <Icon name="nuclear-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
              Очистить SecureStore
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={onResetDeveloperMode}
          >
            <Icon name="close-circle-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
              Сбросить режим разработчика
            </Text>
          </TouchableOpacity>
        </View>

        {/* Информация */}
        <View style={[styles.infoBox, { backgroundColor: inputBgColor }]}>
          <Icon name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.infoText, { color: placeholderColor }]}>
            Некоторые изменения требуют перезапуска приложения
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, fontFamily: 'Montserrat_600SemiBold' },
  sectionDescription: { fontSize: 13, marginBottom: 12, fontFamily: 'Montserrat_400Regular' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { marginLeft: 12, flex: 1 },
  settingLabel: { fontSize: 16, fontFamily: 'Montserrat_500Medium', marginBottom: 2 },
  settingDesc: { fontSize: 13, fontFamily: 'Montserrat_400Regular' },
  textInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 12,
  },
  saveButton: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: 'Montserrat_500Medium',
    marginLeft: 12,
  },
  debugCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    flex: 1,
  },
});

export default DeveloperMenuScreen;

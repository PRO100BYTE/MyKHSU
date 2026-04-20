import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Switch, Clipboard, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCENT_COLORS, API_BASE_URL, APP_VERSION, BUILD_VER, BUILD_DATE, LIQUID_GLASS } from '../utils/constants';
import { loadAllNotes, clearAllNotes, getNotesCount, saveNote } from '../utils/notesStorage';
import { unlockAchievement, clearAchievements, getAchievementsCount, ACHIEVEMENT_DEFINITIONS } from '../utils/achievements';
import { addAcademicEvent, getAcademicEvents, saveAcademicEvents } from '../utils/academicEventsStorage';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import NetInfo from '@react-native-community/netinfo';
import ApiService from '../utils/api';
import notificationService from '../utils/notificationService';
import backgroundService from '../utils/backgroundService';
import { exportScheduleToCalendar } from '../utils/calendarExport';
import SnakeGame from './SnakeGame';

const DeveloperMenuScreen = ({ theme, accentColor, onResetDeveloperMode }) => {
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [useCustomApi, setUseCustomApi] = useState(false);
  const [cacheKeys, setCacheKeys] = useState([]);
  const [secureKeys, setSecureKeys] = useState([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [snakeVisible, setSnakeVisible] = useState(false);
  const [storageKeyInput, setStorageKeyInput] = useState('');
  const [storageKeyValue, setStorageKeyValue] = useState(null);
  const [apiPingResults, setApiPingResults] = useState(null);

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

  const createPlannerFixtures = async () => {
    const today = new Date();
    const inTwoDays = new Date(today);
    inTwoDays.setDate(today.getDate() + 2);
    const inFiveDays = new Date(today);
    inFiveDays.setDate(today.getDate() + 5);
    const toISO = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    await addAcademicEvent({
      title: 'Тестовый экзамен по аналитике',
      date: toISO(inFiveDays),
      type: 'exam',
      description: 'Аудитория 305, взять зачетку и ручку.',
      reminderEnabled: false,
    });

    await addAcademicEvent({
      title: 'Тестовая практика по проекту',
      date: toISO(inTwoDays),
      type: 'practice',
      description: 'Подготовить прототип и презентацию.',
      reminderEnabled: false,
    });

    await saveNote({
      subject: 'Тестовый предмет',
      weekday: 1,
      timeSlot: 1,
      group: 'ТСТ-01',
      noteText: 'Тестовая заметка из учебного планера',
      homework: 'Подготовить отчет по лабораторной работе',
      homeworkStatus: 'in_progress',
      homeworkDueDate: toISO(inTwoDays),
    });

    await notificationService.appendScheduleChangeHistory([
      {
        type: 'changed',
        weekday: 2,
        prev: { subject: 'Алгоритмы', teacher: 'Иванов И.И.', auditory: '201', time: '2' },
        lesson: { subject: 'Алгоритмы', teacher: 'Петров П.П.', auditory: '410', time: '2' },
      },
    ], 'ТСТ-01');
  };

  const clearPlannerFixtures = async () => {
    await saveAcademicEvents([]);
    await AsyncStorage.removeItem('schedule_changes_history_v1');
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

        {/* Уведомления и фоновые задачи */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Уведомления и фоновые задачи</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const { status } = await Notifications.getPermissionsAsync();
                const scheduled = await Notifications.getAllScheduledNotificationsAsync();
                const settings = await notificationService.getNotificationSettings();
                Alert.alert(
                  'Статус уведомлений',
                  `Разрешение: ${status}\n` +
                  `Запланировано: ${scheduled.length}\n` +
                  `Включены: ${settings.enabled ? 'Да' : 'Нет'}\n` +
                  `Новости: ${settings.news ? 'Да' : 'Нет'}\n` +
                  `Расписание: ${settings.schedule ? 'Да' : 'Нет'}`
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Статус уведомлений
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const isRegistered = await TaskManager.isTaskRegisteredAsync('BACKGROUND_NEWS_CHECK');
                const status = await BackgroundFetch.getStatusAsync();
                const statusMap = {
                  [BackgroundFetch.BackgroundFetchStatus.Restricted]: 'Ограничен',
                  [BackgroundFetch.BackgroundFetchStatus.Denied]: 'Запрещён',
                  [BackgroundFetch.BackgroundFetchStatus.Available]: 'Доступен',
                };
                Alert.alert(
                  'Фоновая задача',
                  `Зарегистрирована: ${isRegistered ? 'Да' : 'Нет'}\n` +
                  `BackgroundFetch: ${statusMap[status] || 'Неизвестно'}`
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="sync-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Статус фоновой задачи
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                Alert.alert('Запуск', 'Выполняется проверка новостей...');
                await backgroundService.checkForNewsNotifications();
                Alert.alert('Готово', 'Фоновая проверка новостей выполнена');
              } catch (e) {
                Alert.alert('Ошибка', 'Ошибка проверки: ' + e.message);
              }
            }}
          >
            <Icon name="cloud-download-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Запустить проверку новостей вручную
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const scheduled = await Notifications.getAllScheduledNotificationsAsync();
                if (scheduled.length === 0) {
                  Alert.alert('Нет уведомлений', 'Запланированных уведомлений нет');
                  return;
                }
                const list = scheduled.slice(0, 10).map((n, i) => 
                  `${i + 1}. ${n.content.title || '(без заголовка)'}\n   ${n.trigger ? JSON.stringify(n.trigger).substring(0, 60) : 'немедленно'}`
                ).join('\n\n');
                Alert.alert(
                  `Запланировано: ${scheduled.length}`,
                  list + (scheduled.length > 10 ? `\n\n...и ещё ${scheduled.length - 10}` : '')
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="list-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Список запланированных уведомлений
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={() => {
              Alert.alert(
                'Отменить все уведомления?',
                'Все запланированные уведомления будут отменены.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Очистить', style: 'destructive', onPress: async () => {
                    try {
                      await Notifications.cancelAllScheduledNotificationsAsync();
                      Alert.alert('Готово', 'Все запланированные уведомления отменены');
                    } catch (e) {
                      Alert.alert('Ошибка', e.message);
                    }
                  }}
                ]
              );
            }}
          >
            <Icon name="notifications-off-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Отменить все запланированные уведомления
            </Text>
          </TouchableOpacity>
        </View>

        {/* Экспорт */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Экспорт</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const format = await SecureStore.getItemAsync('schedule_format') || 'student';
                const teacher = await SecureStore.getItemAsync('teacher_name') || '';
                const auditory = await SecureStore.getItemAsync('auditory_name') || '';
                const group = await SecureStore.getItemAsync('default_group') || '';

                // Показываем информацию о текущем формате
                Alert.alert(
                  'Тест экспорта',
                  `Формат: ${format}\n` +
                  (format === 'teacher' ? `Преподаватель: ${teacher || '(не указан)'}` :
                   format === 'auditory' ? `Аудитория: ${auditory || '(не указана)'}` :
                   `Группа: ${group || '(не выбрана)'}`) +
                  '\n\nЭкспорт создаст тестовый .ics файл с фиктивными данными.',
                  [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Экспорт', onPress: async () => {
                      try {
                        // Создаём тестовые данные расписания
                        const testDays = [
                          {
                            weekday: 1,
                            lessons: [
                              { subject: 'Тестовый предмет 1', time: 1, type_lesson: 'Лекция', teacher: 'Иванов И.И.', auditory: '101', group: ['ТСТ-01'] },
                              { subject: 'Тестовый предмет 2', time: 2, type_lesson: 'Практика', teacher: 'Петров П.П.', auditory: '202', group: ['ТСТ-01'] },
                            ]
                          },
                          {
                            weekday: 3,
                            lessons: [
                              { subject: 'Тестовый предмет 3', time: 1, type_lesson: 'Лабораторная', teacher: 'Сидоров С.С.', auditory: '305', group: ['ТСТ-01', 'ТСТ-02'] },
                            ]
                          }
                        ];

                        const testPairsTime = [
                          { time: 1, time_start: '08:30', time_end: '10:00' },
                          { time: 2, time_start: '10:10', time_end: '11:40' },
                          { time: 3, time_start: '12:10', time_end: '13:40' },
                        ];

                        const { getWeekNumber } = require('../utils/dateUtils');
                        const week = getWeekNumber(new Date());

                        await exportScheduleToCalendar({
                          mode: format === 'teacher' ? 'teacher' : format === 'auditory' ? 'auditory' : 'student',
                          viewMode: 'week',
                          scheduleData: format === 'student' ? { days: testDays } : null,
                          teacherSchedule: format === 'teacher' ? { days: testDays, pairs_time: testPairsTime } : null,
                          auditorySchedule: format === 'auditory' ? { days: testDays, pairs_time: testPairsTime } : null,
                          pairsTime: testPairsTime,
                          currentWeek: week,
                          currentDate: new Date(),
                          title: format === 'teacher' ? (teacher || 'Тест') : format === 'auditory' ? (auditory || 'Тест') : (group || 'Тест'),
                        });
                        Alert.alert('Готово', 'Тестовый .ics файл экспортирован');
                      } catch (e) {
                        if (e.message === 'NO_EVENTS') {
                          Alert.alert('Ошибка', 'Нет событий для экспорта');
                        } else {
                          Alert.alert('Ошибка экспорта', e.message);
                        }
                      }
                    }}
                  ]
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Тест экспорта в календарь (.ics)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Сеть и API */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Сеть и API</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const netState = await NetInfo.fetch();
                Alert.alert(
                  'Сетевой статус',
                  `Подключён: ${netState.isConnected ? 'Да' : 'Нет'}\n` +
                  `Тип: ${netState.type}\n` +
                  `WiFi: ${netState.isWifiEnabled !== undefined ? (netState.isWifiEnabled ? 'Да' : 'Нет') : 'N/A'}\n` +
                  `Детали: ${netState.details ? JSON.stringify(netState.details).substring(0, 150) : 'нет'}`
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="wifi-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Проверить сеть
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const start = Date.now();
                const result = await ApiService.getNews(0, 1);
                const elapsed = Date.now() - start;
                Alert.alert(
                  'API: Новости',
                  `Источник: ${result.source}\n` +
                  `Время ответа: ${elapsed} мс\n` +
                  `Данные: ${result.data ? result.data.length + ' шт.' : 'нет'}` +
                  (result.cacheInfo ? `\nКэш от: ${result.cacheInfo.cacheDate}` : '')
                );
              } catch (e) {
                Alert.alert('Ошибка API', e.message);
              }
            }}
          >
            <Icon name="pulse-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Тест API: Новости
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const start = Date.now();
                const result = await ApiService.getGroups(1);
                const elapsed = Date.now() - start;
                Alert.alert(
                  'API: Группы',
                  `Источник: ${result.source}\n` +
                  `Время ответа: ${elapsed} мс\n` +
                  `Данные: ${result.data ? (Array.isArray(result.data) ? result.data.length + ' групп' : 'объект') : 'нет'}` +
                  (result.cacheInfo ? `\nКэш от: ${result.cacheInfo.cacheDate}` : '')
                );
              } catch (e) {
                Alert.alert('Ошибка API', e.message);
              }
            }}
          >
            <Icon name="people-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Тест API: Группы
            </Text>
          </TouchableOpacity>
        </View>

        {/* Кэш */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Кэш</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const keys = await AsyncStorage.getAllKeys();
                let totalSize = 0;
                for (const key of keys) {
                  const val = await AsyncStorage.getItem(key);
                  if (val) totalSize += val.length;
                }
                const sizeKB = (totalSize / 1024).toFixed(1);
                const categories = {};
                keys.forEach(k => {
                  const prefix = k.split('_')[0] || 'другое';
                  categories[prefix] = (categories[prefix] || 0) + 1;
                });
                const catStr = Object.entries(categories)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([k, v]) => `  ${k}: ${v}`)
                  .join('\n');
                Alert.alert(
                  'Статистика кэша',
                  `Ключей: ${keys.length}\nРазмер: ~${sizeKB} КБ\n\nПо категориям:\n${catStr}`
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="pie-chart-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Статистика кэша
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={() => {
              Alert.alert(
                'Очистить AsyncStorage?',
                'Весь кэш приложения (расписание, новости, группы) будет удалён.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Очистить', style: 'destructive', onPress: async () => {
                    try {
                      await AsyncStorage.clear();
                      Alert.alert('Готово', 'AsyncStorage полностью очищен');
                    } catch (e) {
                      Alert.alert('Ошибка', e.message);
                    }
                  }}
                ]
              );
            }}
          >
            <Icon name="trash-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Очистить весь кэш (AsyncStorage)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const newsKeys = (await AsyncStorage.getAllKeys()).filter(k => 
                  k.startsWith('news_') || k === 'last_notified_news' || k === 'new_news_detected' || k === 'news_latest' || k === 'news_last_check'
                );
                if (newsKeys.length === 0) {
                  Alert.alert('Пусто', 'Кэш новостей не найден');
                  return;
                }
                Alert.alert(
                  'Очистить кэш новостей?',
                  `Будет удалено ${newsKeys.length} ключей: ${newsKeys.join(', ')}`,
                  [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Очистить', style: 'destructive', onPress: async () => {
                      await AsyncStorage.multiRemove(newsKeys);
                      Alert.alert('Готово', 'Кэш новостей очищен');
                    }}
                  ]
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="newspaper-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Очистить кэш новостей
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const schedKeys = (await AsyncStorage.getAllKeys()).filter(k => 
                  k.startsWith('schedule_') || k.startsWith('groups_')
                );
                if (schedKeys.length === 0) {
                  Alert.alert('Пусто', 'Кэш расписания не найден');
                  return;
                }
                Alert.alert(
                  'Очистить кэш расписания?',
                  `Будет удалено ${schedKeys.length} ключей`,
                  [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Очистить', style: 'destructive', onPress: async () => {
                      await AsyncStorage.multiRemove(schedKeys);
                      Alert.alert('Готово', 'Кэш расписания очищен');
                    }}
                  ]
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Очистить кэш расписания
            </Text>
          </TouchableOpacity>
        </View>

        {/* Заметки и ДЗ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Заметки и ДЗ</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const count = await getNotesCount();
                const allNotes = await loadAllNotes();
                const keys = Object.keys(allNotes);
                const withHomework = keys.filter(k => allNotes[k]?.homework).length;
                const withNote = keys.filter(k => allNotes[k]?.noteText).length;
                Alert.alert(
                  'Статистика заметок',
                  `Всего записей: ${count}\n` +
                  `С заметками: ${withNote}\n` +
                  `С ДЗ: ${withHomework}\n\n` +
                  (keys.length > 0 ? 'Последние ключи:\n' + keys.slice(0, 5).map(k => '• ' + k.replace('lesson_note_', '')).join('\n') : '')
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="stats-chart-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Статистика заметок
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const allNotes = await loadAllNotes();
                const keys = Object.keys(allNotes);
                if (keys.length === 0) {
                  Alert.alert('Пусто', 'Заметок нет');
                  return;
                }
                const list = keys.slice(0, 10).map((k, i) => {
                  const n = allNotes[k];
                  const short = k.replace('lesson_note_', '');
                  return `${i + 1}. ${short}\n   Заметка: ${n.noteText ? n.noteText.substring(0, 30) + '...' : '—'}\n   ДЗ: ${n.homework ? n.homework.substring(0, 30) + '...' : '—'}`;
                }).join('\n\n');
                Alert.alert(
                  `Заметки (${keys.length})`,
                  list + (keys.length > 10 ? `\n\n...и ещё ${keys.length - 10}` : '')
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="list-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Просмотреть все заметки
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                await saveNote({
                  subject: 'Тестовый предмет',
                  weekday: 1,
                  timeSlot: 1,
                  group: 'ТСТ-01',
                  noteText: 'Тестовая заметка из меню разработчика — ' + new Date().toLocaleTimeString(),
                  homework: 'Тестовое ДЗ: подготовить доклад к следующему занятию',
                });
                Alert.alert('Готово', 'Тестовая заметка создана для «Тестовый предмет» (Пн, 1 пара, ТСТ-01)');
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Создать тестовую заметку
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={() => {
              Alert.alert(
                'Очистить все заметки?',
                'Все заметки и ДЗ будут удалены. Это действие необратимо.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Удалить', style: 'destructive', onPress: async () => {
                    try {
                      const count = await clearAllNotes();
                      Alert.alert('Готово', `Удалено заметок: ${count}`);
                    } catch (e) {
                      Alert.alert('Ошибка', e.message);
                    }
                  }}
                ]
              );
            }}
          >
            <Icon name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
              Очистить все заметки
            </Text>
          </TouchableOpacity>
        </View>

        {/* Учебный планер */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Учебный планер</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                await createPlannerFixtures();
                Alert.alert('Готово', 'Добавлены тестовые учебные события, дедлайн и запись в историю изменений.');
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="flask-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>Создать тестовые данные планера</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              try {
                const events = await getAcademicEvents();
                const history = await notificationService.getScheduleChangesHistory(30);
                Alert.alert(
                  'Статистика планера',
                  `Учебных событий: ${events.length}\nИстория изменений: ${history.length}`
                );
              } catch (e) {
                Alert.alert('Ошибка', e.message);
              }
            }}
          >
            <Icon name="analytics-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>Статистика учебного планера</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={() => {
              Alert.alert(
                'Очистить данные планера?',
                'Будут удалены учебные события и история изменений расписания.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  {
                    text: 'Очистить',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await clearPlannerFixtures();
                        Alert.alert('Готово', 'Данные учебного планера очищены');
                      } catch (e) {
                        Alert.alert('Ошибка', e.message);
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Icon name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Очистить данные планера</Text>
          </TouchableOpacity>
        </View>

        {/* Достижения */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Достижения</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor: borderColor }]}
            onPress={async () => {
              const stats = await getAchievementsCount();
              Alert.alert('Статистика ачивок', `Получено: ${stats.unlocked} из ${stats.total}`);
            }}
          >
            <Icon name="trophy-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Статистика ачивок
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor: borderColor }]}
            onPress={async () => {
              const result = await unlockAchievement('first_note');
              if (result) {
                Alert.alert('Успех', `Тестовая ачивка "Первая заметка" разблокирована!`);
              } else {
                Alert.alert('Инфо', 'Эта ачивка уже получена');
              }
            }}
          >
            <Icon name="star-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Тестовая ачивка
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor: borderColor }]}
            onPress={async () => {
              const result = await unlockAchievement('konami_code');
              if (result) {
                Alert.alert('👁️ За гранью кода', 'Ты нашёл то, что не должен был найти. Или наоборот?');
              } else {
                Alert.alert('Инфо', 'Секретная ачивка уже получена');
              }
            }}
          >
            <Icon name="eye-outline" size={20} color="#6366F1" />
            <Text style={[styles.actionButtonText, { color: textColor }]}>
              Секретная ачивка
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor: borderColor }]}
            onPress={async () => {
              const result = await unlockAchievement('offline_hero');
              if (result) {
                Alert.alert('Успех', 'Ачивка "Партизан" разблокирована');
              } else {
                Alert.alert('Инфо', 'Ачивка "Партизан" уже получена');
              }
            }}
          >
            <Icon name="cloud-offline-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>Тест: offline_hero ачивка</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              let count = 0;
              for (const id of Object.keys(ACHIEVEMENT_DEFINITIONS)) {
                const result = await unlockAchievement(id);
                if (result) count += 1;
              }
              Alert.alert('Готово', `Разблокировано новых ачивок: ${count}`);
            }}
          >
            <Icon name="ribbon-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>Разблокировать все ачивки</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.25)' }]}
            onPress={() => setSnakeVisible(true)}
          >
            <Icon name="game-controller-outline" size={20} color="#6366F1" />
            <Text style={[styles.actionButtonText, { color: textColor }]}>Мини-игра</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            onPress={() => {
              Alert.alert(
                'Очистить ачивки',
                'Все полученные достижения будут сброшены.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Очистить', style: 'destructive', onPress: async () => {
                    await clearAchievements();
                    Alert.alert('Готово', 'Все достижения сброшены');
                  }}
                ]
              );
            }}
          >
            <Icon name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
              Сбросить все ачивки
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

        {/* Пинг всех API */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Пинг всех API</Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: inputBgColor, borderColor }]}
            onPress={async () => {
              setApiPingResults(null);
              const endpoints = [
                { label: 'Новости', fn: () => ApiService.getNews(0, 1) },
                { label: 'Группы', fn: () => ApiService.getGroups(1) },
                { label: 'Расписание', fn: () => ApiService.getSchedule('125-1', new Date()) },
              ];
              const results = await Promise.allSettled(
                endpoints.map(async e => {
                  const start = Date.now();
                  const r = await e.fn();
                  return { label: e.label, ms: Date.now() - start, source: r?.source || '?' };
                })
              );
              const lines = results.map((r, i) =>
                r.status === 'fulfilled'
                  ? `${endpoints[i].label}: ${r.value.ms} мс [${r.value.source}]`
                  : `${endpoints[i].label}: ошибка`
              );
              setApiPingResults(lines.join('\n'));
              Alert.alert('Пинг API', lines.join('\n'));
            }}
          >
            <Icon name="speedometer-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: textColor }]}>Запустить пинг всех эндпоинтов</Text>
          </TouchableOpacity>
          {apiPingResults ? (
            <View style={[styles.debugCard, { backgroundColor: inputBgColor, borderColor }]}>
              <Text style={[styles.debugText, { color: placeholderColor }]}>{apiPingResults}</Text>
            </View>
          ) : null}
        </View>

        {/* Инспектор AsyncStorage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Инспектор AsyncStorage</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: inputBgColor, borderColor, color: textColor }]}
            placeholder="Ключ AsyncStorage..."
            placeholderTextColor={placeholderColor}
            value={storageKeyInput}
            onChangeText={setStorageKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              const key = storageKeyInput.trim();
              if (!key) { Alert.alert('Ошибка', 'Введите ключ'); return; }
              try {
                const value = await AsyncStorage.getItem(key);
                setStorageKeyValue(value !== null ? value : '(null)');
              } catch (e) {
                setStorageKeyValue(`Ошибка: ${e.message}`);
              }
            }}
          >
            <Text style={styles.saveButtonText}>Прочитать значение</Text>
          </TouchableOpacity>
          {storageKeyValue !== null ? (
            <View style={[styles.debugCard, { backgroundColor: inputBgColor, borderColor }]}>
              <Text style={[styles.debugTitle, { color: textColor }]}>Значение:</Text>
              <Text style={[styles.debugText, { color: placeholderColor }]} selectable>
                {storageKeyValue}
              </Text>
            </View>
          ) : null}
        </View>

        <SnakeGame
          visible={snakeVisible}
          onClose={() => setSnakeVisible(false)}
          theme={theme}
          accentColor={accentColor}
        />
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

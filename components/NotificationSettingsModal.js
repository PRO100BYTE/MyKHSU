import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Switch, ScrollView, StyleSheet, PanResponder, Animated, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS } from '../utils/constants';

const NotificationSettingsModal = ({ visible, onClose, theme, accentColor }) => {
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: false,
    news: false,
    schedule: false,
    beforeLesson: true,
    lessonStart: true,
    beforeLessonEnd: false,
    lessonEnd: false
  });

  const [loading, setLoading] = useState(true);
  const [panY] = useState(new Animated.Value(0));

  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const secondaryTextColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const cardBg = theme === 'light' ? '#f8f9fa' : '#2d3748';
  const colors = ACCENT_COLORS[accentColor];

  // Настройки по умолчанию
  const defaultSettings = {
    enabled: false,
    news: false,
    schedule: false,
    beforeLesson: true,
    lessonStart: true,
    beforeLessonEnd: false,
    lessonEnd: false
  };

  // Создаем PanResponder для обработки свайпа
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        panY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        onClose();
      } else {
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true
        }).start();
      }
    }
  });

  useEffect(() => {
    if (visible) {
      loadNotificationSettings();
      panY.setValue(0);
    }
  }, [visible]);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await SecureStore.getItemAsync('notification_settings');
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setNotificationSettings(parsedSettings);
      } else {
        // Если настроек нет, используем настройки по умолчанию
        setNotificationSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setNotificationSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = async (settings) => {
    try {
      await SecureStore.setItemAsync('notification_settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    }
  };

  const handleToggle = async (key, value) => {
    const newSettings = {
      ...notificationSettings,
      [key]: value
    };

    // Логика зависимостей между переключателями
    if (key === 'enabled') {
      if (!value) {
        // Если отключаем главный переключатель, отключаем всё
        newSettings.news = false;
        newSettings.schedule = false;
      }
    } else if (key === 'news' || key === 'schedule') {
      if (value && !newSettings.enabled) {
        // Если включаем какой-то из типов уведомлений, включаем главный переключатель
        newSettings.enabled = true;
      } else if (!value && !newSettings.news && !newSettings.schedule) {
        // Если оба типа отключены, отключаем главный переключатель
        newSettings.enabled = false;
      }
    }

    setNotificationSettings(newSettings);
    
    try {
      await saveNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleResetToDefaults = async () => {
    setNotificationSettings(defaultSettings);
    await saveNotificationSettings(defaultSettings);
  };

  const handleSave = () => {
    onClose();
  };

  const animatedStyle = {
    transform: [{ translateY: panY }]
  };

  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <Animated.View 
            style={[styles.bottomSheet, { backgroundColor: bgColor }, animatedStyle]}
            {...panResponder.panHandlers}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: textColor }]}>
                Загрузка настроек...
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <Animated.View 
          style={[styles.bottomSheet, { backgroundColor: bgColor }, animatedStyle]}
          {...panResponder.panHandlers}
        >
          <View style={styles.sheetHandle} />
          
          <View style={styles.header}>
            <Text style={[styles.sheetTitle, { color: textColor }]}>
              Настройки уведомлений
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Основной переключатель */}
            <View style={[styles.section, { backgroundColor: cardBg }]}>
              <View style={styles.sectionHeader}>
                <Icon name="notifications" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Общие настройки
                </Text>
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: textColor }]}>
                    Включить уведомления
                  </Text>
                  <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                    Разрешить приложению отправлять уведомления
                  </Text>
                </View>
                <Switch
                  value={notificationSettings.enabled}
                  onValueChange={(value) => handleToggle('enabled', value)}
                  trackColor={{ false: '#d1d5db', true: colors.light }}
                  thumbColor={notificationSettings.enabled ? colors.primary : '#9ca3af'}
                />
              </View>
            </View>

            {/* Уведомления о новостях */}
            <View style={[styles.section, { backgroundColor: cardBg }]}>
              <View style={styles.sectionHeader}>
                <Icon name="newspaper" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Новости университета
                </Text>
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: textColor }]}>
                    Уведомления о новостях
                  </Text>
                  <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                    Получать уведомления о новых новостях
                  </Text>
                </View>
                <Switch
                  value={notificationSettings.news && notificationSettings.enabled}
                  onValueChange={(value) => handleToggle('news', value)}
                  trackColor={{ false: '#d1d5db', true: colors.light }}
                  thumbColor={notificationSettings.news && notificationSettings.enabled ? colors.primary : '#9ca3af'}
                  disabled={!notificationSettings.enabled}
                />
              </View>
            </View>

            {/* Уведомления о расписании */}
            {notificationSettings.enabled && (
              <View style={[styles.section, { backgroundColor: cardBg }]}>
                <View style={styles.sectionHeader}>
                  <Icon name="calendar" size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Расписание занятий
                  </Text>
                </View>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: textColor }]}>
                      Уведомления о расписании
                    </Text>
                    <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                      Получать уведомления о парах
                    </Text>
                  </View>
                  <Switch
                    value={notificationSettings.schedule}
                    onValueChange={(value) => handleToggle('schedule', value)}
                    trackColor={{ false: '#d1d5db', true: colors.light }}
                    thumbColor={notificationSettings.schedule ? colors.primary : '#9ca3af'}
                  />
                </View>

                {notificationSettings.schedule && (
                  <>
                    <View style={styles.settingItem}>
                      <View style={styles.settingInfo}>
                        <Text style={[styles.settingLabel, { color: textColor }]}>
                          Напоминать за 5 минут
                        </Text>
                        <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                          Уведомление за 5 минут до начала пары
                        </Text>
                      </View>
                      <Switch
                        value={notificationSettings.beforeLesson}
                        onValueChange={(value) => handleToggle('beforeLesson', value)}
                        trackColor={{ false: '#d1d5db', true: colors.light }}
                        thumbColor={notificationSettings.beforeLesson ? colors.primary : '#9ca3af'}
                      />
                    </View>

                    <View style={styles.settingItem}>
                      <View style={styles.settingInfo}>
                        <Text style={[styles.settingLabel, { color: textColor }]}>
                          Уведомление в начале
                        </Text>
                        <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                          В момент начала пары
                        </Text>
                      </View>
                      <Switch
                        value={notificationSettings.lessonStart}
                        onValueChange={(value) => handleToggle('lessonStart', value)}
                        trackColor={{ false: '#d1d5db', true: colors.light }}
                        thumbColor={notificationSettings.lessonStart ? colors.primary : '#9ca3af'}
                      />
                    </View>

                    <View style={styles.settingItem}>
                      <View style={styles.settingInfo}>
                        <Text style={[styles.settingLabel, { color: textColor }]}>
                          Напоминать за 5 минут до конца
                        </Text>
                        <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                          Уведомление за 5 минут до окончания пары
                        </Text>
                      </View>
                      <Switch
                        value={notificationSettings.beforeLessonEnd}
                        onValueChange={(value) => handleToggle('beforeLessonEnd', value)}
                        trackColor={{ false: '#d1d5db', true: colors.light }}
                        thumbColor={notificationSettings.beforeLessonEnd ? colors.primary : '#9ca3af'}
                      />
                    </View>

                    <View style={styles.settingItem}>
                      <View style={styles.settingInfo}>
                        <Text style={[styles.settingLabel, { color: textColor }]}>
                          Уведомление в конце
                        </Text>
                        <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                          В момент окончания пары
                        </Text>
                      </View>
                      <Switch
                        value={notificationSettings.lessonEnd}
                        onValueChange={(value) => handleToggle('lessonEnd', value)}
                        trackColor={{ false: '#d1d5db', true: colors.light }}
                        thumbColor={notificationSettings.lessonEnd ? colors.primary : '#9ca3af'}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Информационный блок */}
            <View style={[styles.infoSection, { backgroundColor: colors.light }]}>
              <Icon name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                Уведомления работают когда приложение активно или в фоне. Для работы уведомлений о расписании необходимо выбрать группу в разделе "Расписание".
              </Text>
            </View>

            {/* Кнопки действий */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={handleResetToDefaults}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Сбросить настройки
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.primaryButtonText}>
                  Сохранить настройки
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#9ca3af',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
  },
  secondaryButton: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  primaryButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Montserrat_500Medium',
  },
});

export default NotificationSettingsModal;
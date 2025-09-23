import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Switch, ScrollView, StyleSheet, PanResponder, Animated } from 'react-native';
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
  const panY = new Animated.Value(0);

  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const secondaryTextColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const borderColor = theme === 'light' ? '#e5e7eb' : '#374151';
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
        // Если настроек нет, сохраняем настройки по умолчанию
        setNotificationSettings(defaultSettings);
        await saveNotificationSettings(defaultSettings);
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
    if (loading) return;

    const newSettings = {
      ...notificationSettings,
      [key]: value
    };

    // Если отключаем главный переключатель, отключаем всё
    if (key === 'enabled' && !value) {
      newSettings.news = false;
      newSettings.schedule = false;
      newSettings.beforeLesson = false;
      newSettings.lessonStart = false;
      newSettings.beforeLessonEnd = false;
      newSettings.lessonEnd = false;
    }

    // Если включаем какой-то из типов уведомлений, включаем главный переключатель
    if ((key === 'news' || key === 'schedule') && value) {
      newSettings.enabled = true;
    }

    // Если включаем уведомления расписания, включаем базовые настройки
    if (key === 'schedule' && value) {
      newSettings.beforeLesson = true;
      newSettings.lessonStart = true;
    }

    setNotificationSettings(newSettings);
    
    try {
      await saveNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      // В случае ошибки возвращаем предыдущие настройки
      await loadNotificationSettings();
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setNotificationSettings(defaultSettings);
      await saveNotificationSettings(defaultSettings);
    } catch (error) {
      console.error('Error resetting to defaults:', error);
    }
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
          
          <Text style={[styles.sheetTitle, { color: textColor }]}>
            Настройки уведомлений
          </Text>
          
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Основной переключатель */}
            <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <Icon name="notifications-outline" size={24} color={textColor} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: textColor }]}>Уведомления</Text>
                  <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                    Включить или отключить все уведомления
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationSettings.enabled}
                onValueChange={(value) => handleToggle('enabled', value)}
                trackColor={{ false: '#767577', true: colors.light }}
                thumbColor={notificationSettings.enabled ? colors.primary : '#f4f3f4'}
              />
            </View>

            {notificationSettings.enabled && (
              <>
                {/* Уведомления о новостях */}
                <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                  <View style={styles.settingInfo}>
                    <Icon name="newspaper-outline" size={24} color={textColor} />
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: textColor }]}>Новости</Text>
                      <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                        Уведомления о новых новостях университета
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationSettings.news}
                    onValueChange={(value) => handleToggle('news', value)}
                    trackColor={{ false: '#767577', true: colors.light }}
                    thumbColor={notificationSettings.news ? colors.primary : '#f4f3f4'}
                  />
                </View>

                {/* Уведомления о расписании */}
                <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                  <View style={styles.settingInfo}>
                    <Icon name="calendar-outline" size={24} color={textColor} />
                    <View style={styles.settingText}>
                      <Text style={[styles.settingTitle, { color: textColor }]}>Расписание</Text>
                      <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                        Уведомления о предстоящих парах
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notificationSettings.schedule}
                    onValueChange={(value) => handleToggle('schedule', value)}
                    trackColor={{ false: '#767577', true: colors.light }}
                    thumbColor={notificationSettings.schedule ? colors.primary : '#f4f3f4'}
                  />
                </View>

                {notificationSettings.schedule && (
                  <>
                    <Text style={[styles.sectionTitle, { color: textColor, marginTop: 16 }]}>
                      Напоминания о парах
                    </Text>
                    
                    <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                      <View style={styles.settingInfo}>
                        <Icon name="time-outline" size={20} color={textColor} />
                        <View style={styles.settingText}>
                          <Text style={[styles.settingTitle, { color: textColor }]}>За 5 минут до начала</Text>
                          <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                            Напомнить за 5 минут до начала пары
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={notificationSettings.beforeLesson}
                        onValueChange={(value) => handleToggle('beforeLesson', value)}
                        trackColor={{ false: '#767577', true: colors.light }}
                        thumbColor={notificationSettings.beforeLesson ? colors.primary : '#f4f3f4'}
                      />
                    </View>

                    <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                      <View style={styles.settingInfo}>
                        <Icon name="play-outline" size={20} color={textColor} />
                        <View style={styles.settingText}>
                          <Text style={[styles.settingTitle, { color: textColor }]}>В начале пары</Text>
                          <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                            Уведомление в момент начала пары
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={notificationSettings.lessonStart}
                        onValueChange={(value) => handleToggle('lessonStart', value)}
                        trackColor={{ false: '#767577', true: colors.light }}
                        thumbColor={notificationSettings.lessonStart ? colors.primary : '#f4f3f4'}
                      />
                    </View>

                    <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                      <View style={styles.settingInfo}>
                        <Icon name="time-outline" size={20} color={textColor} />
                        <View style={styles.settingText}>
                          <Text style={[styles.settingTitle, { color: textColor }]}>За 5 минут до конца</Text>
                          <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                            Напомнить за 5 минут до конца пары
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={notificationSettings.beforeLessonEnd}
                        onValueChange={(value) => handleToggle('beforeLessonEnd', value)}
                        trackColor={{ false: '#767577', true: colors.light }}
                        thumbColor={notificationSettings.beforeLessonEnd ? colors.primary : '#f4f3f4'}
                      />
                    </View>

                    <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                      <View style={styles.settingInfo}>
                        <Icon name="stop-outline" size={20} color={textColor} />
                        <View style={styles.settingText}>
                          <Text style={[styles.settingTitle, { color: textColor }]}>В конце пары</Text>
                          <Text style={[styles.settingDescription, { color: secondaryTextColor }]}>
                            Уведомление в момент окончания пары
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={notificationSettings.lessonEnd}
                        onValueChange={(value) => handleToggle('lessonEnd', value)}
                        trackColor={{ false: '#767577', true: colors.light }}
                        thumbColor={notificationSettings.lessonEnd ? colors.primary : '#f4f3f4'}
                      />
                    </View>
                  </>
                )}
              </>
            )}

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.primary }]}
                onPress={handleResetToDefaults}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Сбросить настройки
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Icon name="information-circle-outline" size={20} color={secondaryTextColor} />
              <Text style={[styles.infoText, { color: secondaryTextColor }]}>
                Уведомления работают только когда приложение активно или в фоне
              </Text>
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.sheetButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={[styles.sheetButtonText, { color: '#ffffff' }]}>
              Сохранить настройки
            </Text>
          </TouchableOpacity>
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#9ca3af',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
  },
  scrollContent: {
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  actionsContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  sheetButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sheetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
  },
});

export default NotificationSettingsModal;
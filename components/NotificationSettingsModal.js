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
  const [panY] = useState(new Animated.Value(0));

  const bgColor = theme === 'light' ? '#ffffff' : '#1f2937';
  const textColor = theme === 'light' ? '#111827' : '#ffffff';
  const placeholderColor = theme === 'light' ? '#6b7280' : '#9ca3af';
  const colors = ACCENT_COLORS[accentColor];

  // Создаем PanResponder для обработки свайпа (как в AppearanceSettingsSheet)
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
      loadSettings();
      panY.setValue(0);
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const savedSettings = await SecureStore.getItemAsync('notification_settings');
      
      if (savedSettings) {
        setNotificationSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settings) => {
    try {
      await SecureStore.setItemAsync('notification_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { 
      ...notificationSettings, 
      [key]: !notificationSettings[key] 
    };
    
    // Логика зависимостей
    if (key === 'enabled' && !newSettings.enabled) {
      newSettings.news = false;
      newSettings.schedule = false;
    } else if ((key === 'news' || key === 'schedule') && newSettings[key] && !newSettings.enabled) {
      newSettings.enabled = true;
    }
    
    setNotificationSettings(newSettings);
    saveSettings(newSettings);
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
              <Text style={[styles.sheetTitle, { color: textColor }]}>
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
          
          <ScrollView style={styles.scrollContent}>
            {/* Основной переключатель */}
            <View style={styles.settingSection}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Icon name="notifications-outline" size={24} color={colors.primary} style={styles.settingIcon} />
                  <View>
                    <Text style={[styles.settingLabel, { color: textColor }]}>
                      Включить уведомления
                    </Text>
                    <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                      Разрешить приложению отправлять уведомления
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notificationSettings.enabled}
                  onValueChange={() => toggleSetting('enabled')}
                  trackColor={{ false: '#d1d5db', true: colors.light }}
                  thumbColor={notificationSettings.enabled ? colors.primary : '#9ca3af'}
                />
              </View>
            </View>

            {/* Уведомления о новостях */}
            <View style={styles.settingSection}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Новости</Text>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Icon name="newspaper-outline" size={20} color={placeholderColor} style={styles.settingIcon} />
                  <View>
                    <Text style={[styles.settingLabel, { color: textColor }]}>
                      Уведомления о новостях
                    </Text>
                    <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                      Получать уведомления о новых новостях
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notificationSettings.news && notificationSettings.enabled}
                  onValueChange={() => toggleSetting('news')}
                  trackColor={{ false: '#d1d5db', true: colors.light }}
                  thumbColor={notificationSettings.news && notificationSettings.enabled ? colors.primary : '#9ca3af'}
                  disabled={!notificationSettings.enabled}
                />
              </View>
            </View>

            {/* Уведомления о расписании */}
            <View style={styles.settingSection}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Расписание</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Icon name="calendar-outline" size={20} color={placeholderColor} style={styles.settingIcon} />
                  <View>
                    <Text style={[styles.settingLabel, { color: textColor }]}>
                      Уведомления о расписании
                    </Text>
                    <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                      Получать уведомления о парах
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notificationSettings.schedule && notificationSettings.enabled}
                  onValueChange={() => toggleSetting('schedule')}
                  trackColor={{ false: '#d1d5db', true: colors.light }}
                  thumbColor={notificationSettings.schedule && notificationSettings.enabled ? colors.primary : '#9ca3af'}
                  disabled={!notificationSettings.enabled}
                />
              </View>

              {notificationSettings.schedule && notificationSettings.enabled && (
                <>
                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <Icon name="time-outline" size={20} color={placeholderColor} style={styles.settingIcon} />
                      <View>
                        <Text style={[styles.settingLabel, { color: textColor }]}>
                          За 5 минут до начала
                        </Text>
                        <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                          Уведомление за 5 минут до начала пары
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={notificationSettings.beforeLesson}
                      onValueChange={() => toggleSetting('beforeLesson')}
                      trackColor={{ false: '#d1d5db', true: colors.light }}
                      thumbColor={notificationSettings.beforeLesson ? colors.primary : '#9ca3af'}
                    />
                  </View>

                  <View style={styles.settingItem}>
                    <View style={styles.settingInfo}>
                      <Icon name="play-outline" size={20} color={placeholderColor} style={styles.settingIcon} />
                      <View>
                        <Text style={[styles.settingLabel, { color: textColor }]}>
                          В начале пары
                        </Text>
                        <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                          Уведомление в момент начала пары
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={notificationSettings.lessonStart}
                      onValueChange={() => toggleSetting('lessonStart')}
                      trackColor={{ false: '#d1d5db', true: colors.light }}
                      thumbColor={notificationSettings.lessonStart ? colors.primary : '#9ca3af'}
                    />
                  </View>
                </>
              )}
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Закрыть</Text>
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
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
  },
  scrollContent: {
    flex: 1,
  },
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  closeButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotificationSettingsModal;
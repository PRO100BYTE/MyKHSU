import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';

const NotificationSettingsModal = ({ theme, accentColor }) => {
  const [settings, setSettings] = useState({
    enabled: false,
    news: false,
    schedule: false,
    beforeLesson: true,
    lessonStart: true,
    beforeLessonEnd: true,
    lessonEnd: true
  });

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
      const saved = await SecureStore.getItemAsync('notification_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await SecureStore.setItemAsync('notification_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    
    // Логика зависимостей
    if (key === 'enabled' && !newSettings.enabled) {
      newSettings.news = false;
      newSettings.schedule = false;
    } else if ((key === 'news' || key === 'schedule') && newSettings[key] && !newSettings.enabled) {
      newSettings.enabled = true;
    }
    
    saveSettings(newSettings);
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView 
        style={{ flex: 1, padding: 16 }} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
            {/* Основные настройки */}
            <View style={[styles.sectionCard, { backgroundColor: inputBgColor, borderColor }]}>
            <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <Icon name="notifications-outline" size={24} color={colors.primary} />
                <View style={styles.textContainer}>
                  <Text style={[styles.settingLabel, { color: textColor }]}>Уведомления</Text>
                  <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                    Включить все уведомления
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={() => toggleSetting('enabled')}
                trackColor={{ false: borderColor, true: colors.light }}
                thumbColor={settings.enabled ? colors.primary : placeholderColor}
              />
            </View>

            {/* Новости */}
            <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <Icon name="newspaper-outline" size={24} color={placeholderColor} />
                <View style={styles.textContainer}>
                  <Text style={[styles.settingLabel, { color: textColor }]}>Новости</Text>
                  <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                    Уведомления о новых новостях
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.news && settings.enabled}
                onValueChange={() => toggleSetting('news')}
                trackColor={{ false: borderColor, true: colors.light }}
                thumbColor={settings.news && settings.enabled ? colors.primary : placeholderColor}
                disabled={!settings.enabled}
              />
            </View>

            {/* Расписание */}
            <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <Icon name="calendar-outline" size={24} color={placeholderColor} />
                <View style={styles.textContainer}>
                  <Text style={[styles.settingLabel, { color: textColor }]}>Расписание</Text>
                  <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                    Уведомления о парах
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.schedule && settings.enabled}
                onValueChange={() => toggleSetting('schedule')}
                trackColor={{ false: borderColor, true: colors.light }}
                thumbColor={settings.schedule && settings.enabled ? colors.primary : placeholderColor}
                disabled={!settings.enabled}
              />
            </View>
            </View>

            {settings.schedule && settings.enabled && (
              <View style={[styles.sectionCard, { backgroundColor: inputBgColor, borderColor, marginTop: 16 }]}>
                <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 8 }]}>
                  Уведомления о начале пары
                </Text>
                
                <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                  <View style={styles.settingInfo}>
                    <Icon name="alarm-outline" size={20} color={placeholderColor} />
                    <View style={styles.textContainer}>
                      <Text style={[styles.settingLabel, { color: textColor }]}>За 5 минут до начала</Text>
                      <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                        Напоминание перед парой
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.beforeLesson}
                    onValueChange={() => toggleSetting('beforeLesson')}
                    trackColor={{ false: borderColor, true: colors.light }}
                    thumbColor={settings.beforeLesson ? colors.primary : placeholderColor}
                  />
                </View>

                <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                  <View style={styles.settingInfo}>
                    <Icon name="play-outline" size={20} color={placeholderColor} />
                    <View style={styles.textContainer}>
                      <Text style={[styles.settingLabel, { color: textColor }]}>В начале пары</Text>
                      <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                        Уведомление о начале
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.lessonStart}
                    onValueChange={() => toggleSetting('lessonStart')}
                    trackColor={{ false: borderColor, true: colors.light }}
                    thumbColor={settings.lessonStart ? colors.primary : placeholderColor}
                  />
                </View>

                <Text style={[styles.sectionTitle, { color: textColor, marginTop: 8, marginBottom: 8 }]}>
                  Уведомления о конце пары
                </Text>

                <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                  <View style={styles.settingInfo}>
                    <Icon name="alarm-outline" size={20} color={placeholderColor} />
                    <View style={styles.textContainer}>
                      <Text style={[styles.settingLabel, { color: textColor }]}>За 5 минут до конца</Text>
                      <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                        Напоминание перед окончанием
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.beforeLessonEnd}
                    onValueChange={() => toggleSetting('beforeLessonEnd')}
                    trackColor={{ false: borderColor, true: colors.light }}
                    thumbColor={settings.beforeLessonEnd ? colors.primary : placeholderColor}
                  />
                </View>

                <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
                  <View style={styles.settingInfo}>
                    <Icon name="stop-outline" size={20} color={placeholderColor} />
                    <View style={styles.textContainer}>
                      <Text style={[styles.settingLabel, { color: textColor }]}>В конце пары</Text>
                      <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                        Уведомление об окончании
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={settings.lessonEnd}
                    onValueChange={() => toggleSetting('lessonEnd')}
                    trackColor={{ false: borderColor, true: colors.light }}
                    thumbColor={settings.lessonEnd ? colors.primary : placeholderColor}
                  />
                </View>
              </View>
            )}

            {/* Информация */}
            <View style={[styles.infoSection, { backgroundColor: inputBgColor, borderColor }]}>
              <Icon name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: placeholderColor, marginLeft: 8, flex: 1 }]}>
                Настройки уведомлений применяются автоматически
              </Text>
            </View>
          </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    borderRadius: 16,
    padding: 4,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
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
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
});

export default NotificationSettingsModal;
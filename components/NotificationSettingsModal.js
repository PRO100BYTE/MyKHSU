import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, AppState, Linking } from 'react-native';
import ScrollView from './ScreenScrollView';
import { Ionicons as Icon } from '@expo/vector-icons';
import notificationService from '../utils/notificationService';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import { SectionHeader, SettingsGroup } from './SettingsComponents';

const NotificationSettingsModal = ({ theme, accentColor }) => {
  const [settings, setSettings] = useState(notificationService.getDefaultSettings());
  const [busy, setBusy] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);

  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const borderColor = glass.border;
  const inputBgColor = glass.surfaceTertiary;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [saved, granted] = await Promise.all([
          notificationService.getNotificationSettings(), notificationService.hasPermission(),
        ]);
        if (active) { setSettings(saved); setPermissionGranted(granted); }
      } catch {
        if (active) setError('Не удалось загрузить настройки.');
      } finally {
        if (active) setBusy(false);
      }
    };
    load();
    const unsubscribe = notificationService.subscribe(event => {
      if (active && event.type === 'settingsChanged') setSettings(event.settings);
    });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') load();
    });
    return () => { active = false; unsubscribe(); subscription.remove(); };
  }, []);

  const toggleSetting = async key => {
    if (saving.current || busy) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const newSettings = { ...settings, [key]: !settings[key] };
      // Master/category toggles gate delivery without destroying the saved sub-preferences.
      if (key === 'enabled' && newSettings.enabled) {
        const granted = await notificationService.requestPermissions();
        setPermissionGranted(granted);
        if (!granted) setError('Системные уведомления запрещены. В приложении уведомления доступны при открытом экране.');
      }
      setSettings(await notificationService.saveNotificationSettings(newSettings));
    } catch (failure) {
      console.error('Error saving notification settings:', failure);
      setError('Не удалось применить настройки. Повторите попытку.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const openSystemSettings = async () => {
    try { await Linking.openSettings(); }
    catch { setError('Не удалось открыть настройки устройства.'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
            {error ? <Text accessibilityRole="alert" style={{ color: textColor, paddingVertical: 16 }}>{error}</Text> : null}
            {settings.enabled && !permissionGranted && (
              <TouchableOpacity onPress={openSystemSettings} accessibilityRole="button" style={{ paddingVertical: 16, minHeight: 44 }}>
                <Text style={{ color: colors.primary }}>Разрешить уведомления в настройках устройства</Text>
              </TouchableOpacity>
            )}
            {busy && <Text style={{ color: placeholderColor }}>Применение настроек…</Text>}
            {/* Основные настройки */}
            <SectionHeader 
              title="Общие уведомления"
              placeholderColor={placeholderColor}
            />
            <SettingsGroup glass={glass}>
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
                disabled={busy}
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
                disabled={busy || !settings.enabled}
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
                disabled={busy || !settings.enabled}
              />
            </View>

            <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
              <View style={styles.settingInfo}>
                <Icon name="sync-outline" size={24} color={placeholderColor} />
                <View style={styles.textContainer}>
                  <Text style={[styles.settingLabel, { color: textColor }]}>Изменения расписания</Text>
                  <Text style={[styles.settingDescription, { color: placeholderColor }]}>
                    Уведомления при изменении пар
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.scheduleChanges && settings.schedule && settings.enabled}
                onValueChange={() => toggleSetting('scheduleChanges')}
                trackColor={{ false: borderColor, true: colors.light }}
                thumbColor={settings.scheduleChanges && settings.schedule && settings.enabled ? colors.primary : placeholderColor}
                disabled={busy || !settings.enabled || !settings.schedule}
              />
            </View>
            </SettingsGroup>

            {settings.schedule && settings.enabled && (
              <>
              <SectionHeader 
                title="Уведомления о парах"
                placeholderColor={placeholderColor}
              />
              <SettingsGroup glass={glass}>
                
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
                    disabled={busy}
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
                    disabled={busy}
                    value={settings.lessonStart}
                    onValueChange={() => toggleSetting('lessonStart')}
                    trackColor={{ false: borderColor, true: colors.light }}
                    thumbColor={settings.lessonStart ? colors.primary : placeholderColor}
                  />
                </View>


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
                    disabled={busy}
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
                    disabled={busy}
                    value={settings.lessonEnd}
                    onValueChange={() => toggleSetting('lessonEnd')}
                    trackColor={{ false: borderColor, true: colors.light }}
                    thumbColor={settings.lessonEnd ? colors.primary : placeholderColor}
                  />
                </View>
              </SettingsGroup>
              </>
            )}

            {/* Информация */}
            <View style={[styles.infoSection, { backgroundColor: glass?.surfaceTertiary, borderColor }]}>
              <Icon name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: placeholderColor, marginLeft: 8, flex: 1 }]}>
                Настройки применяются автоматически. Напоминания о парах планируются из загруженного расписания. Новости и изменения без сервера push проверяются только при работе приложения или при разрешённом ОС фоновом запуске; доставка после закрытия не гарантируется.
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
    padding: 14,
    gap: 12,
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
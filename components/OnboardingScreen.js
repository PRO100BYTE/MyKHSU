import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT_COLORS, APP_DEVELOPERS, APP_SUPPORTERS, LIQUID_GLASS } from '../utils/constants';
import notificationService from '../utils/notificationService';
import { completeOnboarding } from '../utils/onboarding';

const pages = [
  { icon: 'school-outline', title: 'Добро пожаловать в Мой ИТИ ХГУ', text: 'Расписание, новости и полезные сервисы института — в одном приложении.' },
  { icon: 'sparkles-outline', title: 'Всё нужное для учёбы', text: 'Находите расписание студентов и преподавателей, новости с офлайн-доступом, карту корпусов и раздел «Студгородок».' },
  { icon: 'options-outline', title: 'Настройте доступ по желанию', text: 'Уведомления сообщают о новостях и расписании. Доступ к календарю нужен только для экспорта занятий.', permission: true },
  { icon: 'share-outline', title: 'Сохраняйте и делитесь', text: 'Расписание можно экспортировать в системный календарь или поделиться файлом через системное меню. Доступ к галерее для этого не нужен.' },
];

const OnboardingScreen = ({ visible = true, onComplete, theme = 'light', accentColor = 'green' }) => {
  const insets = useSafeAreaInsets();
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const [page, setPage] = useState(0);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [notificationConfigured, setNotificationConfigured] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState('undetermined');
  const [busy, setBusy] = useState(false);
  const [completionError, setCompletionError] = useState(null);
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const current = pages[page];
  const isLast = page === pages.length - 1;

  const refreshPermissionStatus = useCallback(async () => {
    try {
      const [granted, settings, calendar] = await Promise.all([
        notificationService.hasPermission(), notificationService.getNotificationSettings(), Calendar.getCalendarPermissionsAsync(),
      ]);
      if (!mountedRef.current) return;
      setNotificationGranted(granted === true);
      setNotificationConfigured(Boolean(settings?.enabled && settings?.news && settings?.schedule));
      setCalendarStatus(calendar?.status || 'undetermined');
    } catch (error) {
      console.error('Error reading onboarding permissions:', error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = visible;
    if (!visible) return () => { mountedRef.current = false; };
    refreshPermissionStatus();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && mountedRef.current) refreshPermissionStatus();
    });
    return () => { mountedRef.current = false; subscription.remove(); };
  }, [refreshPermissionStatus, visible]);

  const runExclusive = async operation => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (mountedRef.current) setBusy(true);
    try { await operation(); } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const finish = () => runExclusive(async () => {
    if (mountedRef.current) setCompletionError(null);
    try {
      await completeOnboarding(AsyncStorage);
      if (mountedRef.current) onComplete?.();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      if (mountedRef.current) setCompletionError('Не удалось сохранить завершение знакомства. Проверьте свободное место и нажмите ещё раз.');
    }
  });

  const requestNotifications = () => runExclusive(async () => {
    try {
      const granted = await notificationService.requestPermissions();
      if (!granted) {
        if (mountedRef.current) setNotificationGranted(false);
        Alert.alert('Уведомления отключены', 'Разрешите уведомления в настройках устройства, чтобы получать новости и напоминания.', [
          { text: 'Позже', style: 'cancel' },
          { text: 'Открыть настройки', onPress: () => Linking.openSettings().catch(error => console.error('Unable to open settings:', error)) },
        ]);
        return;
      }
      const settings = await notificationService.saveNotificationSettings({ enabled: true, news: true, schedule: true });
      if (mountedRef.current) { setNotificationGranted(true); setNotificationConfigured(Boolean(settings?.enabled && settings?.news && settings?.schedule)); }
    } catch (error) {
      console.error('Error configuring onboarding notifications:', error);
      if (mountedRef.current) Alert.alert('Не удалось включить уведомления', 'Разрешение устройства получено, но настройки приложения не сохранились. Попробуйте ещё раз.');
    }
  });

  const requestCalendar = () => runExclusive(async () => {
    try {
      const result = await Calendar.requestCalendarPermissionsAsync();
      if (mountedRef.current) setCalendarStatus(result?.status || 'denied');
      if (result?.status !== 'granted') {
        Alert.alert('Календарь недоступен', 'Разрешите доступ в настройках устройства, чтобы экспортировать занятия.', [
          { text: 'Позже', style: 'cancel' },
          { text: 'Открыть настройки', onPress: () => Linking.openSettings().catch(error => console.error('Unable to open settings:', error)) },
        ]);
      }
    } catch (error) {
      console.error('Error requesting onboarding calendar permission:', error);
      if (mountedRef.current) Alert.alert('Не удалось проверить календарь', 'Попробуйте ещё раз или разрешите доступ в настройках устройства.');
    }
  });

  const notificationLabel = useMemo(() => notificationGranted
    ? (notificationConfigured ? 'Уведомления разрешены и настроены' : 'Разрешения уведомлений выданы')
    : 'Уведомления не разрешены', [notificationConfigured, notificationGranted]);
  const calendarLabel = calendarStatus === 'granted' ? 'Календарь разрешён' : calendarStatus === 'denied' ? 'Календарь не разрешён' : 'Календарь не запрашивался';

  if (!visible) return null;
  return (
    <View style={[styles.container, { backgroundColor: glass.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}><Text style={[styles.counter, { color: glass.textSecondary }]}>{page + 1} из {pages.length}</Text><Pressable onPress={finish} disabled={busy} accessibilityRole="button"><Text style={[styles.skip, { color: colors.primary }]}>Пропустить</Text></Pressable></View>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}><Icon name={current.icon} size={54} color="#fff" /></View>
          <Text style={[styles.title, { color: glass.text }]}>{current.title}</Text>
          <Text style={[styles.text, { color: glass.textSecondary }]}>{current.text}</Text>
          {page === 0 && <Text style={[styles.meta, { color: glass.textTertiary }]}>Разработано {APP_DEVELOPERS}. При поддержке {APP_SUPPORTERS}.</Text>}
          {current.permission && <View style={styles.actions}>
            <Text style={[styles.status, { color: glass.textSecondary }]}>{notificationLabel}</Text>
            <Pressable style={[styles.permissionButton, { borderColor: colors.primary }]} onPress={requestNotifications} disabled={busy}><Icon name="notifications-outline" size={19} color={colors.primary} /><Text style={[styles.permissionText, { color: colors.primary }]}>Включить уведомления</Text></Pressable>
            <Text style={[styles.status, { color: glass.textSecondary }]}>{calendarLabel}</Text>
            <Pressable style={[styles.permissionButton, { borderColor: colors.primary }]} onPress={requestCalendar} disabled={busy}><Icon name="calendar-outline" size={19} color={colors.primary} /><Text style={[styles.permissionText, { color: colors.primary }]}>Разрешить календарь</Text></Pressable>
          </View>}
        </View>
        {completionError && <Text style={styles.error}>{completionError}</Text>}
        <View style={styles.footer}><View style={styles.dots}>{pages.map((item, index) => <View key={item.title} style={[styles.dot, { backgroundColor: index === page ? colors.primary : glass.textTertiary }]} />)}</View><View style={styles.navigation}>
          <Pressable onPress={() => setPage(Math.max(0, page - 1))} disabled={page === 0 || busy} style={styles.back}><Text style={[styles.backText, { color: page === 0 ? glass.textTertiary : glass.text }]}>Назад</Text></Pressable>
          <Pressable onPress={isLast ? finish : () => setPage(page + 1)} disabled={busy} style={[styles.next, { backgroundColor: colors.primary }]}><Text style={styles.nextText}>{isLast ? 'Начать' : 'Далее'}</Text></Pressable>
        </View></View>
      </ScrollView>
    </View>
  );
};

const font = 'Montserrat_400Regular';
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 }, scrollContent: { flexGrow: 1 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: 13, fontFamily: font }, skip: { fontFamily: 'Montserrat_600SemiBold', fontSize: 15 }, content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }, meta: { fontFamily: font, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 18, maxWidth: 340 }, title: { fontFamily: 'Montserrat_600SemiBold', fontSize: 24, lineHeight: 30, textAlign: 'center', marginBottom: 14 }, text: { fontFamily: font, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 360 },
  actions: { width: '100%', marginTop: 24, gap: 8 }, status: { fontFamily: font, textAlign: 'center', fontSize: 12, marginTop: 3 }, permissionButton: { minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, permissionText: { fontFamily: 'Montserrat_600SemiBold' }, error: { fontFamily: font, color: '#DC2626', textAlign: 'center', marginBottom: 12 }, footer: {}, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 16 }, dot: { width: 8, height: 8, borderRadius: 4 }, navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { padding: 14 }, backText: { fontFamily: font, fontSize: 15 }, next: { minWidth: 120, alignItems: 'center', borderRadius: 14, paddingVertical: 14 }, nextText: { fontFamily: 'Montserrat_600SemiBold', color: '#fff', fontSize: 15 },
});

export default OnboardingScreen;

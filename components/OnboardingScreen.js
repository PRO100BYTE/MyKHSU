import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  AppState,
  BackHandler,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import OnboardingNavigation from './OnboardingNavigation';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCENT_COLORS, APP_DEVELOPERS, APP_SUPPORTERS, LIQUID_GLASS } from '../utils/constants';
import notificationService from '../utils/notificationService';
import { completeOnboarding } from '../utils/onboarding';

const pages = [
  { icon: 'school-outline', title: 'Добро пожаловать в Мой ИТИ ХГУ', text: 'Расписание, новости и полезные сервисы института — в одном приложении.' },
  { icon: 'sparkles-outline', title: 'Всё нужное для учёбы', text: 'Находите расписание студентов и преподавателей, новости с офлайн-доступом, карту корпусов и раздел «Студгородок».' },
  { icon: 'options-outline', title: 'Настройте доступ по желанию', text: 'Уведомления сообщают о новостях и расписании. Доступ к календарю нужен только для экспорта занятий.', permission: true },
  { icon: 'share-outline', title: 'Сохраняйте и делитесь', text: 'Расписание можно экспортировать в системный календарь или поделиться файлом через системное меню. Доступ к галерее для этого не нужен.', features: true },
];

const featureDetails = [
  { icon: 'calendar-outline', title: 'Расписание', detail: 'Смотрите расписание студентов и преподавателей и экспортируйте занятия в системный календарь.' },
  { icon: 'newspaper-outline', title: 'Новости офлайн', detail: 'Новости университета доступны с кэшированием, чтобы важная информация была под рукой без сети.' },
  { icon: 'map-outline', title: 'Карта корпусов', detail: 'Находите нужный корпус и ориентируйтесь на территории института.' },
  { icon: 'school-outline', title: 'Студгородок', detail: 'Полезная информация для повседневной студенческой жизни собрана в отдельном разделе.' },
  { icon: 'notifications-outline', title: 'Уведомления', detail: 'Получайте новости и напоминания о расписании — только после вашего разрешения.' },
  { icon: 'color-palette-outline', title: 'Темы оформления', detail: 'Выбирайте светлую или тёмную тему и акцентный цвет в настройках приложения.' },
];

const OnboardingScreen = ({ visible = true, onComplete, theme = 'light', accentColor = 'green' }) => {
  const insets = useSafeAreaInsets();
  const [pagerWidth, setPagerWidth] = useState(0);
  const pageWidth = Math.max(1, pagerWidth);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [notificationConfigured, setNotificationConfigured] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState('undetermined');
  const [busy, setBusy] = useState(false);
  const [completionError, setCompletionError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const isLast = page === pages.length - 1;

  const currentPageRef = useRef(page);
  useEffect(() => { currentPageRef.current = page; }, [page]);
  useEffect(() => {
    if (!visible || pagerWidth <= 0) return;
    scrollRef.current?.scrollTo({ x: currentPageRef.current * pageWidth, animated: false });
  }, [pageWidth, pagerWidth, visible]);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => setReduceMotion(value));
    return () => { active = false; subscription?.remove?.(); };
  }, []);

  const refreshPermissionStatus = useCallback(async () => {
    try {
      const [granted, settings, calendar] = await Promise.all([
        notificationService.hasPermission(), notificationService.getNotificationSettings(), Calendar.getCalendarPermissions(),
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

  useEffect(() => {
    if (!visible) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!selectedFeature) return false;
      setSelectedFeature(null);
      return true;
    });
    return () => subscription.remove();
  }, [selectedFeature, visible]);

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
      const result = await Calendar.requestCalendarPermissions();
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

  const goToPage = index => {
    const nextPage = Math.max(0, Math.min(pages.length - 1, index));
    setPage(nextPage);
    if (pagerWidth > 0) scrollRef.current?.scrollTo({ x: nextPage * pageWidth, animated: !reduceMotion });
  };
  const notificationLabel = useMemo(() => notificationGranted
    ? (notificationConfigured ? 'Уведомления разрешены и настроены' : 'Разрешения уведомлений выданы')
    : 'Уведомления не разрешены', [notificationConfigured, notificationGranted]);
  const calendarLabel = calendarStatus === 'granted' ? 'Календарь разрешён' : calendarStatus === 'denied' ? 'Календарь не разрешён' : 'Календарь не запрашивался';

  if (!visible) return null;
  return (
    <View style={[styles.container, { backgroundColor: glass.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topRow}><Text style={[styles.counter, { color: glass.textSecondary }]}>{page + 1} из {pages.length}</Text><Pressable onPress={finish} disabled={busy} accessibilityRole="button" accessibilityLabel="Пропустить знакомство"><Text style={[styles.skip, { color: colors.primary }]}>Пропустить</Text></Pressable></View>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={styles.pager}
        contentContainerStyle={styles.pages}
        onLayout={event => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth > 0 && nextWidth !== pagerWidth) setPagerWidth(nextWidth);
        }}
        onMomentumScrollEnd={event => setPage(Math.max(0, Math.min(pages.length - 1, Math.round(event.nativeEvent.contentOffset.x / pageWidth))))}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        accessible={false}
      >
        {pagerWidth > 0 && pages.map((item, index) => {
          const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
          const animatePage = !reduceMotion;
          const opacity = animatePage ? scrollX.interpolate({ inputRange, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' }) : 1;
          const scale = animatePage ? scrollX.interpolate({ inputRange, outputRange: [0.96, 1, 0.96], extrapolate: 'clamp' }) : 1;
          return (
            <Animated.View key={item.title} accessibilityElementsHidden={index !== page} style={[styles.page, { width: pageWidth, opacity, transform: [{ scale }] }]}>
              <ScrollView style={styles.pageScroll} contentContainerStyle={styles.content} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}><Icon name={item.icon} size={50} color="#fff" /></View>
                <Text style={[styles.title, { color: glass.text }]}>{item.title}</Text>
                <Text style={[styles.text, { color: glass.textSecondary }]}>{item.text}</Text>
                {index === 0 && <Text style={[styles.meta, { color: glass.textTertiary }]}>Разработано {APP_DEVELOPERS}. При поддержке {APP_SUPPORTERS}.</Text>}
                {item.permission && <View style={styles.actions}>
                  <Text style={[styles.status, { color: glass.textSecondary }]}>{notificationLabel}</Text>
                  <Pressable style={[styles.permissionButton, { borderColor: colors.primary }]} onPress={requestNotifications} disabled={busy} accessibilityRole="button"><Icon name="notifications-outline" size={19} color={colors.primary} /><Text style={[styles.permissionText, { color: colors.primary }]}>Включить уведомления</Text></Pressable>
                  <Text style={[styles.status, { color: glass.textSecondary }]}>{calendarLabel}</Text>
                  <Pressable style={[styles.permissionButton, { borderColor: colors.primary }]} onPress={requestCalendar} disabled={busy} accessibilityRole="button"><Icon name="calendar-outline" size={19} color={colors.primary} /><Text style={[styles.permissionText, { color: colors.primary }]}>Разрешить календарь</Text></Pressable>
                </View>}
                {item.features && <View style={styles.featureGrid}>{featureDetails.map(feature => <Pressable key={feature.title} onPress={() => setSelectedFeature(feature)} style={[styles.featureCard, { width: Math.max(1, pagerWidth < 420 ? (pagerWidth - 9) / 2 : (pagerWidth - 18) / 3), backgroundColor: glass.surfaceCard, borderColor: glass.border }]} accessibilityRole="button" accessibilityLabel={`Подробнее: ${feature.title}`} accessibilityElementsHidden={index !== page}><Icon name={feature.icon} size={23} color={colors.primary} /><Text style={[styles.featureTitle, { color: glass.text }]}>{feature.title}</Text><Text style={[styles.featureHint, { color: glass.textTertiary }]}>Подробнее</Text></Pressable>)}</View>}
              </ScrollView>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      {completionError && <Text style={styles.error}>{completionError}</Text>}
      <View style={styles.footer}><View style={styles.dots}>{pages.map((item, index) => <View key={item.title} style={[styles.dot, { backgroundColor: index === page ? colors.primary : glass.textTertiary }]} />)}</View><OnboardingNavigation onBack={() => goToPage(Math.max(0, page - 1))} onNext={isLast ? finish : () => goToPage(page + 1)} backDisabled={page === 0} busy={busy} isLast={isLast} accent={colors.primary} textColor={glass.text} theme={theme} /></View>
      <Modal visible={Boolean(selectedFeature)} transparent animationType="fade" onRequestClose={() => setSelectedFeature(null)}>
        <View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: glass.background }]}><Pressable onPress={() => setSelectedFeature(null)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Закрыть подробности"><Icon name="close" size={24} color={glass.text} /></Pressable><ScrollView contentContainerStyle={styles.modalContent}><Icon name={selectedFeature?.icon || 'information-circle-outline'} size={42} color={colors.primary} /><Text style={[styles.modalTitle, { color: glass.text }]}>{selectedFeature?.title}</Text><Text style={[styles.modalText, { color: glass.textSecondary }]}>{selectedFeature?.detail}</Text></ScrollView></View></View>
      </Modal>
    </View>
  );
};

const font = 'Montserrat_400Regular';
const semibold = 'Montserrat_600SemiBold';
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, counter: { fontSize: 13, fontFamily: font }, skip: { fontFamily: semibold, fontSize: 15 }, pager: { flex: 1 }, pages: { alignItems: 'stretch' }, page: { flex: 1 }, pageScroll: { flex: 1 }, content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }, iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, meta: { fontFamily: font, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 18, maxWidth: 340 }, title: { fontFamily: semibold, fontSize: 24, lineHeight: 30, textAlign: 'center', marginBottom: 14 }, text: { fontFamily: font, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 360 }, actions: { width: '100%', marginTop: 22, gap: 8 }, status: { fontFamily: font, textAlign: 'center', fontSize: 12, marginTop: 3 }, permissionButton: { minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, permissionText: { fontFamily: semibold }, featureGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 20 }, featureCard: { minHeight: 82, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center', justifyContent: 'center' }, featureTitle: { fontFamily: semibold, fontSize: 12, textAlign: 'center', marginTop: 5 }, featureHint: { fontFamily: font, fontSize: 10, marginTop: 3 }, error: { fontFamily: font, color: '#DC2626', textAlign: 'center', marginBottom: 12 }, footer: {}, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 12 }, dot: { width: 8, height: 8, borderRadius: 4 }, navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { padding: 14 }, backText: { fontFamily: font, fontSize: 15 }, next: { minWidth: 120, alignItems: 'center', borderRadius: 14, paddingVertical: 14 }, nextText: { fontFamily: semibold, color: '#fff', fontSize: 15 }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }, modalCard: { maxHeight: '75%', borderRadius: 22, overflow: 'hidden' }, closeButton: { position: 'absolute', zIndex: 1, right: 12, top: 12, padding: 8 }, modalContent: { padding: 30, paddingTop: 42, alignItems: 'center' }, modalTitle: { fontFamily: semibold, fontSize: 22, textAlign: 'center', marginTop: 14, marginBottom: 12 }, modalText: { fontFamily: font, fontSize: 16, lineHeight: 25, textAlign: 'center' },
});

export default OnboardingScreen;

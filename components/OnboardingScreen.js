import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, AppState, BackHandler, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingNavigation from './OnboardingNavigation';
import { ACCENT_COLORS, APP_DEVELOPERS, APP_SUPPORTERS, APP_VERSION, BUILD_DATE, BUILD_VER, LIQUID_GLASS } from '../utils/constants';
import notificationService from '../utils/notificationService';
import { CALENDAR_UNAVAILABLE_MESSAGE, getCalendarPermission, requestCalendarPermission } from '../utils/calendarAccess';
import { getGalleryPermission, requestGalleryPermission } from '../utils/galleryExport';
import { completeOnboarding } from '../utils/onboarding';
import { animateOnboardingPage } from '../utils/onboardingPager';

const PRIVACY_URL = 'https://myiti.pro100byte.ru/privacy-policy';
const pages = [
  { icon: 'school-outline', title: 'Добро пожаловать в Мой ИТИ ХГУ', text: 'Расписание, новости и полезные сервисы института — в одном приложении.' },
  { icon: 'sparkles-outline', title: 'Всё нужное для учёбы', text: 'Расписание студентов и преподавателей, новости с кэшированием, карта корпусов и «Студгородок» — в одном месте.' },
  { icon: 'options-outline', title: 'Настройте доступ по желанию', text: 'Разрешения нужны только для соответствующих функций. Их можно не включать сейчас и изменить позже.', permission: true },
  { icon: 'share-outline', title: 'Сохраняйте и делитесь', text: 'Экспортируйте занятия в календарь, сохраняйте изображения расписания в галерею и делитесь ими через системное меню.', features: true },
  { icon: 'checkmark-circle-outline', title: 'Всё готово', text: 'Приятного использования Мой ИТИ ХГУ! Вы всегда сможете изменить разрешения и настройки позже.', success: true },
];
const featureDetails = [
  { icon: 'calendar-outline', title: 'Расписание', points: ['Студенты и преподаватели', 'Экспорт в системный календарь', 'Обновление из сети'], tip: 'Доступ к календарю нужен только для экспорта занятий.' },
  { icon: 'newspaper-outline', title: 'Новости офлайн', points: ['Последние загруженные новости', 'Чтение без подключения', 'Новые материалы требуют сети'], tip: 'Откройте новости онлайн, чтобы обновить кэш.' },
  { icon: 'map-outline', title: 'Карта корпусов', points: ['Корпуса и ориентиры института', 'Поиск нужного места', 'Карты и маршруты могут требовать сеть'], tip: 'Сохранённые данные не заменяют навигацию в реальном времени.' },
  { icon: 'school-outline', title: 'Студгородок', points: ['Полезная информация студенту', 'Сервисы и контакты в одном разделе', 'Содержимое обновляется'], tip: 'Проверьте раздел после обновления приложения.' },
  { icon: 'notifications-outline', title: 'Уведомления', points: ['Новости и напоминания', 'Только после вашего согласия', 'Настройки можно изменить позже'], tip: 'Системное разрешение и настройки приложения независимы.' },
  { icon: 'color-palette-outline', title: 'Темы оформления', points: ['Светлая и тёмная тема', 'Акцентные цвета', 'Настройка в приложении'], tip: 'Выбранная тема применяется ко всем основным экранам.' },
];
const statusText = status => ({ granted: 'Доступ разрешён', denied: 'Доступ не разрешён', unavailable: 'Недоступно в этой сборке', undetermined: 'Доступ ещё не запрашивался' }[status] || 'Статус неизвестен');

const OnboardingScreen = ({ visible = true, onComplete, theme = 'light', accentColor = 'green' }) => {
  const insets = useSafeAreaInsets();
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const [pagerWidth, setPagerWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [notificationConfigured, setNotificationConfigured] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState('undetermined');
  const [galleryStatus, setGalleryStatus] = useState('undetermined');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [introFade, setIntroFade] = useState(true);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [introStarted, setIntroStarted] = useState(false);
  const motionStarted = useRef(false);
  const confettiShown = useRef(false);
  const mounted = useRef(false);
  const busyRef = useRef(false);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const introOpacity = useRef(new Animated.Value(0)).current;
  const pagerOffset = useRef(new Animated.Value(0)).current;
  const pagerAnimationCancel = useRef(null);
  const width = Math.max(1, pagerWidth);
  const isLast = page === pages.length - 1;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) { setReduceMotion(value); setMotionReady(true); } }).catch(() => { if (active) setMotionReady(true); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; sub?.remove?.(); };
  }, []);
  useEffect(() => {
    if (!visible || !motionReady || motionStarted.current) return undefined;
    motionStarted.current = true;
    if (reduceMotion) { setIntroStarted(true); setIntroFade(false); return undefined; }
    introOpacity.setValue(0);
    Animated.timing(introOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start(({ finished }) => {
      if (finished && mounted.current) setIntroStarted(true);
    });
    return undefined;
  }, [introOpacity, motionReady, reduceMotion, visible]);
  useEffect(() => {
    if (introStarted) setIntroFade(false);
  }, [introStarted]);
  useEffect(() => {
    if (!visible || !isLast || reduceMotion || confettiShown.current) return undefined;
    confettiShown.current = true;
    setConfettiVisible(true);
    const timer = setTimeout(() => setConfettiVisible(false), 2600);
    return () => clearTimeout(timer);
  }, [isLast, reduceMotion, visible]);
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([notificationService.hasPermission(), notificationService.getNotificationSettings(), getCalendarPermission(), getGalleryPermission()]);
    if (!mounted.current) return;
    const values = results.map(result => result.status === 'fulfilled' ? result.value : null);
    setNotificationGranted(values[0] === true);
    setNotificationConfigured(Boolean(values[1]?.enabled && values[1]?.news && values[1]?.schedule));
    if (values[2]?.status) setCalendarStatus(values[2].status);
    if (values[3]?.status) setGalleryStatus(values[3].status);
  }, []);
  useEffect(() => {
    mounted.current = visible;
    if (!visible) return () => { mounted.current = false; };
    refresh();
    const sub = AppState.addEventListener('change', state => { if (state === 'active' && mounted.current) refresh(); });
    return () => { mounted.current = false; sub.remove(); };
  }, [refresh, visible]);
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!selectedFeature && !privacyVisible) return false;
      setSelectedFeature(null); setPrivacyVisible(false); return true;
    });
    return () => sub.remove();
  }, [privacyVisible, selectedFeature, visible]);
  const exclusive = async operation => { if (busyRef.current) return; busyRef.current = true; setBusy(true); try { await operation(); } finally { busyRef.current = false; if (mounted.current) setBusy(false); } };
  const finish = () => exclusive(async () => { setError(null); try { await completeOnboarding(AsyncStorage); if (mounted.current) onComplete?.(); } catch (e) { if (mounted.current) setError('Не удалось сохранить завершение знакомства. Попробуйте ещё раз.'); } });
  const requestNotifications = () => exclusive(async () => { try { const granted = await notificationService.requestPermissions(); if (!granted) { Alert.alert('Уведомления отключены', 'Разрешите уведомления в настройках устройства.'); return; } const settings = await notificationService.saveNotificationSettings({ enabled: true, news: true, schedule: true }); if (mounted.current) { setNotificationGranted(true); setNotificationConfigured(Boolean(settings?.enabled && settings?.news && settings?.schedule)); } } catch (e) { Alert.alert('Не удалось включить уведомления', 'Попробуйте ещё раз.'); } });
  const requestCalendar = () => exclusive(async () => { try { const result = await requestCalendarPermission(); if (mounted.current) setCalendarStatus(result?.status || 'denied'); if (result?.status === 'unavailable') Alert.alert('Календарь недоступен', CALENDAR_UNAVAILABLE_MESSAGE); else if (result?.status !== 'granted') Alert.alert('Доступ не выдан', 'Разрешите доступ к календарю в настройках устройства.'); } catch (e) { Alert.alert('Не удалось проверить календарь', 'Попробуйте ещё раз.'); } });
  const requestGallery = () => exclusive(async () => { try { const result = await requestGalleryPermission(); if (mounted.current) setGalleryStatus(result?.status || 'denied'); if (result?.status === 'unavailable') Alert.alert('Галерея недоступна', 'Сохранение появится после установки новой нативной сборки.'); else if (result?.status !== 'granted') Alert.alert('Доступ не выдан', 'Разрешение нужно только для сохранения изображения расписания.'); } catch (e) { Alert.alert('Не удалось проверить галерею', 'Попробуйте ещё раз.'); } });
  const goTo = index => {
    const next = Math.max(0, Math.min(pages.length - 1, index));
    setPage(next);
    pagerAnimationCancel.current?.();
    pagerOffset.setValue(page * width);
    pagerAnimationCancel.current = animateOnboardingPage({ Animated, value: pagerOffset, scrollRef, target: next * width, reduceMotion, onComplete: () => { pagerAnimationCancel.current = null; } });
  };
  const notificationLabel = useMemo(() => notificationGranted ? (notificationConfigured ? 'Уведомления разрешены и настроены' : 'Разрешения уведомлений выданы') : 'Уведомления не разрешены', [notificationConfigured, notificationGranted]);
  if (!visible) return null;
  const version = Constants.expoConfig?.version || APP_VERSION;
  const openPrivacy = () => Linking.openURL(PRIVACY_URL).catch(() => Alert.alert('Не удалось открыть страницу', 'Проверьте подключение к интернету.'));
  return <View style={[styles.container, { backgroundColor: glass.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
    <View style={styles.topRow}><Text style={[styles.counter, { color: glass.textSecondary }]}>{page + 1} из {pages.length}</Text><Pressable accessibilityRole="button" accessibilityLabel="Пропустить знакомство" onPress={finish} disabled={busy || !introStarted}><Text style={[styles.skip, { color: colors.primary }]}>Пропустить</Text></Pressable></View>
    <Animated.ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16} style={styles.pager} contentContainerStyle={styles.pages} onLayout={e => setPagerWidth(e.nativeEvent.layout.width)} onMomentumScrollEnd={e => setPage(Math.max(0, Math.min(pages.length - 1, Math.round(e.nativeEvent.contentOffset.x / width))))} onScroll={e => { scrollX.setValue(e.nativeEvent.contentOffset.x); pagerOffset.setValue(e.nativeEvent.contentOffset.x); }} scrollEnabled={!introFade && introStarted}>
      {pagerWidth > 0 && pages.map((item, index) => { const range = [(index - 1) * width, index * width, (index + 1) * width]; return <Animated.View key={item.title} accessibilityElementsHidden={index !== page} style={[styles.page, { width, opacity: reduceMotion ? 1 : scrollX.interpolate({ inputRange: range, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' }), transform: [{ scale: reduceMotion ? 1 : scrollX.interpolate({ inputRange: range, outputRange: [0.96, 1, 0.96], extrapolate: 'clamp' }) }] }]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}><Icon name={item.icon} size={50} color="#fff" /></View><Text style={[styles.title, { color: glass.text }]}>{item.title}</Text><Text style={[styles.text, { color: glass.textSecondary }]}>{item.text}</Text>
        {index === 0 && <><Text style={[styles.meta, { color: glass.textTertiary }]}>Разработано {APP_DEVELOPERS}. При поддержке {APP_SUPPORTERS}.</Text><Text style={[styles.version, { color: glass.textTertiary }]}>Версия {version} • сборка {BUILD_VER} • {BUILD_DATE}</Text><Pressable accessibilityRole="button" onPress={openPrivacy}><Text style={[styles.privacy, { color: colors.primary }]}>Политика конфиденциальности</Text></Pressable></>}
        {item.permission && <View style={styles.actions}><Text style={[styles.status, { color: glass.textSecondary }]}>{notificationLabel}</Text><Pressable accessibilityRole="button" style={[styles.permissionButton, { borderColor: colors.primary }]} onPress={requestNotifications}><Icon name="notifications-outline" size={19} color={colors.primary} /><Text style={[styles.permissionText, { color: colors.primary }]}>Включить уведомления</Text></Pressable><Text style={[styles.status, { color: glass.textSecondary }]}>{statusText(calendarStatus)}</Text><Pressable accessibilityRole="button" style={[styles.permissionButton, { borderColor: colors.primary }]} onPress={requestCalendar}><Icon name="calendar-outline" size={19} color={colors.primary} /><Text style={[styles.permissionText, { color: colors.primary }]}>Разрешить календарь</Text></Pressable><Text style={[styles.status, { color: glass.textSecondary }]}>{statusText(galleryStatus)}</Text><Pressable accessibilityRole="button" style={[styles.permissionButton, { borderColor: colors.primary }]} onPress={requestGallery}><Icon name="images-outline" size={19} color={colors.primary} /><Text style={[styles.permissionText, { color: colors.primary }]}>Разрешить галерею</Text></Pressable></View>}
        {item.features && <View style={styles.featureGrid}>{featureDetails.map(feature => <Pressable accessibilityRole="button" accessibilityLabel={`Подробнее: ${feature.title}`} key={feature.title} onPress={() => setSelectedFeature(feature)} style={[styles.featureCard, { width: pagerWidth < 420 ? (pagerWidth - 9) / 2 : (pagerWidth - 18) / 3, backgroundColor: glass.surfaceCard, borderColor: glass.border }]}><Icon name={feature.icon} size={23} color={colors.primary} /><Text style={[styles.featureTitle, { color: glass.text }]}>{feature.title}</Text><Text style={[styles.featureHint, { color: glass.textTertiary }]}>Подробнее</Text></Pressable>)}</View>}
      </ScrollView></Animated.View>; })}
    </Animated.ScrollView>
    {error && <Text style={styles.error}>{error}</Text>}<View style={styles.footer}><View style={styles.dots}>{pages.map((item, index) => <View key={item.title} style={[styles.dot, { backgroundColor: index === page ? colors.primary : glass.textTertiary }]} />)}</View><OnboardingNavigation onBack={() => goTo(page - 1)} onNext={isLast ? finish : () => goTo(page + 1)} backDisabled={page === 0 || !introStarted} busy={busy || !introStarted} isLast={isLast} accent={colors.primary} textColor={glass.text} theme={theme} /></View>
    <Modal transparent visible={Boolean(selectedFeature)} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => setSelectedFeature(null)}><View style={styles.modalBackdrop}><Pressable style={styles.backdropPress} accessibilityLabel="Закрыть" onPress={() => setSelectedFeature(null)} /><View style={[styles.sheet, { backgroundColor: glass.background }]}><View style={styles.handle} /><Pressable accessibilityRole="button" accessibilityLabel="Закрыть подробности" onPress={() => setSelectedFeature(null)} style={styles.close}><Icon name="close" size={24} color={glass.text} /></Pressable><ScrollView contentContainerStyle={styles.modalContent}><View style={[styles.modalIcon, { backgroundColor: colors.primary }]}><Icon name={selectedFeature?.icon || 'information-circle-outline'} size={32} color="#fff" /></View><Text style={[styles.modalTitle, { color: glass.text }]}>{selectedFeature?.title}</Text>{selectedFeature?.points?.map(point => <View key={point} style={styles.point}><Icon name="checkmark-circle" size={19} color={colors.primary} /><Text style={[styles.pointText, { color: glass.textSecondary }]}>{point}</Text></View>)}<Text style={[styles.tip, { color: glass.textSecondary }]}>Совет: {selectedFeature?.tip}</Text></ScrollView></View></View></Modal>
    <Modal transparent visible={privacyVisible} animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => setPrivacyVisible(false)}><View style={styles.modalBackdrop}><Pressable style={styles.backdropPress} accessibilityLabel="Закрыть" onPress={() => setPrivacyVisible(false)} /><View style={[styles.sheet, { backgroundColor: glass.background }]}><View style={styles.handle} /><Pressable accessibilityRole="button" accessibilityLabel="Закрыть политику конфиденциальности" onPress={() => setPrivacyVisible(false)} style={styles.close}><Icon name="close" size={24} color={glass.text} /></Pressable><ScrollView contentContainerStyle={styles.privacyContent}><Text style={[styles.modalTitle, { color: glass.text }]}>Конфиденциальность</Text><Text style={[styles.notice, { color: glass.textSecondary }]}>Подробная политика конфиденциальности доступна на сайте.</Text><Pressable accessibilityRole="link" onPress={openPrivacy}><Text style={[styles.privacy, { color: colors.primary }]}>Открыть политику конфиденциальности</Text></Pressable></ScrollView></View></View></Modal>
    {confettiVisible && <ConfettiCannon count={70} origin={{ x: -10, y: 0 }} fadeOut colors={[colors.primary, '#F59E0B', '#3B82F6', '#EC4899']} autoStart />}
    {introFade && <Animated.View pointerEvents="none" style={[styles.fade, { opacity: reduceMotion ? 0 : Animated.subtract(1, introOpacity) }]} onLayout={() => { if (reduceMotion) { setIntroStarted(true); setIntroFade(false); } }} />}

  </View>;
};

const font = 'Montserrat_400Regular';
const semibold = 'Montserrat_600SemiBold';
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 }, topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, counter: { fontFamily: font, fontSize: 13 }, skip: { fontFamily: semibold, fontSize: 15 }, pager: { flex: 1 }, pages: { alignItems: 'stretch' }, page: { flex: 1 }, content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }, iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, title: { fontFamily: semibold, fontSize: 24, lineHeight: 30, textAlign: 'center', marginBottom: 14 }, text: { fontFamily: font, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 360 }, meta: { fontFamily: font, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 18 }, version: { fontFamily: font, fontSize: 11, marginTop: 10 }, privacy: { fontFamily: semibold, fontSize: 12, marginTop: 8 }, actions: { width: '100%', marginTop: 20, gap: 8 }, status: { fontFamily: font, textAlign: 'center', fontSize: 12 }, permissionButton: { minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, permissionText: { fontFamily: semibold }, featureGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 20 }, featureCard: { minHeight: 82, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center', justifyContent: 'center' }, featureTitle: { fontFamily: semibold, fontSize: 12, textAlign: 'center', marginTop: 5 }, featureHint: { fontFamily: font, fontSize: 10, marginTop: 3 }, error: { fontFamily: font, color: '#DC2626', textAlign: 'center', marginBottom: 12 }, footer: {}, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 12 }, dot: { width: 8, height: 8, borderRadius: 4 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }, backdropPress: { flex: 1 }, sheet: { maxHeight: '40%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }, handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: '#999', marginTop: 9 }, close: { position: 'absolute', right: 16, top: 14, padding: 8, zIndex: 1 }, modalContent: { padding: 24, paddingTop: 22, paddingBottom: 30 }, privacyContent: { padding: 24, paddingTop: 34, paddingBottom: 30 }, modalIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, modalTitle: { fontFamily: semibold, fontSize: 21, lineHeight: 27, marginBottom: 14 }, point: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 9 }, pointText: { flex: 1, fontFamily: font, fontSize: 14, lineHeight: 20 }, tip: { fontFamily: font, fontSize: 13, lineHeight: 19, marginTop: 8 }, notice: { fontFamily: font, fontSize: 14, lineHeight: 21 }, fade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000', zIndex: 10 }, fadeBlocker: { ...StyleSheet.absoluteFillObject, zIndex: 11 },
});
export default OnboardingScreen;

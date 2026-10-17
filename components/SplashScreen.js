import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ACCENT_COLORS, LIQUID_GLASS, APP_VERSION } from '../utils/constants';
import MatrixRain from './MatrixRain';
import SeasonalSplashEffects, { useSplashReduceMotion } from './SeasonalSplashEffects';
import { getSplashDecoration } from '../utils/splashSeason';

const { width, height } = Dimensions.get('window');

const HOLIDAY_COLORS = {
  'new-year': { dark: ['#FFD700', ['#FFD700', '#FF5722', '#2196F3']], light: ['#D32F2F', ['#FFD700', '#FF5722', '#2196F3']] },
  'student-day': { dark: ['#64B5F6', ['#1565C0', '#FFD700', '#1565C0']], light: ['#1565C0', ['#1565C0', '#FFD700', '#1565C0']] },
  'valentines-day': { dark: ['#F48FB1', ['#E91E63', '#FF5252', '#E91E63']], light: ['#C62828', ['#E91E63', '#FF5252', '#E91E63']] },
  'defender-day': { dark: ['#81C784', ['#2E7D32', '#FF8F00', '#2E7D32']], light: ['#2E7D32', ['#2E7D32', '#FF8F00', '#2E7D32']] },
  'womens-day': { dark: ['#F48FB1', ['#E91E63', '#FF80AB', '#E91E63']], light: ['#AD1457', ['#E91E63', '#FF80AB', '#E91E63']] },
  'cosmonautics-day': { dark: ['#90CAF9', ['#1A237E', '#FFD700', '#1A237E']], light: ['#1A237E', ['#1A237E', '#FFD700', '#1A237E']] },
  'may-day': { dark: ['#A5D6A7', ['#FFD700', '#2E7D32', '#FFD700']], light: ['#2E7D32', ['#FFD700', '#2E7D32', '#FFD700']] },
  'victory-day': { dark: ['#FFCC80', ['#FF6F00', '#212121', '#FF6F00']], light: ['#BF360C', ['#FF6F00', '#212121', '#FF6F00']] },
  'children-day': { dark: ['#FFF176', ['#FF5722', '#4CAF50', '#2196F3']], light: ['#F57F17', ['#FF5722', '#4CAF50', '#2196F3']] },
  'knowledge-day': { dark: ['#90CAF9', ['#FF6F00', '#1565C0', '#FF6F00']], light: ['#1565C0', ['#FF6F00', '#1565C0', '#FF6F00']] },
  'september-3': { dark: ['#FFCC80', ['#FF8F00', '#D84315', '#FF8F00']], light: ['#BF360C', ['#FF8F00', '#D84315', '#FF8F00']] },
  'programmer-day': { dark: ['#A5D6A7', ['#4CAF50', '#00E676', '#4CAF50']], light: ['#1B5E20', ['#4CAF50', '#00E676', '#4CAF50']] },
  'sysadmin-day': { dark: ['#90CAF9', ['#0D47A1', '#2196F3', '#0D47A1']], light: ['#0D47A1', ['#0D47A1', '#2196F3', '#0D47A1']] },
  'teacher-day': { dark: ['#FFF176', ['#FF6F00', '#FFD700', '#FF6F00']], light: ['#E65100', ['#FF6F00', '#FFD700', '#FF6F00']] },
  'unity-day': { dark: ['#EF9A9A', ['#FFFFFF', '#1565C0', '#D32F2F']], light: ['#B71C1C', ['#FFFFFF', '#1565C0', '#D32F2F']] },
  'intl-student-day': { dark: ['#90CAF9', ['#1565C0', '#FFD700', '#1565C0']], light: ['#1565C0', ['#1565C0', '#FFD700', '#1565C0']] },
};

const HOLIDAY_ICONS = {
  'new-year': ['sparkles', 'sparkles', 'sparkles'], 'student-day': ['school', 'star', 'school'],
  'valentines-day': ['heart', 'heart', 'heart'], 'defender-day': ['shield', 'star', 'shield'],
  'womens-day': ['flower', 'heart', 'flower'], 'cosmonautics-day': ['rocket', 'star', 'planet'],
  'may-day': ['sunny', 'flower', 'sunny'], 'victory-day': ['star', 'ribbon', 'star'],
  'children-day': ['balloon', 'happy', 'balloon'], 'knowledge-day': ['book', 'pencil', 'book'],
  'september-3': ['musical-notes', 'calendar', 'musical-notes'],
  'programmer-day': ['code-slash', 'terminal', 'code-slash'], 'sysadmin-day': ['server', 'construct', 'server'],
  'teacher-day': ['easel', 'book', 'easel'], 'unity-day': ['people', 'flag', 'people'],
  'intl-student-day': ['earth', 'school', 'earth'],
};

const GlassSurface = ({ children, style, glass }) => {
  let supportsGlass = false;
  try {
    supportsGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    supportsGlass = false;
  }
  if (supportsGlass) {
    return <GlassView glassEffectStyle="regular" colorScheme={glass?.isSpecialTheme ? 'dark' : 'auto'} style={[style, { backgroundColor: 'transparent' }]}>{children}</GlassView>;
  }
  return <View style={[style, { backgroundColor: glass?.surfaceSecondary || 'rgba(255,255,255,0.08)' }]}>{children}</View>;
};

const SplashScreen = ({ accentColor, theme, holidayInfo, legendUnlocked = false }) => {
  const reduceMotion = useSplashReduceMotion();
  const decoration = useMemo(() => getSplashDecoration({ holidayInfo, theme, legendUnlocked }), [holidayInfo, theme, legendUnlocked]);
  const safeAccentColor = accentColor || 'green';
  const colors = ACCENT_COLORS[safeAccentColor] || ACCENT_COLORS.green;
  const safeColors = colors || { primary: '#10b981', light: '#d1fae5' };
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const isMatrix = theme === 'matrix';
  const isLegendSplash = legendUnlocked;
  const primary = isLegendSplash ? '#FFD666' : safeColors.primary;
  const backgroundColor = isLegendSplash ? '#140E05' : (isMatrix ? (glass.backgroundSolid || '#0D0208') : glass.background);
  const textColor = isLegendSplash ? '#F6E7C1' : ((theme === 'dark' || isMatrix) ? '#fff' : '#1c1c1e');
  const subtextColor = isLegendSplash ? 'rgba(255,214,102,0.72)' : ((theme === 'dark' || isMatrix) ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)');
  const holidayTheme = theme === 'light' ? 'light' : 'dark';
  const holidayEntry = HOLIDAY_COLORS[holidayInfo?.type]?.[holidayTheme];
  const holiday = holidayEntry ? { text: holidayEntry[0], icons: holidayEntry[1] } : { text: theme === 'light' ? '#D32F2F' : '#FFD700', icons: ['#FFD700', '#FF5722', '#2196F3'] };
  const holidayIcons = HOLIDAY_ICONS[holidayInfo?.type] || ['sparkles', 'star', 'sparkles'];

  const blobAnims = useRef(Array.from({ length: 6 }, () => ({ x: new Animated.Value(0), y: new Animated.Value(0), scale: new Animated.Value(0) }))).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion !== false) {
      reveal.setValue(1);
      orbit.setValue(0);
      blobAnims.forEach(blob => { blob.scale.setValue(1); blob.x.setValue(0); blob.y.setValue(0); });
      return undefined;
    }
    const animations = [];
    const start = animation => { animations.push(animation); animation.start(); };
    blobAnims.forEach((blob, index) => {
      start(Animated.timing(blob.scale, { toValue: 1, duration: 500 + index * 80, useNativeDriver: true, isInteraction: false }));
      start(Animated.loop(Animated.sequence([
        Animated.timing(blob.y, { toValue: index % 2 ? 18 : -18, duration: 3200 + index * 240, useNativeDriver: true, isInteraction: false }),
        Animated.timing(blob.y, { toValue: index % 2 ? -18 : 18, duration: 3200 + index * 240, useNativeDriver: true, isInteraction: false }),
      ])));
    });
    start(Animated.timing(reveal, { toValue: 1, duration: 650, useNativeDriver: true, isInteraction: false }));
    start(Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 18000, useNativeDriver: true, isInteraction: false })));
    return () => animations.forEach(animation => animation.stop());
  }, [reduceMotion]);

  const blobs = [
    { x: width * .08, y: height * .14, size: 170 }, { x: width * .9, y: height * .1, size: 210 },
    { x: width * .92, y: height * .7, size: 140 }, { x: width * .05, y: height * .75, size: 190 },
    { x: width * .72, y: height * .9, size: 180 }, { x: width * .25, y: height * .04, size: 100 },
  ];
  const orbitRotate = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={backgroundColor} />
      {isMatrix && reduceMotion === false ? <MatrixRain intensity={0.85} /> : blobs.map((blob, index) => (
        <Animated.View key={`blob-${index}`} style={[styles.blob, { left: blob.x - blob.size / 2, top: blob.y - blob.size / 2, width: blob.size, height: blob.size, borderRadius: blob.size / 2, backgroundColor: primary, opacity: isLegendSplash ? .08 : .065, transform: [{ translateX: blobAnims[index].x }, { translateY: blobAnims[index].y }, { scale: blobAnims[index].scale }] }]} />
      ))}
      <SeasonalSplashEffects decoration={decoration} reduceMotion={reduceMotion} />

      <View style={styles.contentContainer}>
        {holidayInfo && <Animated.View style={[styles.holiday, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Text style={[styles.holidayText, { color: holiday.text }]}>{holidayInfo.text}</Text>
          <View style={styles.holidayIcons}>{holidayIcons.map((name, index) => <Icon key={index} name={name} size={index === 1 ? 14 : 17} color={holiday.icons[index]} style={styles.holidayIcon} />)}</View>
        </Animated.View>}

        <Animated.View style={[styles.observatory, { opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [.86, 1] }) }] }]}>
          <Animated.View style={[styles.orbit, styles.orbitWide, { borderColor: `${primary}30`, transform: [{ rotate: orbitRotate }] }]}>
            <View style={[styles.orbitNode, { backgroundColor: primary }]} />
          </Animated.View>
          <View style={[styles.orbit, styles.orbitTight, { borderColor: `${primary}22` }]} />
          <GlassSurface glass={glass} style={[styles.badge, { borderColor: `${primary}55`, shadowColor: primary }]}>
            <View style={[styles.badgeMark, { backgroundColor: `${primary}18`, borderColor: `${primary}45` }]}>
              <Icon name={isLegendSplash ? 'trophy' : 'school'} size={45} color={isLegendSplash ? '#FFD666' : (theme === 'dark' || isMatrix ? safeColors.light : primary)} />
            </View>
            <Text style={[styles.badgeCode, { color: primary }]}>ITI · KHSU</Text>
          </GlassSurface>
        </Animated.View>

        <Animated.View style={[styles.copy, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          <Text style={[styles.eyebrow, { color: primary }]}>SIGNAL / 2026</Text>
          <Text style={[styles.title, { color: textColor }]}>Мой ИТИ ХГУ</Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>{isLegendSplash ? 'Легенда ИТИ ХГУ' : 'Твой университет в кармане'}</Text>
          {isLegendSplash && <Text style={[styles.legend, { color: '#FFD666' }]}>ВСЕ ДОСТИЖЕНИЯ СОБРАНЫ</Text>}
        </Animated.View>

        <Animated.View style={[styles.statusGlass, { opacity: reveal }]}>
          <View style={[styles.statusDot, { backgroundColor: primary }]} />
          <Text style={[styles.statusLabel, { color: subtextColor }]}>СИНХРОНИЗАЦИЯ ДАННЫХ</Text>
          <ActivityIndicator size="small" color={primary} />
        </Animated.View>
      </View>

      <Text style={[styles.version, { color: subtextColor }]}>v{APP_VERSION}  ·  ACADEMIC SIGNAL</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  blob: { position: 'absolute' },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 2, paddingHorizontal: 24 },
  holiday: { alignItems: 'center', marginBottom: 18 },
  holidayText: { fontSize: 20, fontWeight: '700', fontFamily: 'Montserrat_700Bold', textAlign: 'center' },
  holidayIcons: { flexDirection: 'row', marginTop: 7 },
  holidayIcon: { marginHorizontal: 4 },
  observatory: { width: 218, height: 218, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', borderWidth: 1, borderRadius: 200 },
  orbitWide: { width: 210, height: 126, transform: [{ rotate: '-24deg' }] },
  orbitTight: { width: 178, height: 178 },
  orbitNode: { position: 'absolute', width: 7, height: 7, borderRadius: 5, right: 19, top: 9 },
  badge: { width: 134, height: 158, borderRadius: 34, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: .22, shadowRadius: 24, elevation: 8 },
  badgeMark: { width: 78, height: 78, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badgeCode: { marginTop: 13, fontSize: 10, letterSpacing: 1.8, fontFamily: 'Montserrat_700Bold' },
  copy: { alignItems: 'center', marginTop: 10 },
  eyebrow: { fontSize: 10, letterSpacing: 2.4, fontFamily: 'Montserrat_700Bold', marginBottom: 7 },
  title: { fontSize: 31, fontWeight: '700', letterSpacing: .2, textAlign: 'center', fontFamily: 'Montserrat_700Bold' },
  subtitle: { fontSize: 14, letterSpacing: .3, textAlign: 'center', marginTop: 7, fontFamily: 'Montserrat_500Medium' },
  legend: { fontSize: 11, letterSpacing: 1.2, marginTop: 11, fontFamily: 'Montserrat_600SemiBold' },
  statusGlass: { flexDirection: 'row', alignItems: 'center', marginTop: 31, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,.16)', backgroundColor: 'rgba(255,255,255,.06)', gap: 9 },
  statusDot: { width: 6, height: 6, borderRadius: 4 },
  statusLabel: { fontSize: 9, letterSpacing: 1.1, fontFamily: 'Montserrat_600SemiBold' },
  version: { position: 'absolute', bottom: 40, alignSelf: 'center', fontSize: 11, letterSpacing: .8, fontFamily: 'Montserrat_400Regular' },
});

export default SplashScreen;

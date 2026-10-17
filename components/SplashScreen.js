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
  const reveal = useRef(new Animated.Value(0)).current;
  const sheetDrift = useRef(new Animated.Value(0)).current;
  const ribbonReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion !== false) {
      reveal.setValue(1);
      sheetDrift.setValue(0);
      ribbonReveal.setValue(1);
      return undefined;
    }
    const animations = [
      Animated.timing(reveal, { toValue: 1, duration: 650, useNativeDriver: true, isInteraction: false }),
      Animated.timing(ribbonReveal, { toValue: 1, duration: 520, delay: 180, useNativeDriver: true, isInteraction: false }),
      Animated.loop(Animated.sequence([
        Animated.timing(sheetDrift, { toValue: 1, duration: 5200, useNativeDriver: true, isInteraction: false }),
        Animated.timing(sheetDrift, { toValue: 0, duration: 5200, useNativeDriver: true, isInteraction: false }),
      ])),
    ];
    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [reduceMotion]);

  const drift = sheetDrift.interpolate({ inputRange: [0, 1], outputRange: [0, 7] });
  const sheetTranslate = reveal.interpolate({ inputRange: [0, 1], outputRange: [34, 0] });
  const ribbonTranslate = ribbonReveal.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={backgroundColor} />
      {isMatrix && reduceMotion === false ? <MatrixRain intensity={0.85} /> : <>
        <Animated.View style={[styles.paperStrip, { backgroundColor: primary, opacity: isLegendSplash ? .08 : .07, transform: [{ translateX: drift }, { rotate: '-14deg' }] }]} />
        <Animated.View style={[styles.paperStrip, styles.paperStripSecond, { backgroundColor: primary, opacity: isLegendSplash ? .06 : .05, transform: [{ translateX: drift }, { rotate: '18deg' }] }]} />
      </>}
      <SeasonalSplashEffects decoration={decoration} reduceMotion={reduceMotion} />

      <View style={styles.contentContainer}>
        <Animated.View style={[styles.sheet, { opacity: reveal, transform: [{ translateX: sheetTranslate }, { translateY: drift }, { rotate: '-2deg' }] }]}>
          <GlassSurface glass={glass} style={[styles.sheetSurface, { borderColor: `${primary}55`, shadowColor: primary }]}>
            <View style={[styles.sheetRule, { backgroundColor: primary }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetKicker, { color: primary }]}>ИТИ · ХГУ</Text>
              <Text style={[styles.sheetIndex, { color: subtextColor }]}>01 / 01</Text>
            </View>
            <View style={[styles.foldMark, { borderBottomColor: primary }]} />
            <Text style={[styles.title, { color: textColor }]}>Мой ИТИ ХГУ</Text>
            <Text style={[styles.subtitle, { color: subtextColor }]}>{isLegendSplash ? 'Легенда ИТИ ХГУ' : 'Твой университет в кармане'}</Text>
            <View style={styles.notes}>
              <View style={[styles.noteLine, { backgroundColor: `${primary}45`, width: '82%' }]} />
              <View style={[styles.noteLine, { backgroundColor: `${primary}30`, width: '61%' }]} />
              <View style={[styles.noteLine, { backgroundColor: `${primary}24`, width: '72%' }]} />
            </View>
            {isLegendSplash && <Text style={[styles.legend, { color: '#FFD666' }]}>ВСЕ ДОСТИЖЕНИЯ СОБРАНЫ</Text>}
            {holidayInfo && <View style={styles.holidayRow}>
              <Text style={[styles.holidayText, { color: holiday.text }]}>{holidayInfo.text}</Text>
              <View style={styles.holidayIcons}>{holidayIcons.map((name, index) => <Icon key={index} name={name} size={index === 1 ? 13 : 16} color={holiday.icons[index]} style={styles.holidayIcon} />)}</View>
            </View>}
          </GlassSurface>
        </Animated.View>

        <Animated.View style={[styles.ribbon, { opacity: ribbonReveal, transform: [{ translateX: ribbonTranslate }, { rotate: '4deg' }] }]}>
          <View style={[styles.ribbonMark, { backgroundColor: primary }]} />
          <Text style={[styles.ribbonLabel, { color: textColor }]}>ОТКРЫВАЕМ ПРИЛОЖЕНИЕ</Text>
          <ActivityIndicator size="small" color={primary} />
        </Animated.View>
      </View>

      <Text style={[styles.version, { color: subtextColor }]}>v{APP_VERSION}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  paperStrip: { position: 'absolute', width: width * 1.5, height: 92, left: -width * .25, top: height * .17 },
  paperStripSecond: { top: height * .72, height: 64 },
  contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25, zIndex: 2 },
  sheet: { width: Math.min(width - 48, 344), minHeight: 350, shadowOpacity: .2, shadowRadius: 26, elevation: 9 },
  sheetSurface: { minHeight: 350, borderWidth: 1, borderRadius: 10, padding: 25, overflow: 'hidden' },
  sheetRule: { width: 38, height: 4, borderRadius: 2, marginBottom: 30 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 42 },
  sheetKicker: { fontSize: 11, letterSpacing: 2, fontFamily: 'Montserrat_700Bold' },
  sheetIndex: { fontSize: 10, letterSpacing: 1.1, fontFamily: 'Montserrat_500Medium' },
  foldMark: { position: 'absolute', right: 0, top: 0, width: 0, height: 0, borderStyle: 'solid', borderRightWidth: 42, borderBottomWidth: 42, borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent', borderTopColor: 'transparent' },
  title: { fontSize: 31, lineHeight: 37, fontWeight: '700', letterSpacing: .1, fontFamily: 'Montserrat_700Bold' },
  subtitle: { fontSize: 14, letterSpacing: .3, marginTop: 10, fontFamily: 'Montserrat_500Medium' },
  notes: { marginTop: 42, gap: 10 },
  noteLine: { height: 2, borderRadius: 2 },
  legend: { fontSize: 10, letterSpacing: 1.1, marginTop: 20, fontFamily: 'Montserrat_600SemiBold' },
  holidayRow: { marginTop: 29, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(127,127,127,.22)', paddingTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  holidayText: { fontSize: 14, fontWeight: '700', flex: 1, fontFamily: 'Montserrat_700Bold' },
  holidayIcons: { flexDirection: 'row' },
  holidayIcon: { marginLeft: 6 },
  ribbon: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: -28, marginRight: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 4, backgroundColor: 'rgba(127,127,127,.13)', gap: 9 },
  ribbonMark: { width: 7, height: 7, borderRadius: 1 },
  ribbonLabel: { fontSize: 9, letterSpacing: 1, fontFamily: 'Montserrat_600SemiBold' },
  version: { position: 'absolute', bottom: 40, left: 25, fontSize: 11, letterSpacing: .8, fontFamily: 'Montserrat_400Regular' },
});

export default SplashScreen;

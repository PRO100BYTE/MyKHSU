import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, APP_VERSION, BUILD_VER, LIQUID_GLASS } from '../utils/constants';
import MatrixRain from './MatrixRain';
import SeasonalSplashEffects, { useSplashReduceMotion } from './SeasonalSplashEffects';
import { getSplashDecoration, getSplashGreeting } from '../utils/splashSeason';

const { width, height } = Dimensions.get('window');
const LOGO = require('../assets/icon.png');
const CURRENT_YEAR = new Date().getFullYear();

const HOLIDAY_COLORS = {
  'new-year': { dark: '#FFD166', light: '#C62828' }, 'student-day': { dark: '#64B5F6', light: '#1565C0' },
  'valentines-day': { dark: '#F48FB1', light: '#C62828' }, 'defender-day': { dark: '#81C784', light: '#2E7D32' },
  'womens-day': { dark: '#F48FB1', light: '#AD1457' }, 'cosmonautics-day': { dark: '#90CAF9', light: '#1A237E' },
  'may-day': { dark: '#A5D6A7', light: '#2E7D32' }, 'victory-day': { dark: '#FFCC80', light: '#BF360C' },
  'children-day': { dark: '#FFF176', light: '#F57F17' }, 'russia-day': { dark: '#FFFFFF', light: '#1565C0' }, 'knowledge-day': { dark: '#90CAF9', light: '#1565C0' },
  'september-3': { dark: '#FFCC80', light: '#BF360C' }, 'programmer-day': { dark: '#A5D6A7', light: '#1B5E20' },
  'sysadmin-day': { dark: '#90CAF9', light: '#0D47A1' }, 'teacher-day': { dark: '#FFF176', light: '#E65100' },
  'unity-day': { dark: '#EF9A9A', light: '#B71C1C' }, 'intl-student-day': { dark: '#90CAF9', light: '#1565C0' },
};

const HOLIDAY_ICONS = {
  'new-year': ['sparkles', 'snow', 'star'], 'student-day': ['school', 'star', 'school'], 'valentines-day': ['heart', 'heart', 'heart'],
  'defender-day': ['shield', 'star', 'shield'], 'womens-day': ['flower', 'heart', 'flower'], 'cosmonautics-day': ['rocket', 'star', 'planet'],
  'may-day': ['sunny', 'flower', 'sunny'], 'victory-day': ['star', 'ribbon', 'star'], 'children-day': ['balloon', 'happy', 'balloon'],
  'knowledge-day': ['book', 'pencil', 'book'], 'russia-day': ['flag', 'star', 'flag'], 'september-3': ['musical-notes', 'calendar', 'musical-notes'],
  'programmer-day': ['code-slash', 'terminal', 'code-slash'], 'sysadmin-day': ['server', 'construct', 'server'],
  'teacher-day': ['easel', 'book', 'easel'], 'unity-day': ['people', 'flag', 'people'], 'intl-student-day': ['earth', 'school', 'earth'],
};

const SplashScreen = ({ accentColor, theme, holidayInfo, legendUnlocked = false, splashDate }) => {
  const reduceMotion = useSplashReduceMotion();
  const decoration = useMemo(() => getSplashDecoration({ date: splashDate, holidayInfo, theme, legendUnlocked }), [splashDate, holidayInfo, theme, legendUnlocked]);
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const isMatrix = theme === 'matrix';
  const isLegendSplash = legendUnlocked;
  const primary = isLegendSplash ? '#FFD666' : colors.primary;
  const backgroundColor = isLegendSplash ? '#120D06' : (isMatrix ? (glass.backgroundSolid || '#050C08') : glass.background);
  const textColor = isLegendSplash ? '#F6E7C1' : ((theme === 'dark' || isMatrix) ? '#fff' : '#15231B');
  const subtextColor = isLegendSplash ? 'rgba(255,214,102,0.72)' : ((theme === 'dark' || isMatrix) ? 'rgba(255,255,255,0.58)' : 'rgba(21,35,27,0.58)');
  const holidayColor = HOLIDAY_COLORS[holidayInfo?.type]?.[theme === 'light' ? 'light' : 'dark'] || primary;
  const holidayIcons = HOLIDAY_ICONS[holidayInfo?.type] || ['sparkles', 'star', 'sparkles'];
  const holidayGreeting = useMemo(() => getSplashGreeting(holidayInfo), [holidayInfo]);
  const screenFade = useRef(new Animated.Value(0)).current;
  const intro = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const greeting = useRef(new Animated.Value(0)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion !== false) {
      screenFade.setValue(1);
      intro.setValue(1);
      pulse.setValue(0);
      greeting.setValue(1);
      iconFloat.setValue(0);
      return undefined;
    }
    screenFade.setValue(0);
    greeting.setValue(0);
    iconFloat.setValue(0);
    const screenFadeAnimation = Animated.timing(screenFade, { toValue: 1, duration: 550, useNativeDriver: true, isInteraction: false });
    const introAnimation = Animated.spring(intro, { toValue: 1, friction: 8, tension: 45, useNativeDriver: true, isInteraction: false });
    const greetingAnimation = Animated.sequence([
      Animated.delay(180),
      Animated.spring(greeting, { toValue: 1, friction: 8, tension: 42, useNativeDriver: true, isInteraction: false }),
    ]);
    const pulseAnimation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2600, useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 0, duration: 2600, useNativeDriver: true, isInteraction: false }),
    ]));
    const floatAnimation = Animated.loop(Animated.sequence([
      Animated.timing(iconFloat, { toValue: 1, duration: 1500, useNativeDriver: true, isInteraction: false }),
      Animated.timing(iconFloat, { toValue: 0, duration: 1500, useNativeDriver: true, isInteraction: false }),
    ]));
    screenFadeAnimation.start();
    introAnimation.start();
    greetingAnimation.start();
    pulseAnimation.start();
    if (holidayInfo) floatAnimation.start();
    return () => { screenFadeAnimation.stop(); introAnimation.stop(); greetingAnimation.stop(); pulseAnimation.stop(); floatAnimation.stop(); };
  }, [greeting, holidayInfo, iconFloat, intro, pulse, reduceMotion, screenFade]);

  const logoScale = intro.interpolate({ inputRange: [0, 1], outputRange: [.72, 1] });
  const logoOpacity = intro;
  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [.18, .04] });
  const greetingTranslateY = greeting.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const greetingGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [.26, .08] });
  const iconTranslateY = iconFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Animated.View style={[styles.container, { backgroundColor, opacity: screenFade }] }>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={backgroundColor} />
      {isMatrix && reduceMotion === false ? <MatrixRain intensity={0.85} /> : <>
        <View style={[styles.cornerBlock, { backgroundColor: primary }]} />
        <View style={[styles.cornerBlockSmall, { borderColor: `${primary}99` }]} />
      </>}
      <SeasonalSplashEffects decoration={decoration} />
      <Animated.View style={[styles.main,  { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
        <View style={styles.logoStage}>
          <Animated.View style={[styles.halo, { borderColor: primary, opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
          <View style={[styles.logoFrame, { borderColor: `${primary}88`, backgroundColor: isLegendSplash ? '#211605' : (theme === 'light' ? '#FFFFFF' : '#102019') }]}>
            <Animated.Image source={LOGO} resizeMode="contain" style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]} />
          </View>
        </View>

        <Text style={[styles.title, { color: textColor }]}>Мой ИТИ ХГУ</Text>
        <Text style={[styles.subtitle, { color: subtextColor }]}>{isLegendSplash ? 'Легенда ИТИ ХГУ' : 'Твой университет в кармане'}</Text>
        {isLegendSplash && <Text style={[styles.legend, { color: primary }]}>ВСЕ ДОСТИЖЕНИЯ СОБРАНЫ</Text>}
        {holidayInfo && <Animated.View style={[styles.holidayGreeting, { borderColor: `${holidayColor}66`, opacity: greeting, transform: [{ translateY: greetingTranslateY }] }]}>
          <Animated.View style={[styles.greetingGlow, { backgroundColor: holidayColor, opacity: greetingGlow }]} />
          <View style={styles.greetingHeading}>
            <Text style={[styles.greetingKicker, { color: holidayColor }]}>ОСОБЕННЫЙ ДЕНЬ</Text>
            <Animated.View style={[styles.holidayIcons, { transform: [{ translateY: iconTranslateY }] }]}>
              {holidayIcons.map((name, index) => <Icon key={index} name={name} size={index === 1 ? 17 : 20} color={holidayColor} style={styles.holidayIcon} />)}
            </Animated.View>
          </View>
          <Text style={[styles.holidayText, { color: textColor }]}>{holidayGreeting.title}</Text>
          <Text style={[styles.holidayDescription, { color: subtextColor }]}>{holidayGreeting.subtitle}</Text>
        </Animated.View>}
      </Animated.View>

      <View style={styles.footer}>
        <Text style={[styles.meta, { color: subtextColor }]}>(c) 2025-{CURRENT_YEAR} PRO100BYTE Team</Text>
        <View style={styles.buildRow}>
          <Text style={[styles.version, { color: subtextColor }]}>v{APP_VERSION}</Text>
          <Text style={[styles.build, { color: subtextColor }]}>BUILD {BUILD_VER}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  cornerBlock: { position: 'absolute', width: 170, height: 170, right: -92, top: -84, transform: [{ rotate: '45deg' }], opacity: .12 },
  cornerBlockSmall: { position: 'absolute', width: 120, height: 120, left: -82, bottom: 62, borderWidth: 1, transform: [{ rotate: '45deg' }], opacity: .55 },
  main: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 96, zIndex: 2 },
  topLine: { position: 'absolute', top: 18, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 11, letterSpacing: 1.8, fontFamily: 'Montserrat_700Bold' },
  edition: { fontSize: 9, letterSpacing: 1.4, fontFamily: 'Montserrat_500Medium' },
  divider: { width: '100%', height: 1, marginTop: 15 },
  logoStage: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  halo: { position: 'absolute', width: 184, height: 184, borderWidth: 1, borderRadius: 92 },
  logoFrame: { width: 158, height: 158, borderWidth: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: 116, height: 116, borderRadius: 22 },
  crosshair: { position: 'absolute', width: 6, height: 6, transform: [{ rotate: '45deg' }] },
  crosshairTop: { top: 3 }, crosshairBottom: { bottom: 3 },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -.4, fontFamily: 'Montserrat_700Bold', textAlign: 'center' },
  subtitle: { marginTop: 11, fontSize: 14, letterSpacing: .4, fontFamily: 'Montserrat_500Medium' },
  legend: { marginTop: 18, fontSize: 10, letterSpacing: 1.2, fontFamily: 'Montserrat_700Bold' },
  holidayGreeting: { marginTop: 18, paddingHorizontal: 14, paddingVertical: 12, width: '100%', maxWidth: 380, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  greetingGlow: { position: 'absolute', width: 180, height: 110, right: -80, top: -55, borderRadius: 90 },
  greetingHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  greetingKicker: { fontSize: 9, letterSpacing: 1.4, fontFamily: 'Montserrat_700Bold' },
  holidayText: { fontSize: 19, lineHeight: 24, fontFamily: 'Montserrat_700Bold' },
  holidayDescription: { marginTop: 6, fontSize: 11, lineHeight: 16, fontFamily: 'Montserrat_500Medium' },
  holidayIcons: { flexDirection: 'row' }, holidayIcon: { marginLeft: 8 },

  footer: { position: 'absolute', left: 25, right: 25, bottom: 27, zIndex: 2 },
  meta: { fontSize: 9, letterSpacing: 1.2, fontFamily: 'Montserrat_500Medium', marginBottom: 10 },
  buildRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  version: { fontSize: 11, letterSpacing: .8, fontFamily: 'Montserrat_600SemiBold' }, build: { fontSize: 9, letterSpacing: 1, fontFamily: 'Montserrat_500Medium' },
});

export default SplashScreen;

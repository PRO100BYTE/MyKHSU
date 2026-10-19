import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const SEASON_EMOJIS = {
  winter: ['❄️', '❄️', '☃️', '🧊', '✨'],
  spring: ['🌸', '🌷', '🌿', '🪻', '🦋'],
  summer: ['☀️', '🌻', '🍃', '✨', '🦋'],
  autumn: ['🍂', '🍁', '🌰', '🍃', '☕'],
};

const HOLIDAY_EMOJIS = {
  'new-year': ['🎄', '❄️', '🎁', '✨'],
  'student-day': ['🎓', '📚', '⭐', '✏️'],
  'valentines-day': ['💖', '💕', '🌹', '💌'],
  'defender-day': ['🛡️', '⭐', '🎖️', '🎗️'],
  'womens-day': ['🌷', '💐', '🌸', '💖'],
  'cosmonautics-day': ['🚀', '🪐', '🌟', '🌌'],
  'may-day': ['🌿', '🌸', '☀️', '🕊️'],
  'victory-day': ['⭐', '🕊️', '🌺', '🎗️'],
  'children-day': ['🎈', '🎨', '🧸', '🌈'],
  'russia-day': ['🇷🇺', '⭐', '🕊️', '🎆'],
  'knowledge-day': ['📚', '✏️', '🍎', '🎒'],
  'september-3': ['🎵', '🎸', '📅', '🍂'],
  'programmer-day': ['💻', '⌨️', '🧑‍💻', '⚡'],
  'sysadmin-day': ['🖥️', '🛠️', '🖧', '⚙️'],
  'teacher-day': ['📚', '🍎', '✏️', '🌷'],
  'unity-day': ['🤝', '🤲', '🕊️', '✨'],
  'intl-student-day': ['🎓', '🌍', '📚', '⭐'],
};

const PARTICLE_COUNT = 60;

export const useSplashReduceMotion = () => false;

const chooseEmojis = decoration => {
  if (decoration.kind === 'holiday') return HOLIDAY_EMOJIS[decoration.key] || ['🎉', '✨', '⭐'];
  return SEASON_EMOJIS[decoration.key] || SEASON_EMOJIS.winter;
};

const ConfettiParticle = ({ particle }) => {
  const { emoji, x, y, size, rotateAnim, fallAnim, swingAnim } = particle;

  return (
    <Animated.View style={{
      position: 'absolute',
      left: x,
      top: y,
      opacity: 0.92,
      transform: [
        { translateY: fallAnim.interpolate({ inputRange: [0, 1], outputRange: [0, particle.travel] }) },
        { translateX: swingAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, particle.sway * 0.3, 0] }) },
        { rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${particle.spin}deg`] }) },
      ],
    }}>
      <Text style={{ fontSize: size, lineHeight: size * 1.2, includeFontPadding: false }}>{emoji}</Text>
    </Animated.View>
  );
};

const SeasonalSplashEffects = ({ decoration, durationMs = 3500 }) => {
  const { width, height } = useWindowDimensions();
  const [particles, setParticles] = useState([]);

  const emojis = useMemo(() => (decoration ? chooseEmojis(decoration) : []), [decoration]);
  const decorationKey = decoration?.key;

  useEffect(() => {
    if (!decoration) {
      setParticles([]);
      return undefined;
    }

    const timers = [];
    const created = [];

    const totalDuration = Math.max(Number(durationMs) || 3500, 1200);
    const stagger = totalDuration * 0.32 / PARTICLE_COUNT;

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      const x = (index * 47 % 96) / 100 * width;
      const y = -60 - (index % 6) * 70;
      const size = 18 + (index % 4) * 5;
      // Каждая частица должна уйти ниже нижней границы экрана, независимо от своей стартовой высоты.
      const travel = height + 220 - y;
      const sway = index % 2 === 0 ? 46 : -46;
      const spin = index % 2 === 0 ? 540 : -540;
      const startDelay = Math.round(index * stagger);
      // Поздние частицы летят быстрее, чтобы все успели завершить путь к концу splash.
      const duration = totalDuration - startDelay;

      const particle = {
        id: index,
        emoji: emojis[index % emojis.length],
        x,
        y,
        size,
        travel,
        sway,
        spin,
        rotateAnim: new Animated.Value(0),
        fallAnim: new Animated.Value(0),
        swingAnim: new Animated.Value(0),
      };

      created.push(particle);

      timers.push(setTimeout(() => {
        Animated.timing(particle.fallAnim, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
          isInteraction: false,
        }).start();
        Animated.timing(particle.rotateAnim, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
          isInteraction: false,
        }).start();
        Animated.sequence([
          Animated.timing(particle.swingAnim, {
            toValue: 0.5,
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(particle.swingAnim, {
            toValue: 1,
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
            isInteraction: false,
          }),
        ]).start();
      }, startDelay));
    }

    setParticles(created);

    return () => {
      timers.forEach(clearTimeout);
      created.forEach(particle => {
        particle.rotateAnim.stopAnimation();
        particle.fallAnim.stopAnimation();
        particle.swingAnim.stopAnimation();
      });
    };
  }, [decoration, decorationKey, durationMs, emojis, height, width]);

  if (!decoration || particles.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {particles.map(particle => <ConfettiParticle key={particle.id} particle={particle} />)}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    elevation: 1,
    overflow: 'hidden',
  },
});

export default SeasonalSplashEffects;

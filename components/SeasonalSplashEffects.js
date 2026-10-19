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

    let stopped = false;
    const timers = [];
    const created = [];
    const totalDuration = Math.max(Number(durationMs) || 3500, 1200);

    const launch = (particle, delay, fallDuration) => {
      const timer = setTimeout(() => {
        if (stopped) return;
        particle.fallAnim.setValue(0);
        particle.swingAnim.setValue(0);
        particle.rotateAnim.setValue(0);

        Animated.parallel([
          Animated.timing(particle.fallAnim, {
            toValue: 1,
            duration: fallDuration,
            easing: Easing.linear,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.timing(particle.rotateAnim, {
            toValue: 1,
            duration: fallDuration,
            easing: Easing.linear,
            useNativeDriver: true,
            isInteraction: false,
          }),
          Animated.sequence([
            Animated.timing(particle.swingAnim, {
              toValue: 0.5,
              duration: fallDuration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
              isInteraction: false,
            }),
            Animated.timing(particle.swingAnim, {
              toValue: 1,
              duration: fallDuration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
              isInteraction: false,
            }),
          ]),
        ]).start();
      }, delay);
      timers.push(timer);
    };

    for (let index = 0; index < PARTICLE_COUNT; index += 1) {
      // Стартовая точка и момент появления случайны — поток получается непрерывным.
      const size = 18 + Math.floor(Math.random() * 4) * 5;
      const x = Math.random() * Math.max(width - size, 1);
      const y = -40 - Math.random() * 220;
      // Каждая частица уходит ниже границы экрана независимо от своей стартовой высоты.
      const travel = height + 220 - y;
      const sway = Math.random() > 0.5 ? 46 : -46;
      const spin = Math.random() > 0.5 ? 540 : -540;
      const fallDuration = 1400 + Math.round(Math.random() * 700);

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

      // Несколько волн на частицу, чтобы конфетти падали всё время показа splash.
      let delay = Math.round(Math.random() * 900);
      while (delay < totalDuration) {
        launch(particle, delay, fallDuration);
        delay += fallDuration + 120 + Math.round(Math.random() * 280);
      }
    }

    setParticles(created);

    return () => {
      stopped = true;
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

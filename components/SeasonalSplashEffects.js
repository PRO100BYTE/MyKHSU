import React, { useEffect, useRef } from 'react';
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
  'defender-day': ['🛡️', '⭐', '🎖️', '🇷🇺'],
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
  'unity-day': ['🤝', '🇷🇺', '🕊️', '✨'],
  'intl-student-day': ['🎓', '🌍', '📚', '⭐'],
};

const PARTICLE_COUNT = 28;

export const useSplashReduceMotion = () => false;

const EmojiParticle = ({ index, emojis, width, height, decorationKey }) => {
  const fall = useRef(new Animated.Value(0)).current;
  const swing = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const x = ((index * 47) % 100) / 100 * width;
  const y = -70 - (index % 7) * 44;
  const size = 17 + (index % 4) * 4;
  const delay = (index % 9) * 120;
  const duration = 3000 + (index % 5) * 220;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
        Animated.timing(rotate, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
        Animated.sequence([
          Animated.timing(swing, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
          Animated.timing(swing, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
        ]),
      ]),
      Animated.parallel([
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ]));
    animation.start();
    return () => {
      animation.stop();
      fall.stopAnimation();
      swing.stopAnimation();
      rotate.stopAnimation();
    };
  }, [decorationKey, delay, duration, fall, rotate, swing]);

  return (
    <Animated.View style={[styles.particle, {
      left: x,
      top: y,
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 160] }) },
        { translateX: swing.interpolate({ inputRange: [0, 1], outputRange: [0, index % 2 ? -30 : 30] }) },
        { rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${index % 2 ? -540 : 540}deg`] }) },
      ],
    }]}>
      <Text style={[styles.emoji, { fontSize: size }]}>{emojis[index % emojis.length]}</Text>
    </Animated.View>
  );
};

const SeasonalSplashEffects = ({ decoration }) => {
  const { width, height } = useWindowDimensions();
  if (!decoration) return null;
  const emojis = decoration.kind === 'holiday'
    ? (HOLIDAY_EMOJIS[decoration.key] || ['🎉', '✨', '⭐'])
    : (SEASON_EMOJIS[decoration.key] || SEASON_EMOJIS.winter);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
        <EmojiParticle
          key={`${decoration.key}-${index}`}
          index={index}
          emojis={emojis}
          width={width}
          height={height}
          decorationKey={decoration.key}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1, elevation: 1, overflow: 'hidden' },
  particle: { position: 'absolute' },
  emoji: { lineHeight: 34, includeFontPadding: false, textAlign: 'center' },
});

export default SeasonalSplashEffects;

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import { RARITY_INFO } from '../utils/achievements';

let _showToast = null;

export const showAchievementToast = (achievement) => {
  if (_showToast) _showToast(achievement);
};

const AchievementToast = ({ theme, accentColor }) => {
  const [achievement, setAchievement] = useState(null);
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;

  useEffect(() => {
    _showToast = (ach) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      const displayAch = {
        ...ach,
        title: ach.realTitle || ach.title,
        description: ach.realDescription || ach.description,
        icon: ach.realIcon || ach.icon,
      };
      
      setAchievement(displayAch);
      setVisible(true);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 18,
          stiffness: 160,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -120,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setVisible(false);
          setAchievement(null);
        });
      }, 3000);
    };

    return () => {
      _showToast = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!visible || !achievement) return null;

  const rarity = RARITY_INFO[achievement.rarity] || RARITY_INFO.common;
  const achColor = achievement.color || colors.primary;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: glass.backgroundElevated,
          borderColor: achColor + '40',
          shadowColor: achColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.iconContainer, { backgroundColor: achColor + '18' }]}>
        <Icon name={achievement.icon} size={24} color={achColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: glass.textSecondary }]}>
          🏆 Достижение получено!
        </Text>
        <Text style={[styles.title, { color: glass.text }]} numberOfLines={1}>
          {achievement.title}
        </Text>
        <View style={styles.rarityRow}>
          <View style={[styles.rarityBadge, { backgroundColor: rarity.color + '20' }]}>
            <Text style={[styles.rarityText, { color: rarity.color }]}>
              {rarity.label}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    zIndex: 9999,
    elevation: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  rarityRow: {
    flexDirection: 'row',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
  },
});

export default AchievementToast;

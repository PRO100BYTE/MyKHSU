import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import { getAchievementsList, RARITY_INFO } from '../utils/achievements';

const AchievementsScreen = ({ theme, accentColor }) => {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({ unlocked: 0, total: 0 });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const loadData = async () => {
    const list = await getAchievementsList();
    setAchievements(list);
    const unlocked = list.filter(a => a.unlocked).length;
    setStats({ unlocked, total: list.length });
  };

  const progressPercent = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;

  const unlockedList = achievements.filter(a => a.unlocked);
  const lockedList = achievements.filter(a => !a.unlocked);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView 
        style={{ flex: 1, padding: 16 }} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Прогресс */}
        <View style={[styles.progressCard, { backgroundColor: glass.surfaceSecondary, borderColor: glass.border }]}>
          <View style={styles.progressHeader}>
            <View style={[styles.progressIconWrap, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Icon name="trophy" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.progressTitle, { color: textColor }]}>
                {stats.unlocked} из {stats.total}
              </Text>
              <Text style={[styles.progressSubtitle, { color: placeholderColor }]}>
                достижений получено
              </Text>
            </View>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>
              {progressPercent}%
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: glass.surfaceTertiary }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { backgroundColor: colors.primary, width: `${progressPercent}%` }
              ]} 
            />
          </View>
        </View>

        {/* Полученные */}
        {unlockedList.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Полученные
            </Text>
            {unlockedList.map(achievement => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement} 
                glass={glass} 
                colors={colors} 
                unlocked 
              />
            ))}
          </>
        )}

        {/* Не полученные */}
        {lockedList.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: textColor, marginTop: unlockedList.length > 0 ? 8 : 0 }]}>
              Не получены
            </Text>
            {lockedList.map(achievement => (
              <AchievementCard 
                key={achievement.id} 
                achievement={achievement} 
                glass={glass} 
                colors={colors} 
                unlocked={false} 
              />
            ))}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const AchievementCard = ({ achievement, glass, colors, unlocked }) => {
  const rarity = RARITY_INFO[achievement.rarity] || RARITY_INFO.common;
  const iconColor = unlocked ? achievement.color : glass.textTertiary;
  const cardOpacity = unlocked ? 1 : 0.55;

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={[
      styles.card,
      { 
        backgroundColor: glass.surfaceSecondary, 
        borderColor: unlocked ? achievement.color + '30' : glass.border,
        borderWidth: unlocked ? 1.5 : StyleSheet.hairlineWidth,
        opacity: cardOpacity,
      },
    ]}>
      <View style={[
        styles.cardIcon,
        { 
          backgroundColor: unlocked ? achievement.color + '18' : glass.surfaceTertiary,
        },
      ]}>
        <Icon 
          name={unlocked ? achievement.icon : (achievement.secret && !unlocked ? 'help' : achievement.icon)} 
          size={24} 
          color={iconColor} 
        />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: glass.text }]} numberOfLines={1}>
            {achievement.title}
          </Text>
          <View style={[styles.rarityBadge, { backgroundColor: rarity.color + '18' }]}>
            <Text style={[styles.rarityText, { color: rarity.color }]}>
              {rarity.label}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardDesc, { color: glass.textSecondary }]} numberOfLines={2}>
          {achievement.description}
        </Text>
        {unlocked && achievement.unlockedAt && (
          <Text style={[styles.cardDate, { color: glass.textTertiary }]}>
            Получено {formatDate(achievement.unlockedAt)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  progressSubtitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    flex: 1,
    marginRight: 8,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 18,
  },
  cardDate: {
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 4,
  },
});

export default AchievementsScreen;

// components/AboutModal.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, APP_VERSION, APP_DEVELOPERS, APP_SUPPORTERS, BUILD_VER, BUILD_DATE, LIQUID_GLASS } from '../utils/constants';

const AboutModal = ({ theme, accentColor }) => {
  const colors = ACCENT_COLORS[accentColor];
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const inputBgColor = glass.surfaceTertiary;
  const borderColor = glass.border;

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView 
        style={{ flex: 1, padding: 16 }} 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
            {/* Идентификация приложения */}
            <View style={[styles.appIdentity, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <View style={[styles.appIconCircle, { backgroundColor: colors.primary }]}>
                <Icon name="school" size={32} color="#ffffff" />
              </View>
              <Text style={[styles.appName, { color: textColor }]}>Мой ИТИ ХГУ</Text>
              <Text style={[styles.appVersion, { color: placeholderColor }]}>
                Версия {APP_VERSION} • Сборка {BUILD_VER}
              </Text>
              <Text style={[styles.appDescription, { color: placeholderColor }]}>
                Мобильное приложение для студентов и преподавателей Инженерно-технологического института ХГУ
              </Text>
            </View>

            {/* Основные возможности */}
            <View style={[styles.sectionCard, { backgroundColor: inputBgColor, borderColor }]}>
              <View style={styles.sectionHeader}>
                <Icon name="sparkles-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Возможности</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="calendar-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Расписание занятий для студентов и преподавателей
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="newspaper-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Новости университета с офлайн-доступом
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="map-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Интерактивная карта учебных корпусов
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="school-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Раздел «Первокурснику» с полезной информацией
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="notifications-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Уведомления о новостях и расписании
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="color-palette-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Темы оформления и цветовые схемы
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="cloud-offline-outline" size={16} color={colors.primary} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Полная офлайн-работа с кэшированием
                </Text>
              </View>
            </View>

            {/* Для преподавателей */}
            <View style={[styles.sectionCard, { backgroundColor: inputBgColor, borderColor }]}>
              <View style={styles.sectionHeader}>
                <Icon name="person-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Для преподавателей</Text>
              </View>
              
              <View style={styles.featureItem}>
                <Icon name="search-outline" size={16} color={placeholderColor} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Расписание по ФИО с отображением групп
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="calendar-outline" size={16} color={placeholderColor} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: textColor }]}>
                  Недельное расписание с навигацией
                </Text>
              </View>
            </View>

            {/* Отслеживание ошибок */}
            <View style={[styles.sectionCard, { backgroundColor: inputBgColor, borderColor }]}>
              <View style={styles.sectionHeader}>
                <Icon name="bug-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Отслеживание ошибок</Text>
              </View>
              <Text style={[styles.sectionDescription, { color: placeholderColor }]}>
                Приложение использует Self-hosted сервис Sentry (ООО «Скалк Софт» / Sculk Ltd.) для отслеживания ошибок. Собираемые данные включают техническую информацию об устройстве и контекст ошибки, но не содержат персональных данных.
              </Text>
            </View>

            {/* Информация о версии */}
            <View style={[styles.infoSection, { backgroundColor: inputBgColor, borderColor }]}>
              <View style={styles.infoItem}>
                <Icon name="calendar-outline" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Дата сборки: {BUILD_DATE}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="code-slash-outline" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  Разработано {APP_DEVELOPERS}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Icon name="heart-outline" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: placeholderColor }]}>
                  При поддержке {APP_SUPPORTERS}
                </Text>
              </View>
            </View>
          </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // App identity
  appIdentity: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
  },
  appIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Section cards
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
  // Info section
  infoSection: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
  },
});

export default AboutModal;
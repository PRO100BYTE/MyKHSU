import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet, Platform, Animated, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import UnderDevelopmentModal from './UnderDevelopmentModal';
import BuildingsListScreen from './BuildingsListScreen';
import AcademicCalendarScreen from './AcademicCalendarScreen';
import Snowfall from './Snowfall';
import { unlockAchievement } from '../utils/achievements';
import { showAchievementToast } from './AchievementToast';
import ApiService from '../utils/api';

const FreshmanScreen = forwardRef(({ theme, accentColor, isNewYearMode, onNavigationChange }, ref) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentGroupType, setCurrentGroupType] = useState(null);
  const [showBuildingsList, setShowBuildingsList] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [bellScheduleData, setBellScheduleData] = useState(null);
  const [bellScheduleLoading, setBellScheduleLoading] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const bgColor = glass.background;
  const cardBg = glass.surfaceCard;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const colors = ACCENT_COLORS[accentColor];

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (showBuildingsList) {
        setShowBuildingsList(false);
      } else if (currentGroupType) {
        setCurrentGroupType(null);
      }
    },
  }));

  // Notify parent about navigation state changes
  useEffect(() => {
    let title = null;
    if (showBuildingsList) {
      title = 'Корпуса ХГУ';
    } else if (currentGroupType === 'main') {
      title = 'Полезные группы';
    } else if (currentGroupType === 'bells') {
      title = 'Расписание звонков';
    } else if (currentGroupType === 'academicCalendar') {
      title = 'Календарь учебных событий';
    } else if (currentGroupType === 'glossary') {
      title = 'Словарь аббревиатур';
    }
    if (onNavigationChange) onNavigationChange(title);
  }, [showBuildingsList, currentGroupType]);

  // Загрузка расписания звонков с сервера
  useEffect(() => {
    if (currentGroupType === 'bells' && !bellScheduleData) {
      fetchBellSchedule();
    }
  }, [currentGroupType]);

  const fetchBellSchedule = async () => {
    setBellScheduleLoading(true);
    try {
      const result = await ApiService.getPairsTime();
      const pairsTime = result?.data?.pairs_time || [];
      if (pairsTime.length > 0) {
        const schedule = pairsTime
          .filter(p => p && p.time)
          .sort((a, b) => a.time - b.time)
          .map((p, i, arr) => {
            let breakAfter = null;
            if (i < arr.length - 1) {
              const [eh, em] = p.time_end.split(':').map(Number);
              const [nh, nm] = arr[i + 1].time_start.split(':').map(Number);
              const diff = (nh * 60 + nm) - (eh * 60 + em);
              if (diff > 0) breakAfter = `${diff} мин`;
            }
            return {
              pair: p.time,
              start: p.time_start,
              end: p.time_end,
              breakAfter,
            };
          });
        setBellScheduleData(schedule);
      }
    } catch (error) {
      console.error('Error fetching bell schedule:', error);
    } finally {
      setBellScheduleLoading(false);
    }
  };

  // Простая анимация fade при смене экрана
  useEffect(() => {
    // Сбрасываем прозрачность
    fadeAnim.setValue(0);
    
    // Плавное появление
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [currentGroupType, showBuildingsList]);

  // Функции для открытия ссылок
  const openITIWebsite = () => {
    Linking.openURL('https://iti.khsu.ru');
  };

  const openEduPortal = () => {
    Linking.openURL('https://edu.khsu.ru');
  };

  const openNewEduPortal = () => {
    Linking.openURL('https://newdo.khsu.ru');
  };

  const openLink = (url) => {
    Linking.openURL(url);
  };

  // Данные для групп ВКонтакте
  const vkGroups = [
    {
      id: 1,
      name: 'ХГУ им. Н.Ф. Катанова',
      description: 'Официальная группа университета',
      url: 'https://vk.com/khsu_ru',
      icon: 'school-outline',
      brandColor: '#0077FF',
    },
    {
      id: 2,
      name: 'Инженерно-технологический институт',
      description: 'Новости и события ИТИ',
      url: 'https://vk.com/khsu_iit',
      icon: 'business-outline',
      brandColor: '#0077FF',
    },
    {
      id: 3,
      name: 'Кафедра ПОВТиАС',
      description: 'Программное обеспечение и автоматизация',
      url: 'https://vk.com/kafedrapovtias',
      icon: 'code-slash-outline',
      brandColor: '#0077FF',
    },
    {
      id: 4,
      name: 'Кафедра ЦТиД',
      description: 'Цифровые технологии и дизайн',
      url: 'https://vk.com/public212642505',
      icon: 'color-palette-outline',
      brandColor: '#0077FF',
    },
    {
      id: 5,
      name: 'Медиацентр "404"',
      description: 'Медиа-контент ИТИ',
      url: 'https://vk.com/iti_404',
      icon: 'camera-outline',
      brandColor: '#0077FF',
    },
    {
      id: 6,
      name: 'Совет обучающихся ХГУ',
      description: 'Студенческое самоуправление',
      url: 'https://vk.com/so_khsu',
      icon: 'people-outline',
      brandColor: '#0077FF',
    },
    {
      id: 7,
      name: 'Профсоюз обучающихся ХГУ',
      description: 'Защита прав студентов',
      url: 'https://vk.com/pos_khsu',
      icon: 'shield-checkmark-outline',
      brandColor: '#0077FF',
    },
    {
      id: 8,
      name: 'Профбюро ИТИ',
      description: 'Профсоюзное бюро института',
      url: 'https://vk.com/prof_iti_khsu',
      icon: 'briefcase-outline',
      brandColor: '#0077FF',
    },
    {
      id: 9,
      name: 'ХГУ Спорт ИТИ',
      description: 'Спортивная жизнь института',
      url: 'https://vk.com/club178703236',
      icon: 'barbell-outline',
      brandColor: '#0077FF',
    },
    {
      id: 10,
      name: 'ЭРЦИТ ИТИ ХГУ',
      description: 'Экспериментальный центр информационных технологий',
      url: 'https://vk.ru/club224936102',
      icon: 'laptop-outline',
      brandColor: '#0077FF',
    }
  ];

  const telegramGroups = [
    {
      id: 1,
      name: 'Новости ХГУ им. Н.Ф. Катанова',
      description: 'Официальный Telegram-канал университета',
      url: 'https://t.me/khsu_katanova',
      icon: 'paper-plane-outline',
      brandColor: '#0088cc',
    }
  ];

  const maxGroups = [
    {
      id: 1,
      name: 'ХГУ им. Н.Ф. Катанова',
      description: 'Официальный канал университета',
      url: 'https://max.ru/id1901021449_biz',
      icon: 'school-outline',
      brandColor: '#5B6DEF',
    },
    {
      id: 2,
      name: 'Совет обучающихся ХГУ',
      description: 'Студенческое самоуправление',
      url: 'https://max.ru/id1901021449_gos1',
      icon: 'people-outline',
      brandColor: '#5B6DEF',
    },
    {
      id: 3,
      name: 'ЭРЦИТ ИТИ ХГУ',
      description: 'Экспериментальный центр информационных технологий',
      url: 'https://max.ru/join/yBMcu9AYDOJjU0FEw7-kaTp7MrbkT7JG9fwZLeDrJjQ',
      icon: 'laptop-outline',
      brandColor: '#5B6DEF',
    }
  ];

  const SectionHeader = ({ title }) => (
    <Text style={{
      color: placeholderColor,
      fontSize: 13,
      fontFamily: 'Montserrat_600SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 8,
      paddingHorizontal: 4,
    }}>
      {title}
    </Text>
  );

  const SectionGroup = ({ children }) => (
    <View style={{
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: glass.border,
      shadowColor: glass.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    }}>
      {children}
    </View>
  );

  const SectionRow = ({ icon, title, description, onPress, isFirst, isLast }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: glass.surfaceSecondary,
        borderTopLeftRadius: isFirst ? 14 : 0,
        borderTopRightRadius: isFirst ? 14 : 0,
        borderBottomLeftRadius: isLast ? 14 : 0,
        borderBottomRightRadius: isLast ? 14 : 0,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: glass.border,
      }}
    >
      <View style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: colors.glass,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.glassBorder,
      }}>
        <Icon name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_500Medium' }}>
          {title}
        </Text>
        {description && (
          <Text style={{ color: placeholderColor, fontSize: 12, marginTop: 2, fontFamily: 'Montserrat_400Regular', lineHeight: 17 }}>
            {description}
          </Text>
        )}
      </View>
      <Icon name="chevron-forward" size={18} color={placeholderColor} />
    </TouchableOpacity>
  );

  const CommunityRow = ({ group, isFirst, isLast }) => (
    <TouchableOpacity
      key={group.id}
      onPress={() => openLink(group.url)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: glass.surfaceSecondary,
        borderTopLeftRadius: isFirst ? 14 : 0,
        borderTopRightRadius: isFirst ? 14 : 0,
        borderBottomLeftRadius: isLast ? 14 : 0,
        borderBottomRightRadius: isLast ? 14 : 0,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: glass.border,
      }}
    >
      <View style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: group.brandColor ? group.brandColor + '14' : colors.glass,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: group.brandColor ? group.brandColor + '30' : colors.glassBorder,
      }}>
        <Icon name={group.icon} size={20} color={group.brandColor || colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_500Medium' }}>
          {group.name}
        </Text>
        {group.description && (
          <Text style={{ color: placeholderColor, fontSize: 12, marginTop: 2, fontFamily: 'Montserrat_400Regular', lineHeight: 17 }}>
            {group.description}
          </Text>
        )}
      </View>
      <Icon name="open-outline" size={16} color={placeholderColor} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );

  // Главный экран разделов
  const sectionCategories = [
    {
      title: 'Учеба',
      items: [
        {
          icon: 'time-outline',
          title: 'Расписание звонков',
          description: 'Время начала и окончания занятий',
          onPress: () => setCurrentGroupType('bells'),
        },
        {
          icon: 'today-outline',
          title: 'Календарь учебных событий',
          description: 'Экзамены, зачеты, практика и экспорт в календарь',
          onPress: () => setCurrentGroupType('academicCalendar'),
        },
        {
          icon: 'book-outline',
          title: 'Словарь аббревиатур',
          description: 'Расшифровка университетских сокращений',
          onPress: () => setCurrentGroupType('glossary'),
        },
      ],
    },
    {
      title: 'Ресурсы и сервисы',
      items: [
        {
          icon: 'globe-outline',
          title: 'Сайт ИТИ ХГУ',
          description: 'Официальный сайт Инженерно-технологического института',
          onPress: openITIWebsite,
        },
        {
          icon: 'laptop-outline',
          title: 'Образовательный портал ХГУ',
          description: 'Электронная образовательная среда университета',
          onPress: openEduPortal,
        },
        {
          icon: 'school-outline',
          title: 'Новый образовательный портал ХГУ (Moodle)',
          description: 'Современная платформа для дистанционного обучения',
          onPress: openNewEduPortal,
        },
        {
          icon: 'people-outline',
          title: 'Преподаватели',
          description: 'Информация о преподавателях ИТИ ХГУ',
          onPress: () => setModalVisible(true),
        },
      ],
    },
    {
      title: 'Кампус и сообщества',
      items: [
        {
          icon: 'business-outline',
          title: 'Корпуса ХГУ',
          description: 'Список всех корпусов университета с маршрутами',
          onPress: () => setShowBuildingsList(true),
        },
        {
          icon: 'chatbubbles-outline',
          title: 'Полезные группы (сообщества)',
          description: 'Группы и сообщества ВКонтакте и Telegram',
          onPress: () => setCurrentGroupType('main'),
        },
      ],
    },
  ];

  const renderMainSections = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }}>
      {sectionCategories.map(category => (
        <View key={category.title}>
          <SectionHeader title={category.title} />
          <SectionGroup>
            {category.items.map((item, index) => (
              <SectionRow
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onPress={item.onPress}
                isFirst={index === 0}
                isLast={index === category.items.length - 1}
              />
            ))}
          </SectionGroup>
        </View>
      ))}

      {/* Скрытая пасхалка */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          const newCount = secretTapCount + 1;
          setSecretTapCount(newCount);
          if (newCount >= 7) {
            setSecretTapCount(0);
            unlockAchievement('konami_code').then(result => {
              if (result) {
                showAchievementToast(result);
                Alert.alert(
                  '👁️ За гранью кода',
                  'Ты нашёл то, что не должен был найти. Или наоборот?',
                );
              }
            });
          }
        }}
        style={{ alignItems: 'center', marginTop: 32, marginBottom: 8 }}
      >
        <Text style={{ color: placeholderColor, fontSize: 11, fontFamily: 'Montserrat_400Regular', opacity: 0.4 }}>
          ИТИ ХГУ • {new Date().getFullYear()}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Экран групп ВКонтакте
  const renderVKGroups = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {vkGroups.map((group, index) => 
          renderGroupCard(group, index === vkGroups.length - 1)
        )}
      </ScrollView>
    </View>
  );

  // Экран групп Telegram
  const renderTelegramGroups = () => (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ 
        backgroundColor: glass.surfaceSecondary, 
        borderRadius: 16, 
        padding: 28, 
        alignItems: 'center',
        marginTop: 40,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glass.border,
        shadowColor: glass.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      }}>
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: 'rgba(0, 136, 204, 0.1)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 14,
        }}>
          <Icon name="paper-plane-outline" size={28} color="#0088cc" />
        </View>
        <Text style={{ 
          color: textColor, 
          fontSize: 16, 
          fontFamily: 'Montserrat_500Medium',
          textAlign: 'center',
          marginBottom: 4,
        }}>
          Скоро здесь появятся группы
        </Text>
        <Text style={{ 
          color: placeholderColor, 
          fontSize: 14, 
          textAlign: 'center', 
          fontFamily: 'Montserrat_400Regular',
          lineHeight: 20,
        }}>
          Мы работаем над добавлением Telegram-каналов и чатов
        </Text>
      </View>
    </View>
  );

  // Единый экран сообществ с секциями
  const renderGroupTypeSelection = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <SectionHeader title="ВКонтакте" />
      <SectionGroup>
        {vkGroups.map((group, index) => (
          <CommunityRow
            key={`vk-${group.id}`}
            group={group}
            isFirst={index === 0}
            isLast={index === vkGroups.length - 1}
          />
        ))}
      </SectionGroup>

      {/* Секция Telegram */}
      <SectionHeader title="Telegram" />
      <SectionGroup>
        {telegramGroups.map((group, index) => (
          <CommunityRow
            key={`tg-${group.id}`}
            group={group}
            isFirst={index === 0}
            isLast={index === telegramGroups.length - 1}
          />
        ))}
      </SectionGroup>

      {/* Секция MAX */}
      <SectionHeader title="MAX" />
      <SectionGroup>
        {maxGroups.map((group, index) => (
          <CommunityRow
            key={`max-${group.id}`}
            group={group}
            isFirst={index === 0}
            isLast={index === maxGroups.length - 1}
          />
        ))}
      </SectionGroup>
    </ScrollView>
  );

  // Рендер списка корпусов
  const renderBuildingsList = () => (
    <View style={{ flex: 1 }}>
      <BuildingsListScreen 
        theme={theme} 
        accentColor={accentColor} 
      />
    </View>
  );

  const renderAcademicCalendar = () => (
    <AcademicCalendarScreen theme={theme} accentColor={accentColor} />
  );

  // Расписание звонков (загружается с сервера)
  const bellSchedule = bellScheduleData || [];
  const renderBellSchedule = () => {
    if (bellScheduleLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: placeholderColor, marginTop: 12, fontFamily: 'Montserrat_400Regular', fontSize: 14 }}>
            Загрузка расписания...
          </Text>
        </View>
      );
    }

    if (bellSchedule.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
          <Icon name="time-outline" size={40} color={placeholderColor} />
          <Text style={{ color: placeholderColor, marginTop: 12, fontFamily: 'Montserrat_400Regular', fontSize: 14 }}>
            Не удалось загрузить расписание
          </Text>
          <TouchableOpacity
            onPress={fetchBellSchedule}
            style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.glass }}
          >
            <Text style={{ color: colors.primary, fontFamily: 'Montserrat_500Medium', fontSize: 14 }}>Повторить</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const isCurrentPair = (start, end) => {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return currentMinutes >= sh * 60 + sm && currentMinutes <= eh * 60 + em;
    };

    return (
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{
          backgroundColor: colors.glass,
          borderRadius: 16,
          padding: 14,
          marginBottom: 20,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.glassBorder,
        }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.primary + '18',
            justifyContent: 'center', alignItems: 'center', marginRight: 12,
          }}>
            <Icon name="time" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_600SemiBold' }}>
              Учебные пары
            </Text>
            <Text style={{ color: placeholderColor, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 2 }}>
              Длительность пары — 90 минут (2 × 45 мин)
            </Text>
          </View>
        </View>

        {bellSchedule.map((item, index) => {
          const isCurrent = isCurrentPair(item.start, item.end);
          return (
            <View key={item.pair}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isCurrent ? (colors.glass || colors.primary + '10') : glass.surfaceSecondary,
                borderRadius: 16,
                padding: 14,
                marginBottom: item.breakAfter ? 4 : 0,
                borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth,
                borderColor: isCurrent ? colors.primary + '40' : glass.border,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: isCurrent ? colors.primary : glass.surfaceTertiary,
                  justifyContent: 'center', alignItems: 'center', marginRight: 14,
                }}>
                  <Text style={{
                    color: isCurrent ? '#fff' : textColor,
                    fontSize: 16, fontFamily: 'Montserrat_700Bold',
                  }}>
                    {item.pair}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: textColor, fontSize: 16, fontFamily: 'Montserrat_600SemiBold',
                  }}>
                    {item.start} – {item.end}
                  </Text>
                  {isCurrent && (
                    <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Montserrat_500Medium', marginTop: 2 }}>
                      Сейчас идёт
                    </Text>
                  )}
                </View>
                {isCurrent && (
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: colors.primary, marginLeft: 8,
                  }} />
                )}
              </View>
              {item.breakAfter && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 }}>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: glass.border }} />
                  <Text style={{
                    color: placeholderColor, fontSize: 11, fontFamily: 'Montserrat_400Regular',
                    marginHorizontal: 10, opacity: 0.7,
                  }}>
                    перерыв {item.breakAfter}
                  </Text>
                  <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: glass.border }} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  // Словарь аббревиатур
  const glossaryData = [
    { abbr: 'ХГУ', full: 'Хакасский государственный университет им. Н.Ф. Катанова' },
    { abbr: 'ИТИ', full: 'Инженерно-технологический институт' },
    { abbr: 'ЛК', full: 'Лекция — теоретическое занятие в аудитории' },
    { abbr: 'ПЗ', full: 'Практическое занятие — закрепление теории на практике' },
    { abbr: 'ЛР', full: 'Лабораторная работа — практика в лаборатории/компьютерном классе' },
    { abbr: 'КР', full: 'Контрольная работа — промежуточная проверка знаний' },
    { abbr: 'СРС', full: 'Самостоятельная работа студента' },
    { abbr: 'ЗЕТ', full: 'Зачётная единица трудоёмкости (1 ЗЕТ = 36 часов)' },
    { abbr: 'ГИА', full: 'Государственная итоговая аттестация' },
    { abbr: 'ВКР', full: 'Выпускная квалификационная работа (диплом)' },
    { abbr: 'ОПОП', full: 'Основная профессиональная образовательная программа' },
    { abbr: 'ФГОС', full: 'Федеральный государственный образовательный стандарт' },
    { abbr: 'ДО', full: 'Дистанционное обучение' },
    { abbr: 'ЭОС', full: 'Электронная образовательная среда' },
    { abbr: 'БРС', full: 'Балльно-рейтинговая система оценки знаний' },
    { abbr: 'ПОВТиАС', full: 'Кафедра программного обеспечения вычислительной техники и автоматизированных систем' },
    { abbr: 'ЦТиД', full: 'Кафедра цифровых технологий и дизайна' },
  ];

  const renderGlossary = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <View style={{
        backgroundColor: colors.glass,
        borderRadius: 16,
        padding: 14,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.glassBorder,
      }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: colors.primary + '18',
          justifyContent: 'center', alignItems: 'center', marginRight: 12,
        }}>
          <Icon name="book" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: 15, fontFamily: 'Montserrat_600SemiBold' }}>
            Аббревиатуры
          </Text>
          <Text style={{ color: placeholderColor, fontSize: 12, fontFamily: 'Montserrat_400Regular', marginTop: 2 }}>
            Часто встречающиеся сокращения
          </Text>
        </View>
      </View>

      {glossaryData.map((item, index) => (
        <View 
          key={item.abbr}
          style={{
            flexDirection: 'row',
            backgroundColor: glass.surfaceSecondary,
            borderRadius: 14,
            marginBottom: index === glossaryData.length - 1 ? 0 : 8,
            padding: 14,
            alignItems: 'flex-start',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
          }}
        >
          <View style={{
            minWidth: 56,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: colors.glass,
            alignItems: 'center',
            marginRight: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.glassBorder,
          }}>
            <Text style={{
              color: colors.primary,
              fontSize: 13,
              fontFamily: 'Montserrat_700Bold',
            }}>
              {item.abbr}
            </Text>
          </View>
          <Text style={{
            flex: 1,
            color: textColor,
            fontSize: 14,
            fontFamily: 'Montserrat_400Regular',
            lineHeight: 20,
          }}>
            {item.full}
          </Text>
        </View>
      ))}
    </ScrollView>
  );

  // Рендер текущего экрана с анимацией
  const renderCurrentScreen = () => {
    if (showBuildingsList) {
      return renderBuildingsList();
    } else if (!currentGroupType) {
      return renderMainSections();
    } else if (currentGroupType === 'main') {
      return renderGroupTypeSelection();
    } else if (currentGroupType === 'bells') {
      return renderBellSchedule();
    } else if (currentGroupType === 'academicCalendar') {
      return renderAcademicCalendar();
    } else if (currentGroupType === 'glossary') {
      return renderGlossary();
    }
    return null;
  };

return (
  <View style={{ flex: 1, backgroundColor: bgColor }}>
    {/* Снегопад для новогоднего режима */}
    {isNewYearMode && <Snowfall key={`snowfall-${isNewYearMode}`} theme={theme} intensity={0.8} />}
    
    <View style={{ flex: 1, zIndex: 2 }}>
      <StatusBar 
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bgColor}
      />
      
      {/* Рендер текущего экрана с анимацией */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {renderCurrentScreen()}
      </Animated.View>

      {/* Модальное окно заглушки */}
      <UnderDevelopmentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        theme={theme}
        accentColor={accentColor}
        featureName="Информация о преподавателях"
      />
    </View>
  </View>
);
});

const styles = StyleSheet.create({
  // Стили могут быть добавлены при необходимости
});

export default FreshmanScreen;
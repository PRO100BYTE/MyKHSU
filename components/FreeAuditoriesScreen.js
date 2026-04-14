import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import ApiService from '../utils/api';

const WEEKDAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const FreeAuditoriesScreen = ({ visible, onClose, theme, accentColor, currentWeek, pairsTime }) => {
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const borderColor = glass.border;
  const bgColor = glass.backgroundElevated || glass.background;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d; // 1–7
  });
  const [selectedSlot, setSelectedSlot] = useState(null); // номер пары
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null = не запускали
  const [localPairsTime, setLocalPairsTime] = useState([]);
  const [weekNum, setWeekNum] = useState(currentWeek || 1);
  const searchRef = useRef(null);

  const effectivePairsTime = pairsTime && pairsTime.length > 0 ? pairsTime : localPairsTime;

  // Определяем текущую пару по времени
  const getCurrentSlot = useCallback(() => {
    if (!effectivePairsTime || effectivePairsTime.length === 0) return null;
    const now = new Date();
    const hhmm = (h, m) => h * 60 + m;
    const nowMins = hhmm(now.getHours(), now.getMinutes());
    for (const pt of effectivePairsTime) {
      const [sh, sm] = (pt.time_start || pt.start || '00:00').split(':').map(Number);
      const [eh, em] = (pt.time_end || pt.end || '00:00').split(':').map(Number);
      if (nowMins >= hhmm(sh, sm) - 5 && nowMins <= hhmm(eh, em)) {
        return pt.time;
      }
    }
    // Ближайшая следующая
    for (const pt of effectivePairsTime) {
      const [sh, sm] = (pt.time_start || pt.start || '00:00').split(':').map(Number);
      if (hhmm(sh, sm) > nowMins) return pt.time;
    }
    return null;
  }, [effectivePairsTime]);

  useEffect(() => {
    if (!visible) return;
    // Загружаем пары и неделю, если не переданы
    if (!pairsTime || pairsTime.length === 0) {
      ApiService.getPairsTime().then(r => {
        if (r?.data?.pairs_time) setLocalPairsTime(r.data.pairs_time);
      }).catch(() => {});
    }
    if (!currentWeek) {
      ApiService.getWeekNumbers().then(r => {
        if (r?.data?.current_week_number) setWeekNum(r.data.current_week_number);
      }).catch(() => {});
    } else {
      setWeekNum(currentWeek);
    }
  }, [visible]);

  // Устанавливаем текущую пару при загрузке времён
  useEffect(() => {
    if (selectedSlot == null && effectivePairsTime.length > 0) {
      const cur = getCurrentSlot();
      if (cur != null) setSelectedSlot(cur);
      else if (effectivePairsTime.length > 0) setSelectedSlot(effectivePairsTime[0].time);
    }
  }, [effectivePairsTime]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      Alert.alert('Введите запрос', 'Укажите номер или префикс аудитории (например: 2-, 1-2)');
      return;
    }
    if (selectedSlot == null) {
      Alert.alert('Выберите пару', 'Укажите номер пары для проверки');
      return;
    }

    setLoading(true);
    setResults(null);
    try {
      // Поиск аудиторий
      const searchRes = await ApiService.search(q);
      const auditories = (searchRes?.data?.auditories || []).slice(0, 20);

      if (auditories.length === 0) {
        setResults({ error: 'Аудитории не найдены. Попробуйте другой запрос.' });
        return;
      }

      // Параллельно загружаем расписание для каждой аудитории
      const week = weekNum || 1;
      const schedules = await Promise.allSettled(
        auditories.map(aud => ApiService.getAuditorySchedule(aud, week))
      );

      const resultList = [];
      for (let i = 0; i < auditories.length; i++) {
        const aud = auditories[i];
        const settled = schedules[i];
        if (settled.status !== 'fulfilled' || !settled.value?.data) {
          resultList.push({ auditory: aud, isFree: null }); // неизвестно
          continue;
        }
        const data = settled.value.data;
        const days = data.days || [];
        // Ищем день с нужным weekday
        const dayData = days.find(d => d && d.weekday === selectedDay);
        if (!dayData || !dayData.lessons || dayData.lessons.length === 0) {
          resultList.push({ auditory: aud, isFree: true });
          continue;
        }
        const lessonAtSlot = dayData.lessons.find(l => l && l.time === selectedSlot);
        if (lessonAtSlot) {
          resultList.push({ auditory: aud, isFree: false, lesson: lessonAtSlot });
        } else {
          resultList.push({ auditory: aud, isFree: true });
        }
      }

      setResults({ list: resultList });
    } catch (e) {
      console.error('FreeAuditoriesScreen error:', e);
      setResults({ error: 'Ошибка загрузки. Проверьте подключение к сети.' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSlot, selectedDay, weekNum]);

  const selectedPairInfo = effectivePairsTime.find(p => p.time === selectedSlot);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

        {/* Шапка */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: borderColor,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: colors.glass || colors.primary + '18',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Icon name="grid-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 17, fontFamily: 'Montserrat_700Bold', color: textColor }}>
                Свободные аудитории
              </Text>
              <Text style={{ fontSize: 12, fontFamily: 'Montserrat_400Regular', color: placeholderColor }}>
                Неделя {weekNum}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={22} color={placeholderColor} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Выбор дня */}
          <Text style={{ fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: placeholderColor, marginBottom: 8 }}>
            ДЕНЬ НЕДЕЛИ
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => setSelectedDay(d)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  backgroundColor: selectedDay === d ? colors.primary : glass.surfaceSecondary,
                  borderWidth: selectedDay === d ? 1.5 : StyleSheet.hairlineWidth,
                  borderColor: selectedDay === d ? colors.primary : glass.border,
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontFamily: 'Montserrat_600SemiBold',
                  color: selectedDay === d ? '#fff' : textColor,
                }}>
                  {WEEKDAY_SHORT[d]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Выбор пары */}
          <Text style={{ fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: placeholderColor, marginBottom: 8 }}>
            ПАРА
          </Text>
          {effectivePairsTime.length === 0 ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 16, alignSelf: 'flex-start' }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {effectivePairsTime.map(pt => (
                <TouchableOpacity
                  key={pt.time}
                  onPress={() => setSelectedSlot(pt.time)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    backgroundColor: selectedSlot === pt.time ? colors.primary : glass.surfaceSecondary,
                    borderWidth: selectedSlot === pt.time ? 1.5 : StyleSheet.hairlineWidth,
                    borderColor: selectedSlot === pt.time ? colors.primary : glass.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontFamily: 'Montserrat_700Bold',
                    color: selectedSlot === pt.time ? '#fff' : textColor,
                  }}>
                    №{pt.time}
                  </Text>
                  <Text style={{
                    fontSize: 10,
                    fontFamily: 'Montserrat_400Regular',
                    color: selectedSlot === pt.time ? 'rgba(255,255,255,0.8)' : placeholderColor,
                    marginTop: 2,
                  }}>
                    {pt.time_start || pt.start}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Поиск аудитории */}
          <Text style={{ fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: placeholderColor, marginBottom: 8 }}>
            ПОИСК АУДИТОРИИ
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: glass.surfaceSecondary,
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: glass.border,
            paddingHorizontal: 12,
            marginBottom: 16,
            gap: 8,
          }}>
            <Icon name="search-outline" size={18} color={placeholderColor} />
            <TextInput
              ref={searchRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Например: 2-, 1-2, С-25..."
              placeholderTextColor={placeholderColor}
              style={{
                flex: 1,
                paddingVertical: 12,
                fontSize: 15,
                fontFamily: 'Montserrat_400Regular',
                color: textColor,
              }}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={18} color={placeholderColor} />
              </TouchableOpacity>
            )}
          </View>

          {/* Кнопка поиска */}
          <TouchableOpacity
            onPress={handleSearch}
            disabled={loading}
            style={{
              backgroundColor: loading ? placeholderColor : colors.primary,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: loading ? 0 : 0.25,
              shadowRadius: 8,
              elevation: loading ? 0 : 3,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="search" size={18} color="#fff" />
            )}
            <Text style={{ color: '#fff', fontSize: 15, fontFamily: 'Montserrat_600SemiBold' }}>
              {loading ? 'Проверяем...' : 'Найти свободные'}
            </Text>
          </TouchableOpacity>

          {/* Результаты */}
          {results?.error && (
            <View style={{
              backgroundColor: glass.surfaceSecondary,
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: glass.border,
            }}>
              <Icon name="alert-circle-outline" size={32} color={placeholderColor} style={{ marginBottom: 8 }} />
              <Text style={{ color: placeholderColor, fontFamily: 'Montserrat_400Regular', textAlign: 'center' }}>
                {results.error}
              </Text>
            </View>
          )}

          {results?.list && (
            <>
              <Text style={{ fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: placeholderColor, marginBottom: 10 }}>
                РЕЗУЛЬТАТЫ — {WEEKDAY_SHORT[selectedDay]}, пара №{selectedSlot}
                {selectedPairInfo ? ` (${selectedPairInfo.time_start || selectedPairInfo.start}–${selectedPairInfo.time_end || selectedPairInfo.end})` : ''}
              </Text>

              {/* Свободные */}
              {results.list.filter(r => r.isFree === true).length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Icon name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={{ fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: '#10b981' }}>
                      Свободны ({results.list.filter(r => r.isFree === true).length})
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {results.list.filter(r => r.isFree === true).map(r => (
                      <View
                        key={r.auditory}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          backgroundColor: '#10b98118',
                          borderWidth: 1,
                          borderColor: '#10b98135',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: 'Montserrat_600SemiBold', color: '#10b981' }}>
                          {r.auditory}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Занятые */}
              {results.list.filter(r => r.isFree === false).length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Icon name="close-circle" size={16} color="#ef4444" />
                    <Text style={{ fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: '#ef4444' }}>
                      Заняты ({results.list.filter(r => r.isFree === false).length})
                    </Text>
                  </View>
                  {results.list.filter(r => r.isFree === false).map(r => (
                    <View
                      key={r.auditory}
                      style={{
                        backgroundColor: glass.surfaceSecondary,
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: glass.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <View style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: '#ef444418',
                        justifyContent: 'center', alignItems: 'center',
                      }}>
                        <Icon name="close-circle" size={18} color="#ef4444" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Montserrat_600SemiBold', color: textColor }}>
                          {r.auditory}
                        </Text>
                        {r.lesson && (
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: 'Montserrat_400Regular',
                              color: placeholderColor,
                              marginTop: 2,
                              lineHeight: 17,
                              flexShrink: 1,
                            }}
                            numberOfLines={3}
                          >
                            {r.lesson.subject}
                            {r.lesson.group && Array.isArray(r.lesson.group) ? ` · ${r.lesson.group.join(', ')}` : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Неизвестно */}
              {results.list.filter(r => r.isFree === null).length > 0 && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Icon name="help-circle-outline" size={16} color={placeholderColor} />
                    <Text style={{ fontSize: 13, fontFamily: 'Montserrat_600SemiBold', color: placeholderColor }}>
                      Данные недоступны ({results.list.filter(r => r.isFree === null).length})
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {results.list.filter(r => r.isFree === null).map(r => (
                      <View key={r.auditory} style={{
                        paddingVertical: 6, paddingHorizontal: 12,
                        borderRadius: 10,
                        backgroundColor: glass.surfaceTertiary,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: glass.border,
                      }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Montserrat_400Regular', color: placeholderColor }}>
                          {r.auditory}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default FreeAuditoriesScreen;

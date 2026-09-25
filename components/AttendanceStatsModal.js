import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ACCENT_COLORS, LIQUID_GLASS } from '../utils/constants';
import { getAttendanceStats } from '../utils/attendanceStorage';

const AttendanceStatsModal = ({ visible, onClose, attendanceMap, theme, accentColor }) => {
  const glass = LIQUID_GLASS[theme] || LIQUID_GLASS.light;
  const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.green;
  const textColor = glass.text;
  const placeholderColor = glass.textSecondary;
  const borderColor = glass.border;
  const bgColor = glass.backgroundElevated || glass.background;

  const stats = getAttendanceStats(attendanceMap || {});

  const totalAttended = stats.reduce((s, r) => s + r.attended, 0);
  const totalMissed = stats.reduce((s, r) => s + r.missed, 0);
  const totalExcused = stats.reduce((s, r) => s + r.excused, 0);
  const grandTotal = totalAttended + totalMissed + totalExcused;

  const ProgressBar = ({ value, total, color }) => {
    const pct = total > 0 ? value / total : 0;
    return (
      <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: glass.surfaceTertiary, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
      </View>
    );
  };

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
              <Icon name="bar-chart-outline" size={18} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontFamily: 'Montserrat_700Bold', color: textColor }}>
              Посещаемость
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={22} color={placeholderColor} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Общая статистика */}
          {grandTotal > 0 && (
            <View style={{
              backgroundColor: glass.surfaceSecondary,
              borderRadius: 16,
              padding: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: glass.border,
              marginBottom: 20,
            }}>
              <Text style={{ fontSize: 14, fontFamily: 'Montserrat_600SemiBold', color: placeholderColor, marginBottom: 12 }}>
                ИТОГО
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {[
                  { label: 'Посещено', value: totalAttended, color: '#10b981', icon: 'checkmark-circle' },
                  { label: 'Пропущено', value: totalMissed, color: '#ef4444', icon: 'close-circle' },
                  { label: 'Уваж.', value: totalExcused, color: '#f59e0b', icon: 'remove-circle' },
                ].map(({ label, value, color, icon }) => (
                  <View key={label} style={{ alignItems: 'center', gap: 4 }}>
                    <Icon name={icon} size={24} color={color} />
                    <Text style={{ fontSize: 22, fontFamily: 'Montserrat_700Bold', color }}>{value}</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Montserrat_400Regular', color: placeholderColor }}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* По предметам */}
          {stats.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Icon name="clipboard-outline" size={48} color={placeholderColor} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 16, fontFamily: 'Montserrat_600SemiBold', color: placeholderColor, textAlign: 'center' }}>
                Нет данных о посещаемости
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Montserrat_400Regular', color: placeholderColor, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
                Отмечайте посещение в карточках занятий
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 14, fontFamily: 'Montserrat_600SemiBold', color: placeholderColor, marginBottom: 12 }}>
                ПО ПРЕДМЕТАМ
              </Text>
              {stats.map((item) => (
                <View
                  key={item.subject}
                  style={{
                    backgroundColor: glass.surfaceSecondary,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: item.isWarning ? 1.5 : StyleSheet.hairlineWidth,
                    borderColor: item.isWarning ? '#ef4444' : glass.border,
                  }}
                >
                  {/* Заголовок */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontFamily: 'Montserrat_600SemiBold',
                        color: textColor,
                        marginRight: 8,
                      }}
                      numberOfLines={2}
                    >
                      {item.subject}
                    </Text>
                    {item.isWarning && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: '#ef444420',
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderRadius: 8,
                      }}>
                        <Icon name="warning-outline" size={12} color="#ef4444" />
                        <Text style={{ fontSize: 11, fontFamily: 'Montserrat_600SemiBold', color: '#ef4444' }}>
                          {Math.round(item.absentRatio * 100)}% пропусков
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Счётчики */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {[
                      { label: 'Посещ.', value: item.attended, color: '#10b981' },
                      { label: 'Пропуск', value: item.missed, color: '#ef4444' },
                      { label: 'Уваж.', value: item.excused, color: '#f59e0b' },
                    ].map(({ label, value, color }) => (
                      <View key={label} style={{
                        flex: 1, alignItems: 'center',
                        backgroundColor: color + '12',
                        borderRadius: 8, paddingVertical: 6,
                      }}>
                        <Text style={{ fontSize: 16, fontFamily: 'Montserrat_700Bold', color }}>{value}</Text>
                        <Text style={{ fontSize: 10, fontFamily: 'Montserrat_400Regular', color: placeholderColor }}>{label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Прогресс-бар */}
                  <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                    <ProgressBar value={item.attended} total={item.total} color="#10b981" />
                    <ProgressBar value={item.missed} total={item.total} color="#ef4444" />
                    <ProgressBar value={item.excused} total={item.total} color="#f59e0b" />
                    <Text style={{ fontSize: 11, fontFamily: 'Montserrat_400Regular', color: placeholderColor, marginLeft: 4 }}>
                      {item.total}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default AttendanceStatsModal;
